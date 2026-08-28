import client from 'prom-client';

// Create a Custom Prometheus Registry
export const register = new client.Registry();

// Enable standard NodeJS process / memory metrics
client.collectDefaultMetrics({
  register,
  prefix: 'fintech_process_',
});

/**
 * BullMQ Queue Telemetry
 */
export const queueDepthGauge = new client.Gauge({
  name: 'fintech_bullmq_queue_depth',
  help: 'Current number of active and waiting jobs in BullMQ ingestion queue',
  registers: [register],
});

export const jobsCompletedCounter = new client.Counter({
  name: 'fintech_bullmq_jobs_completed_total',
  help: 'Total count of successfully completed BullMQ ingestion jobs',
  registers: [register],
});

export const jobsFailedCounter = new client.Counter({
  name: 'fintech_bullmq_jobs_failed_total',
  help: 'Total count of failed BullMQ ingestion jobs',
  registers: [register],
});

/**
 * Trade Ingestion Telemetry
 */
export const tradesIngestedCounter = new client.Counter({
  name: 'fintech_trades_ingested_total',
  help: 'Total number of BSE trades successfully ingested into PostgreSQL',
  registers: [register],
});

export const tradesAmendedCounter = new client.Counter({
  name: 'fintech_trades_amended_total',
  help: 'Total number of BSE trades amended / updated via temporal check',
  registers: [register],
});

/**
 * Opossum Circuit Breaker Telemetry
 * State values: 0 = CLOSED (healthy), 1 = HALF-OPEN (testing), 2 = OPEN (tripped)
 */
export const circuitBreakerStateGauge = new client.Gauge({
  name: 'fintech_circuit_breaker_state',
  help: 'Opossum Circuit Breaker State (0 = CLOSED, 1 = HALF-OPEN, 2 = OPEN)',
  registers: [register],
});

export const circuitBreakerTripsCounter = new client.Counter({
  name: 'fintech_circuit_breaker_trips_total',
  help: 'Total number of times the BSE API circuit breaker has tripped (OPEN)',
  registers: [register],
});

export const circuitBreakerSuccessesCounter = new client.Counter({
  name: 'fintech_circuit_breaker_successes_total',
  help: 'Total number of successful calls through the circuit breaker',
  registers: [register],
});

export const circuitBreakerFailuresCounter = new client.Counter({
  name: 'fintech_circuit_breaker_failures_total',
  help: 'Total number of failed upstream calls recorded by circuit breaker',
  registers: [register],
});

/**
 * HTTP Request Latency Telemetry
 */
export const httpRequestDurationHistogram = new client.Histogram({
  name: 'fintech_http_request_duration_seconds',
  help: 'HTTP request latency in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [register],
});
