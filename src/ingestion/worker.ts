import Redis from 'ioredis';
import { Queue, Worker, Job } from 'bullmq';
import { insertTradesBatch, Trade } from '../db';
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

export const ingestionQueue = new Queue(INGESTION_QUEUE_NAME, {
  connection: redisConnection,
});

export interface IngestionJobData {
  jobId: string;
  bseUrl: string;
  chunkSize: number;
  totalEstimatedTimeMs?: number;
}

export const ingestionWorker = new Worker<IngestionJobData>(
  INGESTION_QUEUE_NAME,
  async (job: Job<IngestionJobData>) => {
    const { bseUrl, chunkSize } = job.data;
    console.log(`[IngestionWorker] Starting BSE Trade Ingestion Task: ${job.id}`);

    let cursor: number | null = 0;
    let totalIngested = 0;

    while (cursor !== null) {
      const url = `${bseUrl}/getTrades?cursor=${cursor}&limit=${chunkSize}`;
      const response = await fetch(url, { signal: AbortSignal.timeout(10000) });

      if (!response.ok) {
        throw new Error(`BSE API error HTTP ${response.status}`);
      }

      const payload = (await response.json()) as {
        success: boolean;
        data: Trade[];
        meta: {
          totalRecords: number;
          nextCursor: number | null;
          progressPercent: number;
          isCompleted: boolean;
        };
      };

      const trades = payload.data;
      if (trades && trades.length > 0) {
        await insertTradesBatch(trades);
        totalIngested += trades.length;

        await redisPublisher.publish(
          TRADE_EVENTS_CHANNEL,
          JSON.stringify({
            event: 'TRADES_CHUNK_INGESTED',
            trades,
            progress: payload.meta.progressPercent,
            totalIngested,
            totalRecords: payload.meta.totalRecords,
            timestamp: Date.now(),
          })
        );

        console.log(
          `[IngestionWorker] Ingested chunk ${cursor} -> ${cursor + trades.length} (${payload.meta.progressPercent}%)`
        );
      }

      cursor = payload.meta.nextCursor;
      await new Promise((r) => setTimeout(r, 100));
    }

    await redisPublisher.publish(
      TRADE_EVENTS_CHANNEL,
      JSON.stringify({
        event: 'INGESTION_COMPLETED',
        totalIngested,
        timestamp: Date.now(),
      })
    );

    console.log(`[IngestionWorker] ✓ Completed ingestion of ${totalIngested} BSE trades.`);
    return { success: true, totalIngested };
  },
  {
    connection: redisConnection,
    concurrency: 1,
  }
);
