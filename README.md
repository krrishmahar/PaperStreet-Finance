# Arham Fintech — BSE Real-Time Trade Aggregation Platform

> **Technical Assessment Submission: Software Engineer / Full Stack Intern**  
> Developed for **Arham Fintech (Tanvi Chauhan Company)**

---

## The Problem Scenario & Core Constraint

- **Scenario**: Trade records must be ingested from the BSE Exchange API. A full pull can take up to **15 minutes**.
- **Critical Engineering Constraint**: The network kills any HTTP connection held open longer than **30 seconds**.
- **Requirements**:
  1. Mock BSE API (`GET /getTrades`) returning seeded realistic BSE trade records.
  2. Trades Dashboard opens **instantly** displaying already-pulled trades even while an ingestion pull is ongoing.
  3. Newly pulled trades appear on open dashboards **automatically** with **no page refresh, no polling loops, and no cronjobs**.

---

## How It Works (The Solution)

1. **Chunked Cursor Ingestion (Solving the 30s Timeout)**:
   - The BSE Mock provides paginated chunks of 500 records via cursor tokens.
   - Each HTTP request completes in **<200ms**, guaranteeing connections are never held open long enough to be dropped by the 30-second network proxy rule.
2. **Instant Dashboard Render (<10ms)**:
   - On load, the dashboard fetches cached records from PostgreSQL/Redis via `GET /api/trades`.
3. **Real-Time Reactive Updates via Server-Sent Events (SSE)**:
   - When the BullMQ background worker ingests each chunk, it publishes an event to Redis Pub/Sub.
   - The Express SSE stream pushes live batches directly into active React dashboards.

---

## Quick Start (Running Locally)

### 1. Start Infrastructure (PostgreSQL & Redis)
```bash
docker compose up -d
```

### 2. Start Mock BSE API Server (Port 4000)
```bash
npm run bse:mock
```

### 3. Start Backend Ingestion Server (Port 5000)
```bash
npm start
```

### 4. Start React Frontend Dashboard (Port 3000)
```bash
npm run client:dev
```

Open `http://localhost:3000` in your browser. Click **"Trigger BSE Pull"** to watch live streaming ingestion without page refreshes!

---

## Submission Details
- **Candidate Submission**: Technical Assessment
- **Target**: `chirag.g@arhamfintech.ai`
- **CC**: `hr@arhamfintech.ai`
