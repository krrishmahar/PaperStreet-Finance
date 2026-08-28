import { Pool, type PoolConfig } from 'pg';
import 'dotenv/config';

const getPoolConfig = (): PoolConfig => {
  if (process.env.DATABASE_URL) {
    return {
      connectionString: process.env.DATABASE_URL,
      ssl:
        process.env.NODE_ENV === 'production' ||
        process.env.DATABASE_URL.includes('sslmode=require') ||
        process.env.DB_SSL === 'true'
          ? { rejectUnauthorized: false }
          : undefined,
      max: Number(process.env.PG_MAX_POOL || 20),
      idleTimeoutMillis: 30000,
    };
  }

  const dbHost = process.env.DB_HOST || process.env.PG_HOST || '127.0.0.1';
  const dbPort = Number(
    process.env.DB_PORT ||
      process.env.PG_PORT ||
      (process.env.USE_PGBOUNCER === 'true' ? 6543 : 5432)
  );
  const dbUser = process.env.DB_USER || process.env.PG_USER || 'postgres';
  const dbPassword = process.env.DB_PASSWORD || process.env.PG_PASSWORD || 'password';
  const dbName = process.env.DB_NAME || process.env.PG_DATABASE || 'fintech_bse';
  const isSsl =
    process.env.DB_SSL === 'true' ||
    (process.env.NODE_ENV === 'production' && dbHost !== '127.0.0.1' && dbHost !== 'localhost');

  return {
    host: dbHost,
    port: dbPort,
    user: dbUser,
    password: dbPassword,
    database: dbName,
    ssl: isSsl ? { rejectUnauthorized: false } : undefined,
    max: Number(process.env.PG_MAX_POOL || 20),
    idleTimeoutMillis: 30000,
  };
};

export const pgPool = new Pool(getPoolConfig());

export interface Trade {
  trade_id: string;
  client_id: string;
  client_name: string;
  symbol: string;
  quantity: number;
  price: number;
  order_type: 'BUY' | 'SELL';
  trade_timestamp: string;
  ingested_at?: string;
  updated_at?: string;
}

export interface BatchInsertResult {
  totalProcessed: number;
  insertedCount: number;
  amendedCount: number;
  amendedTradeIds: string[];
}

export async function ping(): Promise<boolean> {
  const client = await pgPool.connect();
  try {
    await client.query('SELECT 1');
    return true;
  } finally {
    client.release();
  }
}

export async function initDb(): Promise<void> {
  const client = await pgPool.connect();
  try {
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE trade_direction AS ENUM ('BUY', 'SELL');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;

      CREATE TABLE IF NOT EXISTS trades (
        trade_id VARCHAR(64) PRIMARY KEY,
        client_id VARCHAR(64) NOT NULL,
        client_name VARCHAR(128) NOT NULL,
        symbol VARCHAR(32) NOT NULL,
        quantity BIGINT NOT NULL,
        price NUMERIC(16, 4) NOT NULL,
        order_type trade_direction NOT NULL,
        trade_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
        ingested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      ALTER TABLE trades ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
      CREATE INDEX IF NOT EXISTS idx_trades_symbol ON trades(symbol);
      CREATE INDEX IF NOT EXISTS idx_trades_timestamp ON trades(trade_timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_trades_client ON trades(client_id);
      CREATE INDEX IF NOT EXISTS idx_trades_updated_at ON trades(updated_at DESC);
    `);
  } finally {
    client.release();
  }
}

export async function insertTradesBatch(trades: Trade[]): Promise<BatchInsertResult> {
  if (trades.length === 0) {
    return { totalProcessed: 0, insertedCount: 0, amendedCount: 0, amendedTradeIds: [] };
  }

  const client = await pgPool.connect();
  try {
    const values: Array<string | number> = [];
    const placeholders: string[] = [];

    trades.forEach((t, i) => {
      const offset = i * 8;
      placeholders.push(
        `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, NOW())`
      );
      values.push(
        t.trade_id,
        t.client_id,
        t.client_name,
        t.symbol,
        t.quantity,
        t.price,
        t.order_type,
        t.trade_timestamp
      );
    });

    const query = `
      INSERT INTO trades (trade_id, client_id, client_name, symbol, quantity, price, order_type, trade_timestamp, updated_at)
      VALUES ${placeholders.join(', ')}
      ON CONFLICT (trade_id) DO UPDATE 
      SET price = EXCLUDED.price,
          quantity = EXCLUDED.quantity,
          order_type = EXCLUDED.order_type,
          updated_at = NOW()
      WHERE trades.trade_timestamp <= EXCLUDED.trade_timestamp
      RETURNING (xmax = 0) AS is_inserted, trade_id;
    `;

    const res = await client.query(query, values);
    let insertedCount = 0;
    let amendedCount = 0;
    const amendedTradeIds: string[] = [];

    res.rows.forEach((row) => {
      if (row.is_inserted) {
        insertedCount++;
      } else {
        amendedCount++;
        amendedTradeIds.push(row.trade_id);
      }
    });

    return {
      totalProcessed: res.rowCount || 0,
      insertedCount,
      amendedCount,
      amendedTradeIds,
    };
  } finally {
    client.release();
  }
}

export async function getRecentTrades(limit = 100): Promise<Trade[]> {
  const res = await pgPool.query(`
    SELECT trade_id, client_id, client_name, symbol, quantity, price, order_type, trade_timestamp, ingested_at, updated_at
    FROM trades
    ORDER BY trade_timestamp DESC
    LIMIT $1
  `, [limit]);
  return res.rows.map((row) => ({
    ...row,
    quantity: Number(row.quantity),
    price: Number(row.price),
  }));
}

export async function getTradeMetrics() {
  const res = await pgPool.query(`
    SELECT 
      COUNT(*)::bigint AS total_trades,
      COALESCE(SUM(quantity * price), 0)::numeric AS total_turnover,
      COALESCE(AVG(price), 0)::numeric AS avg_price,
      COUNT(DISTINCT symbol)::int AS active_symbols,
      COUNT(DISTINCT client_id)::int AS active_clients
    FROM trades
  `);
  const row = res.rows[0] || {};
  return {
    total_trades: Number(row.total_trades || 0),
    total_turnover: Number(row.total_turnover || 0),
    avg_price: Number(row.avg_price || 0),
    active_symbols: Number(row.active_symbols || 0),
    active_clients: Number(row.active_clients || 0),
  };
}

const db = {
  pgPool,
  ping,
  initDb,
  insertTradesBatch,
  getRecentTrades,
  getTradeMetrics,
};

export default db;
