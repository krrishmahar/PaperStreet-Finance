const http = require('http');

let msgId = 1;
const pending = new Map();
let postEndpoint = null;

function sendRpc(method, params = {}) {
  const id = msgId++;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    const postReq = http.request({
      hostname: '127.0.0.1',
      port: 3000,
      path: postEndpoint,
      method: 'POST',
      headers: {
        'Host': 'localhost:3000',
        'Content-Type': 'application/json'
      }
    }, (res) => {});
    postReq.on('error', reject);
    postReq.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }));
    postReq.end();
  });
}

function runPlaywrightMcpTest() {
  const req = http.request({
    hostname: '127.0.0.1',
    port: 3000,
    path: '/sse',
    method: 'GET',
    headers: { 'Host': 'localhost:3000' }
  }, (res) => {
    let buffer = '';
    res.on('data', async (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        if (line.startsWith('data: /sse?sessionId=')) {
          postEndpoint = line.substring(6).trim();
          console.log('[Playwright MCP] Session endpoint established:', postEndpoint);

          const initResult = await sendRpc('initialize', {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: { name: 'sdet-playwright-tester', version: '1.0.0' }
          });
          console.log('[Playwright MCP] Initialized:', JSON.stringify(initResult));

          await sendRpc('notifications/initialized', {});

          const toolsList = await sendRpc('tools/list', {});
          console.log('[Playwright MCP] Tools:', toolsList?.tools?.map(t => t.name) || toolsList);
        } else if (line.startsWith('data: {')) {
          try {
            const json = JSON.parse(line.substring(6));
            if (json.id && pending.has(json.id)) {
              const { resolve } = pending.get(json.id);
              pending.delete(json.id);
              resolve(json.result || json.error);
            }
          } catch(e) {}
        }
      }
    });
  });
  req.end();
}

runPlaywrightMcpTest();
