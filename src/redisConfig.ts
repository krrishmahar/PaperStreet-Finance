import Redis, { type RedisOptions } from 'ioredis';
import 'dotenv/config';

/**
 * Returns clean, production-ready Redis options supporting:
 * 1. Upstash REDIS_URL (rediss://default:<password>@<host>:<port>)
 * 2. Standard REDIS_HOST, REDIS_PORT, REDIS_PASSWORD, REDIS_TLS
 * 3. Localhost docker fallback (127.0.0.1:6380)
 */
export function getRedisOptions(overrides: RedisOptions = {}): RedisOptions {
  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    const isTls = redisUrl.startsWith('rediss://');
    return {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      tls: isTls ? { rejectUnauthorized: false } : undefined,
      ...overrides,
    };
  }

  const host = process.env.REDIS_HOST || '127.0.0.1';
  const port = Number(process.env.REDIS_PORT || 6380);
  const password = process.env.REDIS_PASSWORD || undefined;
  const isTls =
    process.env.REDIS_TLS === 'true' ||
    (process.env.NODE_ENV === 'production' && host !== '127.0.0.1' && host !== 'localhost');

  return {
    host,
    port,
    password,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    tls: isTls ? { rejectUnauthorized: false } : undefined,
    ...overrides,
  };
}

export function createRedisClient(overrides: RedisOptions = {}): Redis {
  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    return new Redis(redisUrl, getRedisOptions(overrides));
  }
  return new Redis(getRedisOptions(overrides));
}
