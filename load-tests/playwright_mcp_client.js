const http = require('http');

function callPlaywrightMcp(method, params = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: '127.0.0.1',
      port: 3000,
      path: '/mcp',
      method: 'POST',
      headers: {
        'Host': 'localhost:3000',
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream'
      }
    }, (res) => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        try {
          const lines = body.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const json = JSON.parse(line.substring(6));
              return resolve(json);
            }
          }
          resolve({ raw: body });
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.write(JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method, params }));
    req.end();
  });
}

async function verifyPlaywrightMcp() {
  console.log('[Playwright MCP] Connecting to stream at http://localhost:3000/mcp ...');
  
  const initRes = await callPlaywrightMcp('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'sdet-playwright-client', version: '1.0.0' }
  });
  console.log('[Playwright MCP] Initialized:', JSON.stringify(initRes));

  const toolsRes = await callPlaywrightMcp('tools/list', {});
  console.log('[Playwright MCP] Available Tools:', toolsRes.result?.tools?.map(t => t.name));
  return toolsRes;
}

verifyPlaywrightMcp().catch(console.error);
