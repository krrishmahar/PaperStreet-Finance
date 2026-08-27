import { Pool } from 'pg';
import 'dotenv/config';

export const pgPool = new Pool({
  host: process.env.PG_HOST || '127.0.0.1',
  port: Number(process.env.PG_PORT || 5432),
  user: process.env.PG_USER || 'postgres',
  password: process.env.PG_PASSWORD || 'password',
  database: process.env.PG_DATABASE || 'fintech_bse',
  max: 20,
  idleTimeoutMillis: 30000,
});

export interface Trade {
  trade_id: string;
  client_id: string;
  client_name: string;
  symbol: string;
  quantity: number;
  price: number;
  order_type: 'BUY' | 'SELL';
  trade_timestamp: string;
}

export async function insertTradesBatch(trades: Trade[]): Promise<number> {
  if (trades.length === 0) return 0;
  
  const client = await pgPool.connect();
  try {
    const values: any[] = [];
    const placeholders: string[] = [];

    trades.forEach((t, i) => {
      const offset = i * 7;
      placeholders.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7})`);
      values.push(t.trade_id, t.client_id, t.client_name, t.symbol, t.quantity, t.price, t.order_type, t.trade_timestamp);
    });

    const query = `
      INSERT INTO trades (trade_id, client_id, client_name, symbol, quantity, price, order_type, trade_timestamp)
      VALUES ${placeholders.join(', ')}
      ON CONFLICT (trade_id) DO NOTHING;
    `;

    const res = await client.query(query, values);
    return res.rowCount || 0;
  } finally {
    client.release();
  }
}

export async function getRecentTrades(limit = 100): Promise<Trade[]> {
  const res = await pgPool.query(`
    SELECT trade_id, client_id, client_name, symbol, quantity, price, order_type, trade_timestamp
    FROM trades
    ORDER BY trade_timestamp DESC
    LIMIT $1
  `, [limit]);
  return res.rows;
}

export async function getTradeMetrics() {
  const res = await pgPool.query(`
    SELECT 
      COUNT(*) AS total_trades,
      COALESCE(SUM(quantity * price), 0) AS total_turnover,
      COALESCE(AVG(price), 0) AS avg_price,
      COUNT(DISTINCT symbol) AS active_symbols,
      COUNT(DISTINCT client_id) AS active_clients
    FROM trades
  `);
  return res.rows[0];
}
