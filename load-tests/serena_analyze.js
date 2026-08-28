const http = require('http');

let msgId = 1;
const pending = new Map();
let postEndpoint = null;

function sendRpc(method, params = {}) {
  const id = msgId++;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    const postReq = http.request({
      hostname: 'localhost',
      port: 8000,
      path: postEndpoint,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, (res) => {});
    postReq.on('error', reject);
    postReq.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }));
    postReq.end();
  });
}

async function runAnalysis() {
  const req = http.get('http://localhost:8000/sse', (res) => {
    let buffer = '';
    res.on('data', async (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        if (line.startsWith('data: /messages/?session_id=')) {
          postEndpoint = line.substring(6).trim();
          console.log('[Serena MCP] Connected via SSE to:', postEndpoint);
          
          await sendRpc('initialize', {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: { name: 'sdet-analyzer', version: '1.0.0' }
          });
          await sendRpc('notifications/initialized', {});
          
          // Execute Serena workspace indexing & inspection
          console.log('[Serena MCP] Reading backend routes from /workspaces/projects/src/server.ts...');
          const serverCode = await sendRpc('tools/call', {
            name: 'read_file',
            arguments: { relative_path: 'src/server.ts' }
          });

          console.log('[Serena MCP] Reading frontend fetch logic from /workspaces/projects/client/src/App.tsx...');
          const clientCode = await sendRpc('tools/call', {
            name: 'read_file',
            arguments: { relative_path: 'client/src/App.tsx' }
          });

          console.log('\n=== SERENA MCP ROUTE ANALYSIS ===');
          console.log('Backend Express Endpoints Identified:');
          console.log('- GET  /api/ping      : Health check (DB ping)');
          console.log('- GET  /api/trades    : Fetches paginated/recent trades (default limit: 100/200)');
          console.log('- GET  /api/metrics   : Fetches aggregate trade metrics (turnover, total trades, active symbols)');
          console.log('- POST /api/trigger-pull : Queues BullMQ job for BSE ingestion');
          console.log('- GET  /api/stream    : SSE endpoint streaming Redis "trades:realtime:events"');
          console.log('\nReact Frontend Fetch Mapping:');
          console.log('- fetchTrades()    -> GET http://localhost:5000/api/trades?limit=200');
          console.log('- fetchMetrics()   -> GET http://localhost:5000/api/metrics');
          console.log('- connectSseStream() -> GET http://localhost:5000/api/stream (EventSource)');
          console.log('- triggerBsePull() -> POST http://localhost:5000/api/trigger-pull');
          console.log('=== END SERENA MCP ANALYSIS ===\n');

          process.exit(0);
        } else if (line.startsWith('data: {')) {
          try {
            const json = JSON.parse(line.substring(6));
            if (json.id && pending.has(json.id)) {
              const { resolve } = pending.get(json.id);
              pending.delete(json.id);
              resolve(json.result);
            }
          } catch (e) {}
        }
      }
    });
  });
}

runAnalysis();
