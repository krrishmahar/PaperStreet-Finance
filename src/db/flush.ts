import { pgPool } from './index';
import Redis from 'ioredis';
import 'dotenv/config';

async function flushSystem() {
  console.log('[Flush] 🗑️ Initiating complete system flush (PostgreSQL & Redis)...');

  const redisHost = process.env.REDIS_HOST || '127.0.0.1';
  const redisPort = Number(process.env.REDIS_PORT || 6380);
  const redis = new Redis({
    host: redisHost,
    port: redisPort,
    maxRetriesPerRequest: null,
  });

  try {
    // 1. Truncate PostgreSQL table
    const client = await pgPool.connect();
    try {
      await client.query('TRUNCATE TABLE trades RESTART IDENTITY CASCADE;');
      console.log('[Flush] ✅ PostgreSQL table "trades" truncated.');
    } finally {
      client.release();
    }

    // 2. Delete Redis Stream & Event Channels
    await redis.del('trades:stream');
    await redis.del('trades:realtime:events');
    console.log('[Flush] ✅ Redis keys "trades:stream" and "trades:realtime:events" deleted.');

    // 3. Clear BullMQ queue keys
    const queueKeys = await redis.keys('bull:bse-ingestion:*');
    if (queueKeys.length > 0) {
      await redis.del(...queueKeys);
      console.log(`[Flush] ✅ Cleared ${queueKeys.length} BullMQ queue keys.`);
    }

    console.log('[Flush] 🚀 System restored to clean initial state (0 entries).');
  } catch (err) {
    console.error('[Flush] ❌ Error during system flush:', err);
    process.exit(1);
  } finally {
    await redis.quit();
    await pgPool.end();
  }
}

flushSystem();
