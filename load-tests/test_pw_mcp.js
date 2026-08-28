const http = require('http');

async function testPlaywrightMcpSession() {
  const req = http.request({
    hostname: '127.0.0.1',
    port: 3000,
    path: '/sse',
    method: 'GET',
    headers: { 'Host': 'localhost:3000' }
  }, (res) => {
    let buffer = '';
    res.on('data', (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        if (line.startsWith('data: /sse?sessionId=')) {
          const endpoint = line.substring(6).trim();
          console.log('[Playwright MCP] SSE Session Endpoint:', endpoint);
          
          const postRpc = (msg) => {
            const postReq = http.request({
              hostname: '127.0.0.1',
              port: 3000,
              path: endpoint,
              method: 'POST',
              headers: {
                'Host': 'localhost:3000',
                'Content-Type': 'application/json'
              }
            }, (pRes) => {});
            postReq.write(JSON.stringify(msg));
            postReq.end();
          };

          postRpc({
            jsonrpc: '2.0',
            id: 1,
            method: 'initialize',
            params: {
              protocolVersion: '2024-11-05',
              capabilities: {},
              clientInfo: { name: 'sdet-tester', version: '1.0.0' }
            }
          });
        } else if (line.startsWith('data: {')) {
          try {
            const json = JSON.parse(line.substring(6));
            console.log('[Playwright MCP Event]:', JSON.stringify(json).substring(0, 200));
          } catch(e) {}
        }
      }
    });
  });
  req.end();
}

testPlaywrightMcpSession();
