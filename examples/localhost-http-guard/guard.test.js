// Author: Sandeep Belgavi. Tests for the loopback Host/Origin guard; every row of the guide's table.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import http from 'node:http';
import { createGuard } from './guard.js';
import { createServer } from './server.js';

const check = createGuard({ port: 8000 });

test('developer UI, same-origin GET with no Origin, is allowed', () => {
  assert.equal(check({ host: 'localhost:8000' }), null);
  assert.equal(check({ host: '127.0.0.1:8000' }), null);
  assert.equal(check({ host: '[::1]:8000' }), null);
});

test('rebinding GET: attacker Host, no Origin, is refused by the Host check', () => {
  assert.match(check({ host: 'rebind.attacker.example:8000' }), /^host not allowed/);
});

test('rebinding POST: attacker Host and Origin, is refused', () => {
  assert.match(check({ host: 'rebind.attacker.example:8000', origin: 'http://rebind.attacker.example:8000' }), /^host not allowed/);
});

test('cross-site simple POST: loopback Host, foreign Origin, is refused by the Origin check', () => {
  assert.match(check({ host: '127.0.0.1:8000', origin: 'https://evil.example' }), /^origin not allowed/);
});

test('local tool such as curl, loopback Host and no Origin, is allowed', () => {
  assert.equal(check({ host: '127.0.0.1:8000' }), null);
});

test('substring and suffix tricks do not pass', () => {
  assert.notEqual(check({ host: 'localhost.attacker.example:8000' }), null);
  assert.notEqual(check({ host: 'localhost:8000.attacker.example' }), null);
  assert.notEqual(check({ host: 'localhost:9000' }), null);
  assert.notEqual(check({ host: '127.0.0.1:8000', origin: 'http://localhost:8000.attacker.example' }), null);
});

test('missing Host and opaque Origin null are refused', () => {
  assert.match(check({}), /missing/);
  assert.equal(check({ host: 'localhost:8000', origin: 'null' }), 'opaque origin rejected');
});

test('an explicitly allowed origin, e.g. a tunnel or a separate UI port, is accepted for Host and Origin', () => {
  const c = createGuard({ port: 8000, allowedOrigins: ['https://agent.dev.example', 'http://localhost:5173'] });
  assert.equal(c({ host: 'agent.dev.example', origin: 'https://agent.dev.example' }), null);
  assert.equal(c({ host: 'localhost:8000', origin: 'http://localhost:5173' }), null);
  assert.notEqual(createGuard({ port: 8000 })({ host: 'agent.dev.example' }), null);
});

test('invalid configuration is rejected', () => {
  assert.throws(() => createGuard({ port: 0 }), /port/);
  assert.throws(() => createGuard({ port: 8000, allowedOrigins: ['*'] }), /allowed origin/);
  assert.throws(() => createGuard({ port: 8000, allowedOrigins: ['https://x.example/path'] }), /allowed origin/);
});

test('end to end: every route is guarded, including /health', async () => {
  const server = createServer({ port: 8000 }).listen(0, '127.0.0.1');
  await once(server, 'listening');
  const { port } = server.address();
  // The guard is configured for port 8000 while the test server listens on a free port, so every request
  // sets the Host header explicitly. node:http allows that; fetch() treats Host as a forbidden header.
  const send = (path, headers, method = 'GET') => new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, path, method, headers }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (d) => { body += d; });
      res.on('end', () => resolve({ status: res.statusCode, json: async () => JSON.parse(body) }));
    });
    req.on('error', reject);
    req.end();
  });
  try {
    assert.equal((await send('/health', { host: 'localhost:8000' })).status, 200);
    assert.equal((await send('/api/sessions', { host: 'localhost:8000' })).status, 200);
    assert.equal((await send('/health', { host: 'rebind.attacker.example:8000' })).status, 403);
    assert.equal((await send('/api/sessions', { host: 'rebind.attacker.example:8000' })).status, 403);
    const refused = await send('/api/run', { host: '127.0.0.1:8000', origin: 'https://evil.example' }, 'POST');
    assert.equal(refused.status, 403);
    assert.match((await refused.json()).error.message, /origin not allowed/);
    assert.equal((await send('/api/run', { host: '127.0.0.1:8000' }, 'POST')).status, 202);
  } finally {
    server.close();
  }
});
