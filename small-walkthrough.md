# BSE Fintech Real-Time Ingestion: Architecture & Testing Walkthrough

## 1. Overview of Upgrades

This project has been upgraded to a production-grade, resilient real-time trade ingestion engine designed to handle high throughput (**10,000 trades / 15m**) under strict 30-second proxy timeout kill-switches.

---

## 2. Key Architecture Pillars

### 1. Data Integrity & Temporal Upserts (PostgreSQL)
- **Problem**: Out-of-order retries or delayed chunk arrivals can overwrite fresh data with stale records.
- **Solution**: Idempotent temporal upserts using `ON CONFLICT (trade_id) DO UPDATE ... WHERE trades.trade_timestamp <= EXCLUDED.trade_timestamp`.
- **Telemetry**: Tracks row versioning (`xmax = 0`) to record newly inserted vs. amended records.

### 2. Circuit Breaker & Crash Resumption (Opossum + Redis)
- **Problem**: Downstream BSE API rate limits or outages cause worker thread exhaustion and cascading failures.
- **Solution**: Opossum Circuit Breaker trips to `OPEN` if failures exceed 50% in a 30s window.
- **Checkpointing**: Ingestion progress is persisted to Redis (`bse:ingestion:cursor:<jobId>`). If a worker crashes mid-pull (e.g. record 4,500), it resumes immediately from record 4,500 without duplication.

### 3. Redis Streams Dual-Publish & Resumable SSE
- **Problem**: Redis Pub/Sub drops events if clients disconnect or reconnect during an ALB 30s timeout.
- **Solution**: Events are appended to a capped Redis Stream (`trades:stream`, `MAXLEN ~ 50000`). Reconnecting clients provide `Last-Event-ID`, and `XRANGE` replays all missed chunks before resuming live `XREAD`.
- **Heartbeats**: Emits `: ping\n\n` every 15 seconds to prevent ALB/proxy timeouts.

### 4. Client-Side Watchdog & Zustand State
- **Problem**: Silent TCP socket freeze leaves the UI displaying stale state.
- **Solution**: 25s client-side watchdog timer resets on every event/heartbeat. If 25s elapse with no signal, status changes to `STALE` and auto-reconnects with `lastEventId`.

### 5. High-Throughput UI: TradingView Canvas + Virtualized Table
- **Problem**: Thousands of DOM rows and SVG charts block the JavaScript main thread.
- **Solution**: 
  - **TradingView Canvas Chart**: Hardware-accelerated canvas engine updated imperatively at 60FPS.
  - **@tanstack/react-virtual**: Renders only the ~25 visible table rows in the viewport.
  - **RAF Micro-Batching**: Batches high-frequency SSE chunks to flush at most once per animation frame (≤16ms).

### 6. Observability & Connection Pooling (PgBouncer + Prometheus + Grafana)
- **PgBouncer**: `transaction` pooling mode multiplexing 500 client connections over 25 physical Postgres connections.
- **Prometheus & Grafana**: Sidecars scraping `/metrics` (Queue Depth, Breaker State, Ingestion Rate, Latency).

---

## 3. Quick Testing Guide

### Running the Services
```bash
# 1. Start Docker containers (Postgres, Redis, PgBouncer, Prometheus, Grafana, Playwright MCP)
docker compose up -d

# 2. Run all dev servers (Next.js on 3001, Express API on 5000, Mock BSE on 4000)
npm run dev:all
```

### Accessing the Interfaces
- **Next.js Real-Time Dashboard**: [http://localhost:3001](http://localhost:3001)
- **Express Metrics Endpoint**: [http://localhost:5000/metrics](http://localhost:5000/metrics)
- **Prometheus Dashboard**: [http://localhost:9090](http://localhost:9090)
- **Grafana Telemetry Dashboard**: [http://localhost:3002](http://localhost:3002) (Login: `admin` / `admin`)

### Triggering Ingestion & Testing Resilience
1. Open the dashboard at `http://localhost:3001`.
2. Click **"Trigger BSE Pull"**.
3. Observe:
   - Real-time progress bar updating in 500-record chunks.
   - Smooth 60FPS TradingView chart and virtualized table scrolling.
   - Prometheus metrics incrementing under `fintech_trades_ingested_total` and `fintech_bullmq_queue_depth`.
