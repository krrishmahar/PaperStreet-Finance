const { Queue } = require('bullmq');
const Redis = require('ioredis');

const redisConnection = new Redis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: Number(process.env.REDIS_PORT || 6380),
  maxRetriesPerRequest: null,
});

const ingestionQueue = new Queue('bse-trade-ingestion', { connection: redisConnection });

module.exports = { ingestionQueue, redisConnection };
