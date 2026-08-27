{
  "name": "fullstack-app",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "start": "node dist/server.js",
    "server": "ts-node src/server.ts"
  },
  "dependencies": {
    "express": "^4.18.2",
    "ws": "^8.13.0",
    "bullmq": "^3.10.0",
    "ioredis": "^5.3.2",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "typescript": "^5.2.2",
    "ts-node": "^10.9.1",
    "vite": "^4.4.9",
    "@types/express": "^4.17.17",
    "@types/ws": "^8.5.5",
    "@types/react": "^18.2.14",
    "@types/react-dom": "^18.2.6"
  }
}
version: "3.9"
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
      POSTGRES_DB: appdb
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
  redis:
    image: redis:7
    ports:
      - "6379:6379"
volumes:
  pgdata:
# Project Context

This repository contains a minimal full‑stack starter kit built with:

* **Express** – HTTP server for API endpoints.
* **WS** – WebSocket server for real‑time communication.
* **BullMQ** – Robust job queue backed by Redis.
* **ioredis** – Redis client used by BullMQ and any custom caching logic.
* **React** + **Vite** – Front‑end development environment with fast HMR.
* **TypeScript** – Strong typing for both server and client code.
* **Docker Compose** – Local development stack with PostgreSQL and Redis.

The goal is to provide a ready‑to‑run scaffold that can be extended into a real application. All services are containerised, and the Node.js environment can be started with `npm run dev` (frontend) and `npm run server` (backend).

## Directory Layout

```
├─ src/                # Server source (Express, WS, BullMQ)
│   ├─ server.ts       # Entry point for the API and WebSocket server
│   └─ ...
├─ public/             # Static assets served by Vite in development
├─ docs/               # Documentation (this folder)
│   ├─ Context.md
│   └─ README.md
├─ package.json        # NPM manifest with scripts & dependencies
├─ tsconfig.json       # TypeScript configuration (not shown here)
└─ docker-compose.yml # Docker services definition
```

## How to Extend

* Add more Express routes under `src/routes`.
* Create BullMQ queues in `src/queues` and workers in `src/workers`.
* Build React components under `src/client` and import them in the Vite entry.
* Adjust the Docker Compose file to include additional services (e.g., a mail server).

---

Feel free to modify any part of this scaffold to suit your project's needs.

# Full‑Stack Starter Project

This repository provides a **complete development environment** for a modern JavaScript full‑stack application.

## Features

* **Backend** – Express server with WebSocket support (`ws`).
* **Job Queue** – BullMQ powered by Redis for background processing.
* **Database** – PostgreSQL container for relational data.
* **Frontend** – React + Vite for fast, module‑based development.
* **TypeScript** – End‑to‑end type safety.
* **Docker Compose** – One‑command spin‑up of PostgreSQL and Redis.

## Prerequisites

* Docker & Docker Compose
* Node.js (>=18) and npm

## Getting Started

```bash
# Clone the repo
git clone <repo-url>
cd <repo-dir>

# Install dependencies
npm install

# Start supporting services (Postgres & Redis)
docker compose up -d

# Run the development servers
npm run dev      # Starts Vite (frontend)
npm run server   # Starts Express + WS backend with ts-node
```

The Vite dev server proxies API requests to `http://localhost:3000` (default Express port). Adjust the proxy configuration in `vite.config.ts` if needed.

## Building for Production

```bash
npm run build    # Builds the React app into `dist/`
npm run start    # Runs the compiled server (`node dist/server.js`)
```

## Docker Compose Services

* **postgres** – Exposed on `localhost:5432` (user: `user`, password: `password`, db: `appdb`).
* **redis** – Exposed on `localhost:6379`.

Both containers use named volumes to persist data across restarts.

## Project Structure

```
src/
  server.ts          # Express & WS entry point
  routes/            # API route definitions
  queues/            # BullMQ queue definitions
  workers/           # BullMQ worker implementations
public/               # Static assets (served by Vite)
docs/                 # Documentation (Context.md, README.md)
package.json          # NPM manifest
docker-compose.yml   # Docker services
```

## Extending the Stack

* **Add more dependencies** – `npm install <pkg>` and update `package.json`.
* **Configure TypeScript** – Edit `tsconfig.json` to suit your preferences.
* **Add environment variables** – Create a `.env` file and reference it in Docker Compose or Node via `process.env`.

---

Happy coding!