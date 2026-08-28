declare module 'opossum' {
  import { EventEmitter } from 'events';

  namespace CircuitBreaker {
    interface Options {
      timeout?: number;
      maxFailures?: number;
      resetTimeout?: number;
      rollingCountTimeout?: number;
      rollingCountBuckets?: number;
      name?: string;
      group?: string;
      rollingPercentilesEnabled?: boolean;
      capacity?: number;
      errorThresholdPercentage?: number;
      enabled?: boolean;
      allowWarmUp?: boolean;
      volumeThreshold?: number;
      errorFilter?: (err: any) => boolean;
      cache?: boolean;
    }

    interface Stats {
      failures: number;
      fallbacks: number;
      successes: number;
      rejects: number;
      fires: number;
      timeouts: number;
      cacheHits: number;
      cacheMisses: number;
      semaphoreRejections: number;
      percentiles: { [key: string]: number };
      latencyTimes: number[];
    }
  }

  class CircuitBreaker<TI extends any[] = any[], TR = any> extends EventEmitter {
    constructor(action: (...args: TI) => Promise<TR>, options?: CircuitBreaker.Options);
    fire(...args: TI): Promise<TR>;
    fallback(action: (...args: any[]) => any): this;
    open(): void;
    close(): void;
    halfOpen(): void;
    stats: CircuitBreaker.Stats;
    opened: boolean;
    halfOpenState: boolean;
    closed: boolean;
    status: any;
    name: string;
  }

  export = CircuitBreaker;
}
