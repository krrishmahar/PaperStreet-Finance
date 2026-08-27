}
  app.listen(port,()=>{console.log(`BSE mock server listening on port ${port}`);});
  const port = process.env.PORT||3001;
if(require.main===module){

module.exports = app;
// Export the app for test harnesses

setInterval(pullSimulator,PULL_INTERVAL_MIN*60*1000);

}
  if(trades.length>10000) trades = trades.slice(0,10000);
  // Trim to keep memory bounded (e.g., keep latest 10k)
  trades = newBatch.concat(trades);
  const newBatch = generateTrades(100);
  // Generate a small batch of new trades and prepend to the store
function pullSimulator(){
// Background job that simulates pulling new trades every PULL_INTERVAL_MIN minutes

});
  },latency);
    res.json({trades:slice,cursor:nextCursor});
  setTimeout(()=>{
  const latency = Math.random()*30000;
  // Simulate network latency up to 30 seconds

    :null;
    Buffer.from(String(nextIdx)).toString('base64')
  const nextCursor = nextIdx<trades.length?
  const nextIdx = startIdx+slice.length;
  const slice = trades.slice(startIdx,startIdx+limit);

  }
    if(!isNaN(parsed)) startIdx = parsed;
    const parsed = parseInt(decoded,10);
    const decoded = Buffer.from(cursor,'base64').toString('utf8');
  if(cursor){
  let startIdx = 0;
  // Resolve start index from cursor

  const clientId = req.ip; // simple client identifier
  const cursor = req.query.cursor||'';
  const limit = Math.min(parseInt(req.query.limit,10)||100,500);
app.get('/trades',(req,res)=>{
// GET /trades?cursor=<cursor>&limit=<n>
// Endpoint to fetch trades with cursor based pagination

app.use(bodyParser.json());
const app = express();

let cursorMap = new Map(); // clientId -> index
// Cursor state for pagination

let trades = generateTrades(5000); // realistic seed size
// In‑memory store of trades seeded at startup

  : 15;
  ? parseInt(process.env.BSE_PULL_INTERVAL_MIN,10)
const PULL_INTERVAL_MIN = process.env.BSE_PULL_INTERVAL_MIN
// Configurable pull interval in minutes (default 15)

const { generateTrades } = require('./data');
const bodyParser = require('body-parser');
const express = require('express');
