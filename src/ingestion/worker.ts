import Redis from 'ioredis';
import { Queue, Worker, type Job } from 'bullmq';
import CircuitBreaker from 'opossum';
import { insertTradesBatch, type Trade } from '../db/index';
import 'dotenv/config';

const redisHost = process.env.REDIS_HOST || '127.0.0.1';
const redisPort = Number(process.env.REDIS_PORT || 6380);

export const redisConnection = new Redis({
  host: redisHost,
  port: redisPort,
  maxRetriesPerRequest: null,
});

export const redisPublisher = new Redis({
  host: redisHost,
  port: redisPort,
});

export const INGESTION_QUEUE_NAME = 'bse-trade-ingestion';
export const TRADE_EVENTS_CHANNEL = 'trades:realtime:events';
export const REDIS_STREAM_KEY = 'trades:stream';

/**
 * Publishes events to Redis Streams (for resumability & replay) and Pub/Sub (for real-time fan-out)
 */
export async function publishStreamEvent(eventPayload: object): Promise<string> {
  const jsonStr = JSON.stringify(eventPayload);
  const streamId = await redisPublisher.xadd(
    REDIS_STREAM_KEY,
    'MAXLEN',
    '~',
    50000,
    '*',
    'payload',
    jsonStr
  );
  await redisPublisher.publish(TRADE_EVENTS_CHANNEL, jsonStr);
  return streamId as string;
}

export const ingestionQueue = new Queue(INGESTION_QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: false,
    removeOnFail: false,
  },
});

export interface IngestionJobData {
  jobId: string;
  bseUrl: string;
  chunkSize: number;
  totalEstimatedTimeMs?: number;
}

export interface BseFetchPayload {
  success: boolean;
  data: Trade[];
  meta: {
    totalRecords: number;
    nextCursor: number | null;
    progressPercent: number;
    isCompleted: boolean;
  };
}

/**
 * Raw fetch function for BSE Mock API
 */
async function fetchBseChunk(url: string): Promise<BseFetchPayload> {
  const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!response.ok) {
    throw new Error(`BSE API error HTTP ${response.status}: ${response.statusText}`);
  }
  return (await response.json()) as BseFetchPayload;
}

/**
 * Opossum Circuit Breaker:
 * Configured to trip if error rate exceeds 50% within a 30s sliding window.
 */
const breakerOptions: CircuitBreaker.Options = {
  timeout: 10000, // 10s execution timeout
  errorThresholdPercentage: 50, // Trip if >= 50% requests fail
  resetTimeout: 30000, // Stay in OPEN state for 30s before attempting HALF-OPEN
  rollingCountTimeout: 30000, // 30s statistical window
  name: 'bse-api-circuit-breaker',
};

export const bseCircuitBreaker = new CircuitBreaker(fetchBseChunk, breakerOptions);

bseCircuitBreaker.on('open', () => {
  console.warn(
    '[CircuitBreaker] ⚠️ BSE API Breaker TRIPPED (OPEN): Failure rate >50% within 30s. Halting upstream calls.'
  );
});

bseCircuitBreaker.on('halfOpen', () => {
  console.log('[CircuitBreaker] 🔄 BSE API Breaker HALF-OPEN: Testing upstream connectivity with probe request...');
});

bseCircuitBreaker.on('close', () => {
  console.log('[CircuitBreaker] ✅ BSE API Breaker CLOSED: Upstream connection healthy and recovered.');
});

export const ingestionWorker = new Worker<IngestionJobData>(
  INGESTION_QUEUE_NAME,
  async (job: Job<IngestionJobData>) => {
    const { bseUrl, chunkSize, jobId } = job.data;
    console.log(`[IngestionWorker] Starting BSE Trade Ingestion Task: ${job.id} (JobId: ${jobId})`);

    // Redis Persistent Cursor Key for crash-resilience
    const cursorKey = `bse:ingestion:cursor:${jobId || 'latest'}`;

    // Check for saved checkpoint cursor in Redis
    const savedCursor = await redisConnection.get(cursorKey);
    let cursor: number | null = savedCursor !== null ? parseInt(savedCursor, 10) : 0;

    if (savedCursor !== null) {
      console.log(`[IngestionWorker] 🔁 Resuming ingestion from saved Redis cursor: ${cursor}`);
    }

    let totalIngested = 0;

    while (cursor !== null) {
      const url = `${bseUrl}/getTrades?cursor=${cursor}&limit=${chunkSize}`;

      // Execute external API call through Circuit Breaker
      const payload = (await bseCircuitBreaker.fire(url)) as BseFetchPayload;

      const trades = payload.data;
      if (trades && trades.length > 0) {
        // 1. Commit chunk to PostgreSQL via Idempotent Temporal Upsert
        const result = await insertTradesBatch(trades);
        totalIngested += result.insertedCount;

        if (result.amendedCount > 0) {
          console.log(
            `[IngestionWorker] ⚠️ Overwritten/Amended ${result.amendedCount} trades via temporal check: [${result.amendedTradeIds.slice(0, 5).join(', ')}${result.amendedCount > 5 ? '...' : ''}]`
          );
        }

        // 2. Publish Real-time chunk notification via Redis Streams & Pub/Sub
        await publishStreamEvent({
          event: 'TRADES_CHUNK_INGESTED',
          trades,
          progress: payload.meta.progressPercent,
          totalIngested,
          insertedCount: result.insertedCount,
          amendedCount: result.amendedCount,
          totalRecords: payload.meta.totalRecords,
          timestamp: Date.now(),
        });

        console.log(
          `[IngestionWorker] Chunk ${cursor} -> ${cursor + trades.length} (${payload.meta.progressPercent}%): ${result.insertedCount} inserted, ${result.amendedCount} amended`
        );
      }

      // 3. Persist checkpoint cursor to Redis for fault-recovery
      cursor = payload.meta.nextCursor;
      if (cursor !== null) {
        await redisConnection.set(cursorKey, cursor.toString(), 'EX', 86400);
      } else {
        // Ingestion completed: clean up checkpoint cursor
        await redisConnection.del(cursorKey);
      }

      // Apply backoff with jitter between chunk requests (50ms - 150ms)
      const jitterMs = 50 + Math.floor(Math.random() * 100);
      await new Promise((r) => setTimeout(r, jitterMs));
    }

    await publishStreamEvent({
      event: 'INGESTION_COMPLETED',
      totalIngested,
      timestamp: Date.now(),
    });

    console.log(`[IngestionWorker] ✓ Completed ingestion of ${totalIngested} BSE trades.`);
    return { success: true, totalIngested };
  },
  {
    connection: redisConnection,
    concurrency: 1,
  }
);
