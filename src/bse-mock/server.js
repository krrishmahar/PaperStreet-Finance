module.exports = {app, trades};

});
  console.log(`Mock BSE API listening on port ${PORT}`);
app.listen(PORT, () => {
const PORT = process.env.PORT || 4000;

});
  req.on('close', () => clearInterval(timer));
  const timer = setInterval(sendChunk, interval);
  sendChunk();
  // Initial push
  };
    }
      res.write(JSON.stringify({trades: chunk, nextCursor: cursor}) + '\n');
      cursor = chunk[chunk.length - 1].id;
    if (chunk.length) {
    const chunk = trades.slice(startIdx, startIdx + 20);
    const startIdx = trades.findIndex(t => t.id === cursor) + 1;
  const sendChunk = () => {
  res.setHeader('Content-Type', 'application/json');
  let cursor = parseInt(req.query.cursor, 10) || 0;
  const interval = parseInt(req.query.interval, 10) || 15 * 60 * 1000;
app.get('/api/trades/stream', (req, res) => {
// Configurable via query param `interval` (ms), default 15 min
// 15‑minute pull simulator – returns new trades that appeared after the given cursor

});
  }, latency);
    });
      nextCursor,
      trades: slice,
    res.json({
  setTimeout(() => {
  const latency = Math.random() * 1000 + 500;
  // Simulate network latency <30s (e.g., 500‑1500ms)
  const nextCursor = slice.length ? slice[slice.length - 1].id : null;
  const slice = trades.slice(startIdx, startIdx + limit);
  const startIdx = trades.findIndex(t => t.id === cursor) + 1;
  // Find start index (cursor points to last id sent)
  const limit = Math.min(parseInt(req.query.limit, 10) || 100, 500);
  const cursor = parseInt(req.query.cursor, 10) || 0;
app.get('/api/trades', (req, res) => {
// cursor is the last trade id returned; limit caps number of items
// Cursor‑based pagination

const trades = Array.from({length: TOTAL_TRADES}, (_, i) => generateTrade(i + 1));
const TOTAL_TRADES = 10000;
// Create a large list of trades (e.g., 10,000)

});
  timestamp: new Date(Date.now() - Math.floor(Math.random()*1e9)).toISOString(),
  quantity: Math.floor(Math.random()*1000) + 1,
  price: (Math.random()*1000 + 100).toFixed(2),
  symbol: ['AAPL', 'GOOG', 'MSFT', 'AMZN', 'TSLA'][Math.floor(Math.random()*5)],
  id,
const generateTrade = (id) => ({
// Seed realistic BSE trades

app.use(bodyParser.json());
const app = express();
const bodyParser = require('body-parser');
const express = require('express');
});
  console.log(`BSE mock server listening on port ${PORT}`);
app.listen(PORT, () => {

});
  res.json({ trades: chunk, nextCursor });
  const { trades: chunk, nextCursor } = getChunk(cursor, Number(limit));
  }
    await new Promise((r) => setTimeout(r, PULL_DELAY_MS));
  if (PULL_DELAY_MS) {
  // Simulate network latency / pull interval
  const { cursor, limit = 100 } = req.query;
app.get('/api/bse-mock/trades', async (req, res) => {

const PULL_DELAY_MS = Number(process.env.PULL_DELAY_MS) || 0;
// Configurable delay (default 0) to simulate pull interval (e.g., 15 min)

}
  };
    nextCursor,
    trades: trades.slice(start, end),
  return {
  const nextCursor = end < trades.length ? String(end) : null;
  const end = Math.min(start + limit, trades.length);
  const start = cursor ? Number(cursor) : 0;
function getChunk(cursor, limit) {
// Helper to get a slice based on cursor and limit

);
  fs.readFileSync(path.join(__dirname, 'data', 'trades.json'), 'utf8')
const trades = JSON.parse(
// Load seeded trades data

const PORT = process.env.PORT || 4000;
const app = express();

const path = require('path');
const fs = require('fs');
const express = require('express');
});
  console.log(`Mock BSE API listening on http://localhost:${port}`);
app.listen(port, () => {

});
  }, durationMs);
    res.json({ message: `Pull simulation completed after ${minutes} minute(s).` });
    clearInterval(interval);
  setTimeout(() => {

  }, 5000); // log every 5 s
    console.log(`Simulator running – elapsed ${Math.floor(elapsed / 1000)}s`);
    // Here we could emit events, write logs, etc.
    }
      return;
      clearInterval(interval);
    if (elapsed >= durationMs) {
    const elapsed = Date.now() - start;
  const interval = setInterval(() => {
  const start = Date.now();

  const durationMs = minutes * 60 * 1000;
  const minutes = parseInt(req.query.minutes, 10) || 15;
app.get('/api/v1/simulate-pull', (req, res) => {
// Pull‑simulator – runs for a configurable duration (default 15 min)

});
  }, 500); // 0.5 s artificial delay
    res.json({ trades: slice, nextCursor });
  setTimeout(() => {
  // Simulate network latency <30 s to avoid timeout

  const nextCursor = slice.length ? slice[slice.length - 1].id : null;
  const slice = trades.slice(startIdx, startIdx + limit);

  }
    return res.json({ trades: [], nextCursor: null });
  if (startIdx === -1) {
  const startIdx = trades.findIndex((t) => t.id > cursor);
  // Find start index (cursor points to last id sent)

  const limit = Math.min(parseInt(req.query.limit, 10) || 100, 500);
  const cursor = parseInt(req.query.cursor, 10) || 0; // last id returned
app.get('/api/v1/trades', (req, res) => {
// ?cursor=<lastId>&limit=<size>
// Cursor‑based pagination endpoint

const trades = generateTrades(10000);
// In‑memory store – 10 000 trades for realistic load

};
  return trades;
  }
    });
      timestamp,
      quantity,
      price: Number(price),
      symbol,
      id: i + 1,
    trades.push({
    const timestamp = Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000); // last week
    const quantity = Math.floor(Math.random() * 1000) + 1;
    const price = (Math.random() * 3000 + 500).toFixed(2);
    const symbol = symbols[i % symbols.length];
  for (let i = 0; i < count; i++) {
  const trades = [];
  const symbols = ['RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'ITC', 'SBIN', 'HINDUNILVR', 'AXISBANK'];
const generateTrades = (count) => {
// In a real implementation this could be loaded from a CSV or JSON fixture.
// Seed realistic BSE trade data (sample generation)

const port = process.env.PORT || 3000;
const app = express();
const express = require('express');
