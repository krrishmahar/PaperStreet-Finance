import express, { type Request, type Response } from 'express';
import cors from 'cors';
import Redis from 'ioredis';
import db, { getRecentTrades, getTradeMetrics } from './db/index';
import { ingestionQueue, TRADE_EVENTS_CHANNEL, REDIS_STREAM_KEY } from './ingestion/worker';
import { redisStreamWrapper } from './redisStreamWrapper';
import { register, httpRequestDurationHistogram, queueDepthGauge } from './metrics';
import 'dotenv/config';

const app = express();
const PORT = Number(process.env.PORT || 5000);
const BSE_MOCK_URL = process.env.BSE_MOCK_URL || 'http://localhost:4000';

app.use(cors());
app.use(express.json());

// Prometheus HTTP Request Latency Tracking Middleware
app.use((req, res, next) => {
  const start = process.hrtime();
  res.on('finish', () => {
    const diff = process.hrtime(start);
    const durationSeconds = diff[0] + diff[1] / 1e9;
    const route = req.route ? req.baseUrl + req.route.path : req.path;
    httpRequestDurationHistogram.observe(
      {
        method: req.method,
        route,
        status_code: res.statusCode,
      },
      durationSeconds
    );
  });
  next();
});

import { createRedisClient } from './redisConfig';

const redisPublisher = createRedisClient();

/**
 * Prometheus Metrics Scrape Endpoint
 */
app.get('/metrics', async (_req: Request, res: Response) => {
  try {
    const waiting = await ingestionQueue.getWaitingCount();
    const active = await ingestionQueue.getActiveCount();
    queueDepthGauge.set(waiting + active);

    res.setHeader('Content-Type', register.contentType);
    res.send(await register.metrics());
  } catch (err: any) {
    res.status(500).send(err.message);
  }
});

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
    const limit = parseInt(req.query.limit as string, 10) || 200;
    const trades = await getRecentTrades(limit);
    res.json({ success: true, count: trades.length, trades, data: trades });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/metrics', async (_req: Request, res: Response) => {
  try {
    const metrics = await getTradeMetrics();
    res.json({ success: true, metrics, data: metrics });
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

app.post('/api/flush', async (req: Request, res: Response) => {
  try {
    const client = await db.pgPool.connect();
    try {
      await client.query('TRUNCATE TABLE trades RESTART IDENTITY CASCADE;');
    } finally {
      client.release();
    }

    // Delete Redis Stream & channels
    await redisPublisher.del('trades:stream');
    await redisPublisher.del('trades:realtime:events');

    // Clean BullMQ queue jobs
    try {
      await ingestionQueue.obliterate({ force: true });
    } catch (_) {}

    // Broadcast real-time FLUSH_ALL event to all active dashboards
    await redisPublisher.publish(
      'trades:realtime:events',
      JSON.stringify({
        event: 'FLUSH_ALL',
        timestamp: Date.now(),
        message: 'System database and Redis stream reset to clean initial state',
      })
    );

    res.json({
      success: true,
      message: 'Database and Redis stream successfully flushed to clean initial state (0 entries)',
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

  // Heartbeat emitted every 10s only if upstream Redis is responsive
  const heartbeatInterval = setInterval(async () => {
    if (!res.writableEnded) {
      try {
        // Fast ping to verify Redis responsiveness
        await Promise.race([
          redisStreamReader.ping(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Redis timeout')), 2000)),
        ]);
        res.write(': ping\n\n');
        res.write(`data: ${JSON.stringify({ event: 'HEARTBEAT', timestamp: Date.now() })}\n\n`);
      } catch (err) {
        // Upstream Redis paused or unreachable: suppress heartbeat so client watchdog can detect freeze
      }
    }
  }, 10000);

  // Read Last-Event-ID header or query param
  const lastEventId =
    (req.headers['last-event-id'] as string) ||
    (req.query.lastEventId as string) ||
    null;

  const redisStreamReader = redisStreamWrapper.createStreamReader();
  let isStreaming = true;
  let lastReadId = '$';
  let fallbackSubscriber: Redis | null = null;

  // Fallback Pub/Sub subscriber if stream read fails
  const attachPubSubFallback = () => {
    if (fallbackSubscriber) return;
    console.warn('[SSE Stream] ⚠️ Attaching Redis Pub/Sub fallback listener for client connection');
    fallbackSubscriber = createRedisClient();
    fallbackSubscriber.subscribe(TRADE_EVENTS_CHANNEL);
    fallbackSubscriber.on('message', (_channel, message) => {
      if (!res.writableEnded) {
        res.write(`data: ${message}\n\n`);
      }
    });
  };

  // If client provided a Last-Event-ID, replay all missed events from Redis Streams
  if (lastEventId) {
    try {
      console.log(`[SSE Stream] Replaying missed Redis Stream events starting after: ${lastEventId}`);
      const missedEvents = await redisStreamWrapper.readMissedEvents(redisStreamReader, lastEventId);

      if (missedEvents.length > 0) {
        console.log(`[SSE Stream] Replaying ${missedEvents.length} missed events to client`);
        for (const event of missedEvents) {
          lastReadId = event.id;
          res.write(`id: ${event.id}\ndata: ${event.payload}\n\n`);
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
          attachPubSubFallback();
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
    if (fallbackSubscriber) {
      fallbackSubscriber.unsubscribe();
      fallbackSubscriber.quit();
    }
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
