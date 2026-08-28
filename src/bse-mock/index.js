const express = require('express');
const { generateTrades } = require('./data');

const app = express();
const trades = generateTrades(10000);
app.use(express.json());

app.get(['/getTrades', '/api/trades'], (req, res) => {
  const cursor = Math.max(0, Number.parseInt(req.query.cursor, 10) || 0);
  const limit = Math.min(1000, Math.max(1, Number.parseInt(req.query.limit, 10) || 500));
  const data = trades.slice(cursor, cursor + limit);
  const nextCursor = cursor + data.length < trades.length ? cursor + data.length : null;

  res.json({
    success: true,
    data,
    meta: {
      totalRecords: trades.length,
      nextCursor,
      progressPercent: Math.round(((cursor + data.length) / trades.length) * 100),
      isCompleted: nextCursor === null,
    },
  });
});

app.get('/health', (_req, res) => res.json({ status: 'OK', seededTrades: trades.length }));

module.exports = { app, trades };

if (require.main === module) {
  const port = Number(process.env.BSE_MOCK_PORT || process.env.PORT || 4000);
  app.listen(port, () => console.log(`[BSE-Mock] API Server running at http://localhost:${port}`));
}
