import Redis from 'ioredis';
import 'dotenv/config';

const redisHost = process.env.REDIS_HOST || '127.0.0.1';
const redisPort = Number(process.env.REDIS_PORT || 6380);

export const REDIS_STREAM_KEY = 'trades:stream';
export const TRADE_EVENTS_CHANNEL = 'trades:realtime:events';
export const MAX_STREAM_LENGTH = 50000;

export class RedisStreamWrapper {
  private publisher: Redis;

  constructor(publisherClient?: Redis) {
    this.publisher =
      publisherClient ||
      new Redis({
        host: redisHost,
        port: redisPort,
        lazyConnect: false,
      });
  }

  /**
   * Dual-Publish Pattern:
   * 1. Primary: Appends to Redis Stream with capped maxlen for zero-loss replayability.
   * 2. Fallback: Broadcasts over legacy Pub/Sub channel.
   */
  async publishEvent(payload: object): Promise<string> {
    const jsonString = JSON.stringify(payload);

    // 1. Primary: Redis Streams XADD with approximate trimming
    const [streamId] = await Promise.all([
      this.publisher.xadd(
        REDIS_STREAM_KEY,
        'MAXLEN',
        '~',
        MAX_STREAM_LENGTH,
        '*',
        'payload',
        jsonString
      ),
      // 2. Fallback / Dual-Write: Standard Pub/Sub broadcast
      this.publisher.publish(TRADE_EVENTS_CHANNEL, jsonString),
    ]);

    return streamId as string;
  }

  /**
   * Replay missed stream events starting strictly after `lastEventId`
   */
  async readMissedEvents(
    readerClient: Redis,
    lastEventId: string
  ): Promise<Array<{ id: string; payload: string }>> {
    try {
      const rawEntries = await readerClient.xrange(REDIS_STREAM_KEY, `(${lastEventId}`, '+');
      const results: Array<{ id: string; payload: string }> = [];

      for (const [id, fields] of rawEntries) {
        const payloadIdx = fields.indexOf('payload');
        const payload = payloadIdx !== -1 ? fields[payloadIdx + 1] : fields[1];
        results.push({ id, payload });
      }

      return results;
    } catch (err) {
      console.warn('[RedisStreamWrapper] Failed to replay missed events:', err);
      return [];
    }
  }

  /**
   * Helper to instantiate a dedicated reader Redis instance for SSE streaming
   */
  createStreamReader(): Redis {
    return new Redis({
      host: redisHost,
      port: redisPort,
    });
  }
}

export const redisStreamWrapper = new RedisStreamWrapper();
