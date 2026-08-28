import express, { type Request, type Response } from 'express';
import cors from 'cors';
import 'dotenv/config';

const app = express();
const PORT = Number(process.env.BSE_MOCK_PORT || 4000);

app.use(cors());
app.use(express.json());

const SYMBOLS = [
  { symbol: 'RELIANCE', basePrice: 2950.0 },
  { symbol: 'TCS', basePrice: 4210.0 },
  { symbol: 'HDFCBANK', basePrice: 1650.0 },
  { symbol: 'INFY', basePrice: 1840.0 },
  { symbol: 'ICICIBANK', basePrice: 1180.0 },
  { symbol: 'SBIN', basePrice: 820.0 },
  { symbol: 'TATAMOTORS', basePrice: 990.0 },
  { symbol: 'BHARTIARTL', basePrice: 1470.0 },
  { symbol: 'ITC', basePrice: 485.0 },
  { symbol: 'LT', basePrice: 3620.0 },
];

const CLIENTS = [
  { id: 'CLI_1001', name: 'Arham Capital PMS' },
  { id: 'CLI_1002', name: 'Kotak Institutional Equities' },
  { id: 'CLI_1003', name: 'HDFC Securities Prop Desk' },
  { id: 'CLI_1004', name: 'Motilal Oswal Financial' },
  { id: 'CLI_1005', name: 'Zerodha Alpha Client' },
  { id: 'CLI_1006', name: 'ICICI Prudential MF' },
];

export interface BseTrade {
  trade_id: string;
  client_id: string;
  client_name: string;
  symbol: string;
  quantity: number;
  price: number;
  order_type: 'BUY' | 'SELL';
  trade_timestamp: string;
}

const TOTAL_SEEDED_TRADES = 10000;
const ALL_TRADES: BseTrade[] = [];

const startTime = Date.now() - 3600 * 1000;
for (let i = 1; i <= TOTAL_SEEDED_TRADES; i++) {
  const sym = SYMBOLS[i % SYMBOLS.length];
  const client = CLIENTS[i % CLIENTS.length];
  const priceVariation = ((i % 20) - 10) * 0.5;
  const price = +(sym.basePrice + priceVariation).toFixed(2);
  const quantity = ((i % 15) + 1) * 25;
  const order_type = i % 3 === 0 ? 'SELL' : 'BUY';
  const timestamp = new Date(startTime + i * 350).toISOString();

  ALL_TRADES.push({
    trade_id: `BSE_${10000000 + i}`,
    client_id: client.id,
    client_name: client.name,
    symbol: sym.symbol,
    quantity,
    price,
    order_type,
    trade_timestamp: timestamp,
  });
}

console.log(`[BSE-Mock] Pre-seeded ${ALL_TRADES.length} trades in memory.`);

app.get(['/getTrades', '/bse/trades'], (req: Request, res: Response) => {
  const cursor = Math.max(0, parseInt(req.query.cursor as string, 10) || 0);
  const limit = Math.min(1000, Math.max(1, parseInt(req.query.limit as string, 10) || 500));
  const delayMs = parseInt(req.query.delayMs as string, 10) || 100;

  setTimeout(() => {
    const chunk = ALL_TRADES.slice(cursor, cursor + limit);
    const nextCursor = cursor + limit < ALL_TRADES.length ? cursor + limit : null;
    const progressPercent = Math.min(100, Math.round(((cursor + chunk.length) / ALL_TRADES.length) * 100));

    res.json({
      success: true,
      data: chunk,
      meta: {
        totalRecords: ALL_TRADES.length,
        returnedCount: chunk.length,
        cursor,
        nextCursor,
        progressPercent,
        isCompleted: nextCursor === null,
      },
    });
  }, delayMs);
});

app.get('/health', (_req, res) => {
  res.json({ status: 'OK', seededTrades: ALL_TRADES.length });
});

app.listen(PORT, () => {
  console.log(`[BSE-Mock] API Server running at http://localhost:${PORT}`);
  console.log(`[BSE-Mock] Endpoints: GET http://localhost:${PORT}/getTrades`);
});
