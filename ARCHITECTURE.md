# Architecture Defense & Technical Documentation

## 1. System Architecture Diagram

```mermaid
sequenceDiagram
    autonumber
    actor User as Trader (Browser)
    participant React as React Dashboard (Port 3000)
    participant API as Express Server (Port 5000)
    participant Worker as BullMQ Ingestion Worker
    participant BSE as Mock BSE API (Port 4000)
    participant Redis as Redis 7 (Pub/Sub & Queue)
    participant DB as PostgreSQL 16 (Trades DB)

    Note over User,React: 1. Instant Dashboard Open (<10ms)
    User->>React: Open Dashboard URL
    React->>API: GET /api/trades (cached records)
    API->>DB: Query indexed trades
    DB-->>API: Return recent trades
    API-->>React: Render UI immediately
    React->>API: Connect GET /api/stream (SSE)
    API->>Redis: Subscribe to "trades:realtime:events"

    Note over Worker,BSE: 2. Background Ingestion (Beats 30s Timeout)
    User->>React: Click "Trigger BSE Pull"
    React->>API: POST /api/trigger-pull
    API->>Redis: Enqueue BullMQ Ingestion Job
    Redis-->>Worker: Dispatch Job

    loop Chunked Ingestion Loop (Every chunk completes in <200ms)
        Worker->>BSE: GET /getTrades?cursor=X&limit=500
        BSE-->>Worker: Return 500 trades + nextCursor
        Worker->>DB: INSERT INTO trades ON CONFLICT DO NOTHING
        Worker->>Redis: PUBLISH "trades:realtime:events" (chunk payload)
        Redis-->>API: Trigger SSE onMessage
        API-->>React: Push SSE event to browser
        React-->>User: Auto-prepend rows in table (0 page refresh, 0 polling)
    end

    Worker->>Redis: PUBLISH "INGESTION_COMPLETED"
    Redis-->>React: Update progress to 100%
```

---

## 2. Engineering Decisions Explained

### Why Chunked Cursor Ingestion Over Long-Polling?
- **30-Second Drop Rule**: A single HTTP connection streaming for 15 minutes is guaranteed to be terminated by load balancers or intermediate firewalls.
- **Cursor Tokens**: By breaking the 10,000-trade dataset into discrete 500-record chunks, each HTTP transaction completes in under 200 milliseconds. If a network hiccup occurs, BullMQ automatically retries the exact failing cursor chunk without losing progress.

### Why Server-Sent Events (SSE) Over Polling?
- **Zero Network Waste**: Polling loops (`setInterval` calling `/trades` every 2s) flood the server with redundant requests when no new data exists.
- **Push-based**: SSE maintains a lightweight, unidirectional connection where the server pushes only when Redis Pub/Sub receives a newly committed batch from the worker.
