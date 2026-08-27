import { Worker, Queue, QueueEvents, Job } from 'bullmq';
import { redisConnection, sharedQueueOpts, QUEUE_NAMES, TASK_KEY_PREFIX } from '../constants';
import { createClient as createPgClient } from 'pg';
import { EventEmitter } from 'events';

/**
 * SSE event emitter shared across the process. Consumers can subscribe to
 * `ingestion` events to receive live updates.
 */
export const ingestionEmitter = new EventEmitter();

/**
 * PostgreSQL client – a single pooled connection is sufficient for the
 * ingestion worker. The client is lazily connected on first use.
 */
let pgClient: ReturnType<typeof createPgClient> | null = null;
async function getPgClient() {
  if (!pgClient) {
    pgClient = createPgClient({
      connectionString: process.env.DATABASE_URL,
    });
    await pgClient.connect();
  }
  return pgClient;
}

/**
 * Helper that performs a deduplicated batch insert into the `ingested_chunks`
 * table. The table is expected to have a unique constraint on the `chunk_id`
 * column. We use `ON CONFLICT DO NOTHING` to ignore duplicates.
 */
async function batchInsertChunks(chunks: Array<{chunk_id: string; payload: any}>) {
  if (chunks.length === 0) return;
  const client = await getPgClient();
  const values: string[] = [];
  const params: any[] = [];
  chunks.forEach((c, i) => {
    const idx = i * 2;
    values.push(`($${idx + 1}, $${idx + 2})`);
    params.push(c.chunk_id, JSON.stringify(c.payload));
  });
  const query = `INSERT INTO ingested_chunks (chunk_id, payload) VALUES ${values.join(',')} ON CONFLICT (chunk_id) DO NOTHING`;
  await client.query(query, params);
}

/**
 * BullMQ worker that consumes chunk jobs from the ingestion queue.
 * Each job payload is expected to be an array of chunk objects.
 */
export const ingestionWorker = new Worker(
  QUEUE_NAMES.INGESTION,
  async (job: Job<any>) => {
    const chunks = job.data as Array<{chunk_id: string; payload: any}>;
    // Persist chunks in PostgreSQL, deduplicating on chunk_id.
    await batchInsertChunks(chunks);
    // Emit an event for any live‑stream listeners.
    ingestionEmitter.emit('chunks', {jobId: job.id, count: chunks.length});
    return {status: 'ok', inserted: chunks.length};
  },
  { connection: redisConnection, ...sharedQueueOpts }
);

// Forward worker lifecycle events to Redis Pub/Sub for external monitoring.
const queueEvents = new QueueEvents(QUEUE_NAMES.INGESTION, { connection: redisConnection });
queueEvents.on('completed', ({ jobId }) => {
  redisConnection.publish('ingestion:completed', jobId);
});
queueEvents.on('failed', ({ jobId, failedReason }) => {
  redisConnection.publish('ingestion:failed', JSON.stringify({ jobId, failedReason }));
});

// Graceful shutdown handling.
process.on('SIGTERM', async () => {
  await ingestionWorker.close();
  await queueEvents.close();
  if (pgClient) await pgClient.end();
  process.exit(0);
});

import { Router, Request, Response } from 'express';
import { ingestionEmitter } from './worker';

/**
 * SSE endpoint that streams ingestion progress to connected clients.
 * Clients receive JSON lines with the shape `{jobId:string,count:number}`.
 */
export const ingestionRouter = Router();

ingestionRouter.get('/stream', (req: Request, res: Response) => {
  // Set headers for Server‑Sent Events.
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const onChunk = (data: any) => {
    const payload = `data: ${JSON.stringify(data)}\n\n`;
    res.write(payload);
  };

  ingestionEmitter.on('chunks', onChunk);

  // Clean up when client disconnects.
  req.on('close', () => {
    ingestionEmitter.removeListener('chunks', onChunk);
    res.end();
  });
});

// Export for inclusion in the main Express app.
export default ingestionRouter;