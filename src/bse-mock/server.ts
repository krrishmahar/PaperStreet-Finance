import express, { type Request, type Response } from 'express';
import cors from 'cors';
import 'dotenv/config';

const app = express();
const PORT = Number(process.env.BSE_MOCK_PORT || 4000);

app.use(cors());
app.use(express.json());

const SYMBOLS = [
  { symbol: 'RELIANCE', basePrice: 2985.5 },
  { symbol: 'TCS', basePrice: 4245.0 },
  { symbol: 'HDFCBANK', basePrice: 1675.25 },
  { symbol: 'INFY', basePrice: 1860.8 },
  { symbol: 'ICICIBANK', basePrice: 1195.4 },
  { symbol: 'SBIN', basePrice: 835.6 },
  { symbol: 'TATAMOTORS', basePrice: 1015.0 },
  { symbol: 'BHARTIARTL', basePrice: 1492.3 },
  { symbol: 'ITC', basePrice: 492.1 },
  { symbol: 'LT', basePrice: 3660.0 },
];

const CLIENTS = [
  { id: 'CLI_2001', name: 'Arham Capital PMS' },
  { id: 'CLI_2002', name: 'Kotak Institutional Equities' },
  { id: 'CLI_2003', name: 'HDFC Securities Prop Desk' },
  { id: 'CLI_2004', name: 'Motilal Oswal Financial' },
  { id: 'CLI_2005', name: 'Zerodha Alpha Client' },
  { id: 'CLI_2006', name: 'ICICI Prudential MF' },
  { id: 'CLI_2007', name: 'Morgan Stanley India' },
  { id: 'CLI_2008', name: 'Goldman Sachs India PMS' },
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
let ALL_TRADES: BseTrade[] = [];
let currentBatchNumber = 2; // Fresh generation series (BSE_20000001+)

/**
 * Generates a deterministic, high-entropy mock trade dataset
 */
export function generateTradesBatch(batchIndex = 2): BseTrade[] {
  const trades: BseTrade[] = [];
  const baseTimestamp = Date.now() - 3600 * 1000;
  const startIdOffset = batchIndex * 10000000;

  for (let i = 1; i <= TOTAL_SEEDED_TRADES; i++) {
    const sym = SYMBOLS[i % SYMBOLS.length];
    const client = CLIENTS[i % CLIENTS.length];
    
    // Realistic price oscillation formula
    const priceVariance = Math.sin((i + batchIndex * 100) / 12) * (sym.basePrice * 0.015);
    const price = +(sym.basePrice + priceVariance).toFixed(2);
    
    // Dynamic block size in lots of 25
    const quantity = ((i % 20) + 1) * 50;
    const order_type = i % 3 === 0 ? 'SELL' : 'BUY';
    const timestamp = new Date(baseTimestamp + i * 360).toISOString();

    trades.push({
      trade_id: `BSE_${startIdOffset + i}`,
      client_id: client.id,
      client_name: client.name,
      symbol: sym.symbol,
      quantity,
      price,
      order_type,
      trade_timestamp: timestamp,
    });
  }

  return trades;
}

// Initialize with new batch (BSE_20000001 to BSE_20010000)
ALL_TRADES = generateTradesBatch(currentBatchNumber);
console.log(
  `[BSE-Mock] Pre-seeded ${ALL_TRADES.length} NEW trades in memory (Series ${currentBatchNumber}: ${ALL_TRADES[0].trade_id} -> ${ALL_TRADES[ALL_TRADES.length - 1].trade_id}).`
);

app.get(['/getTrades', '/bse/trades'], (req: Request, res: Response) => {
  const cursor = Math.max(0, parseInt(req.query.cursor as string, 10) || 0);
  const limit = Math.min(1000, Math.max(1, parseInt(req.query.limit as string, 10) || 500));
  const delayMs = parseInt(req.query.delayMs as string, 10) || 80;

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
        batchNumber: currentBatchNumber,
      },
    });
  }, delayMs);
});

app.all(['/regenerate', '/bse/regenerate'], (req: Request, res: Response) => {
  currentBatchNumber++;
  ALL_TRADES = generateTradesBatch(currentBatchNumber);
  console.log(
    `[BSE-Mock] 🔄 Regenerated ${ALL_TRADES.length} trades for Batch Series ${currentBatchNumber} (${ALL_TRADES[0].trade_id} -> ${ALL_TRADES[ALL_TRADES.length - 1].trade_id})`
  );

  res.json({
    success: true,
    message: `Generated fresh 10,000 BSE trade records for Batch Series ${currentBatchNumber}`,
    batchNumber: currentBatchNumber,
    sampleStart: ALL_TRADES[0].trade_id,
    sampleEnd: ALL_TRADES[ALL_TRADES.length - 1].trade_id,
    totalRecords: ALL_TRADES.length,
  });
});

app.get('/health', (_req, res) => {
  res.json({
    status: 'OK',
    seededTrades: ALL_TRADES.length,
    batchNumber: currentBatchNumber,
    firstTrade: ALL_TRADES[0]?.trade_id,
    lastTrade: ALL_TRADES[ALL_TRADES.length - 1]?.trade_id,
  });
});

app.listen(PORT, () => {
  console.log(`[BSE-Mock] API Server running at http://localhost:${PORT}`);
  console.log(`[BSE-Mock] Endpoints: GET http://localhost:${PORT}/getTrades`);
});
