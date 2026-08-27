import express, { Request, Response } from 'express';
import cors from 'cors';
import Redis from 'ioredis';
import { getRecentTrades, getTradeMetrics } from './db';
import { ingestionQueue, TRADE_EVENTS_CHANNEL } from './ingestion/worker';
import 'dotenv/config';

const app = express();
const PORT = Number(process.env.PORT || 5000);
const BSE_MOCK_URL = process.env.BSE_MOCK_URL || 'http://localhost:4000';

app.use(cors());
app.use(express.json());

const redisHost = process.env.REDIS_HOST || '127.0.0.1';
const redisPort = Number(process.env.REDIS_PORT || 6380);

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
    const job = await ingestionQueue.add('bse-pull', {
      jobId: `pull_${Date.now()}`,
      bseUrl: BSE_MOCK_URL,
      chunkSize,
    });

    res.json({
      success: true,
      message: 'BSE ingestion job dispatched to BullMQ worker',
      jobId: job.id,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/stream', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  res.write(': keepalive\n\n');

  const subscriber = new Redis({ host: redisHost, port: redisPort });
  subscriber.subscribe(TRADE_EVENTS_CHANNEL);

  subscriber.on('message', (channel, message) => {
    if (channel === TRADE_EVENTS_CHANNEL) {
      res.write(`data: ${message}\n\n`);
    }
  });

  req.on('close', () => {
    subscriber.unsubscribe();
    subscriber.quit();
    res.end();
  });
});

app.listen(PORT, () => {
  console.log(`[Fintech Backend] Server listening at http://localhost:${PORT}`);
  console.log(`[Fintech Backend] Endpoints:`);
  console.log(`  - GET  /api/trades  (Instant cached trade records)`);
  console.log(`  - GET  /api/metrics (Turnover & volume stats)`);
  console.log(`  - POST /api/trigger-pull (Dispatch BSE ingestion worker)`);
  console.log(`  - GET  /api/stream  (Server-Sent Events real-time trade feed)`);
});
