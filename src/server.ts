import express, { type Request, type Response } from 'express';
import cors from 'cors';
import Redis from 'ioredis';
import db, { getRecentTrades, getTradeMetrics } from './db/index';
import { ingestionQueue, TRADE_EVENTS_CHANNEL, REDIS_STREAM_KEY } from './ingestion/worker';
import 'dotenv/config';

const app = express();
const PORT = Number(process.env.PORT || 5000);
const BSE_MOCK_URL = process.env.BSE_MOCK_URL || 'http://localhost:4000';

app.use(cors());
app.use(express.json());

const redisHost = process.env.REDIS_HOST || '127.0.0.1';
const redisPort = Number(process.env.REDIS_PORT || 6380);

app.get('/api/ping', async (_req: Request, res: Response) => {
  try {
    await db.ping();
    res.status(200).json({ status: 'ok', message: 'Server and database are running' });
  } catch (error) {
    res.status(503).json({ status: 'error', message: 'Database connection failed' });
  }
});

app.get('/api/trades', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string, 10) || 100;
    const trades = await getRecentTrades(limit);
    res.json({ success: true, data: trades });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/metrics', async (_req: Request, res: Response) => {
  try {
    const metrics = await getTradeMetrics();
    res.json({ success: true, data: metrics });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/trigger-pull', async (req: Request, res: Response) => {
  try {
    const chunkSize = parseInt(req.body.chunkSize as string, 10) || 500;
    const jobId = `pull_${Date.now()}`;
    const jitterDelay = 2000 + Math.floor(Math.random() * 500);

    const job = await ingestionQueue.add(
      'bse-pull',
      {
        jobId,
        bseUrl: BSE_MOCK_URL,
        chunkSize,
      },
      {
        jobId,
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: jitterDelay,
        },
      }
    );

    res.json({
      success: true,
      message: 'BSE ingestion job dispatched to BullMQ worker',
      jobId: job.id,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/stream', async (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  // Send initial keepalive
  res.write(': keepalive\n\n');

  // Heartbeat comment (: ping\n\n) emitted every 15s to bypass 30s proxy/ALB timeout kill-switches
  const heartbeatInterval = setInterval(() => {
    if (!res.writableEnded) {
      res.write(': ping\n\n');
    }
  }, 15000);

  // Read Last-Event-ID header or query param
  const lastEventId =
    (req.headers['last-event-id'] as string) ||
    (req.query.lastEventId as string) ||
    null;

  const redisStreamReader = new Redis({ host: redisHost, port: redisPort });
  let isStreaming = true;
  let lastReadId = '$';

  // If client provided a Last-Event-ID, replay all missed events from Redis Streams
  if (lastEventId) {
    try {
      console.log(`[SSE Stream] Replaying missed Redis Stream events starting after: ${lastEventId}`);
      const replayEntries = await redisStreamReader.xrange(
        REDIS_STREAM_KEY,
        `(${lastEventId}`,
        '+'
      );

      if (replayEntries && replayEntries.length > 0) {
        console.log(`[SSE Stream] Replaying ${replayEntries.length} missed events to client`);
        for (const [entryId, fields] of replayEntries) {
          lastReadId = entryId;
          const payloadIdx = fields.indexOf('payload');
          const payload = payloadIdx !== -1 ? fields[payloadIdx + 1] : fields[1];
          res.write(`id: ${entryId}\ndata: ${payload}\n\n`);
        }
      } else {
        lastReadId = lastEventId;
      }
    } catch (err) {
      console.warn('[SSE Stream] Warning during Redis Stream replay:', err);
      lastReadId = '$';
    }
  }

  // Continuous XREAD loop for live real-time pushing
  const startStreamLoop = async () => {
    while (isStreaming && !res.writableEnded) {
      try {
        const streamResults = await redisStreamReader.xread(
          'BLOCK',
          3000,
          'STREAMS',
          REDIS_STREAM_KEY,
          lastReadId
        );

        if (streamResults && Array.isArray(streamResults)) {
          for (const [, entries] of streamResults) {
            for (const [entryId, fields] of entries) {
              lastReadId = entryId;
              const payloadIdx = fields.indexOf('payload');
              const payload = payloadIdx !== -1 ? fields[payloadIdx + 1] : fields[1];
              res.write(`id: ${entryId}\ndata: ${payload}\n\n`);
            }
          }
        }
      } catch (err: any) {
        if (isStreaming) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }
    }
  };

  startStreamLoop();

  req.on('close', () => {
    isStreaming = false;
    clearInterval(heartbeatInterval);
    redisStreamReader.quit();
    res.end();
  });
});

async function startServer() {
  try {
    await db.initDb();
    console.log('[Fintech Backend] Database schema and temporal indexes initialized');
  } catch (err) {
    console.error('[Fintech Backend] Database initialization warning:', err);
  }

  app.listen(PORT, () => {
    console.log(`[Fintech Backend] Server listening at http://localhost:${PORT}`);
  });
}

startServer();
