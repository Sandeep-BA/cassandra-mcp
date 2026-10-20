// Author: Sandeep Belgavi.
// A tiny loopback server with three routes, all behind the guard. It stands in for a local agent
// or MCP endpoint; it holds no data and calls no model. Start: node examples/localhost-http-guard/server.js
import http from 'node:http';
import { createGuard, guarded } from './guard.js';

export function createServer({ port, allowedOrigins = [] }) {
  const check = createGuard({ port, allowedOrigins });
  return http.createServer(guarded(check, (req, res) => {
    if (req.url === '/health') {
      res.writeHead(200, { 'content-type': 'text/plain' });
      res.end('ok\n');
    } else if (req.url === '/api/sessions' && req.method === 'GET') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ sessions: [{ id: 's-1', note: 'synthetic session' }] }));
    } else if (req.url === '/api/run' && req.method === 'POST') {
      res.writeHead(202, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ accepted: true }));
    } else {
      res.writeHead(404, { 'content-type': 'text/plain' });
      res.end('not found\n');
    }
  }));
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('server.js')) {
  const port = Number(process.env.GUARD_PORT || 8000);
  const allowedOrigins = (process.env.GUARD_ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
  createServer({ port, allowedOrigins }).listen(port, '127.0.0.1', () => {
    console.error(`listening on http://127.0.0.1:${port} (loopback only); extra origins: ${allowedOrigins.join(', ') || 'none'}`);
  });
}
