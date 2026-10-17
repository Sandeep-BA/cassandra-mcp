import test from 'node:test';
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { config } from '../src/config.js';
import { CassandraService } from '../src/service.js';
import { createServer } from '../src/server.js';
const base = { CASSANDRA_TABLES: 'demo.events', CASSANDRA_USERNAME: 'reader', CASSANDRA_PASSWORD: 'fixture-only' };
const schema = [ { column_name: 'tenant', kind: 'partition_key', position: 0, type: 'text' }, { column_name: 'id', kind: 'clustering', position: 0, type: 'int' }, { column_name: 'body', kind: 'regular', position: -1, type: 'text' } ];
function fixture() {
  const calls = [];
  const driver = { async execute(query, params, options) { calls.push({ query, params, options }); return { rows: query.includes('system_schema') ? schema : [{ tenant: 't1', id: 1, body: 'hello' }] }; } };
  return { calls, driver, service: new CassandraService(driver, ['demo.events']) };
}
async function session(t, service = fixture().service, options = {}) {
  const server = createServer(service, { audit: () => {}, ...options });
  const client = new Client({ name: 'test-client', version: '1' });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await server.connect(a); await client.connect(b);
  t.after(async () => { await client.close(); await server.close(); });
  return client;
}
test('configuration fails closed and TLS is required off loopback', () => {
  assert.equal(config(base).tls, true);
  for (const changes of [{ CASSANDRA_TABLES: '' }, { CASSANDRA_TABLES: 'system_auth.roles' }, { CASSANDRA_TABLES: 'demo.events;drop' }, { CASSANDRA_PASSWORD: '' }, { CASSANDRA_PORT: 'NaN' }, { CASSANDRA_TLS: 'false', CASSANDRA_CONTACT_POINTS: 'db.example.com' }]) assert.throws(() => config({ ...base, ...changes }));
  assert.equal(config({ ...base, CASSANDRA_TLS: 'false' }).tls, false);
});
test('unauthorized table rejected before database access', async () => {
  const { service, calls } = fixture();
  await assert.rejects(service.schema('private', 'users'), /not authorized/); assert.equal(calls.length, 0);
});
test('partition reads bind values, quote identifiers, and bound one page', async () => {
  const { service, calls } = fixture();
  const injection = "x'; DROP TABLE demo.events; --";
  await service.read({ keyspace: 'demo', table: 'events', partition: { tenant: injection }, columns: ['body'], limit: 10 });
  assert.equal(calls[1].query, 'SELECT "body" FROM "demo"."events" WHERE "tenant" = ? LIMIT 10');
  assert.deepEqual(calls[1].params, [injection]); assert.equal(calls[1].options.prepare, true); assert.equal(calls[1].options.autoPage, false);
});
test('missing/extra partition fields and unknown projections are rejected', async () => {
  for (const change of [{ partition: {} }, { partition: { tenant: 'a', id: 1 } }, { columns: ['password'] }, { columns: ['body', 'body'] }, { limit: 101 }]) {
    const { service, calls } = fixture();
    await assert.rejects(service.read({ keyspace: 'demo', table: 'events', partition: { tenant: 'a' }, columns: ['body'], limit: 10, ...change }));
    assert.equal(calls.length, 1);
  }
});
test('composite partition requires all keys in schema order', async () => {
  const { service, driver, calls } = fixture();
  const original = driver.execute;
  driver.execute = async (...args) => args[0].includes('system_schema') ? { rows: [schema[0], { column_name: 'day', kind: 'partition_key', position: 1, type: 'text' }, schema[2]] } : original(...args);
  await service.read({ keyspace: 'demo', table: 'events', partition: { day: 'today', tenant: 'a' }, columns: ['body'], limit: 1 });
  assert.deepEqual(calls[0].params, ['a', 'today']);
});
test('MCP handshake, discovery and real tool dispatch', async t => {
  const logs = [], f = fixture(); const client = await session(t, f.service, { audit: v => logs.push(v) });
  const tools = await client.listTools(); assert.deepEqual(tools.tools.map(x => x.name), ['list_tables', 'describe_table', 'read_partition']);
  const result = await client.callTool({ name: 'read_partition', arguments: { keyspace: 'demo', table: 'events', partition: { tenant: 'secret-tenant' }, columns: ['body'], limit: 1 } });
  assert.equal(JSON.parse(result.content[0].text).rows[0].body, 'hello');
  assert.equal(logs[0].status, 'ok'); assert.ok(!JSON.stringify(logs).includes('secret-tenant'));
  const invalid = await client.callTool({ name: 'read_partition', arguments: { keyspace: 'demo', table: 'events', partition: { tenant: 'a' }, columns: ['body'], limit: 1000 } });
  assert.equal(invalid.isError, true); assert.equal(f.calls.length, 2);
});
test('database errors do not expose credentials or driver details', async t => {
  const f = fixture(); f.driver.execute = async () => { throw new Error('password=do-not-leak 10.0.0.1'); };
  const client = await session(t, f.service);
  const r = await client.callTool({ name: 'describe_table', arguments: { keyspace: 'demo', table: 'events' } });
  assert.equal(r.isError, true); assert.ok(!JSON.stringify(r).includes('do-not-leak'));
});
test('oversized responses withheld and rate limit enforced', async t => {
  const f = fixture(); f.service.schema = async () => 'x'.repeat(65537);
  const client = await session(t, f.service);
  const r = await client.callTool({ name: 'describe_table', arguments: { keyspace: 'demo', table: 'events' } });
  assert.equal(r.isError, true); assert.match(r.content[0].text, /64 KiB/);
  for (let i = 0; i < 29; i++) await client.callTool({ name: 'list_tables', arguments: {} });
  const limited = await client.callTool({ name: 'list_tables', arguments: {} }); assert.match(limited.content[0].text, /Rate limit/);
});
test('concurrent database work is rejected', async t => {
  const f = fixture(); let release; f.service.schema = () => new Promise(resolve => { release = resolve; });
  const client = await session(t, f.service);
  const first = client.callTool({ name: 'describe_table', arguments: { keyspace: 'demo', table: 'events' } });
  while (!release) await new Promise(resolve => setImmediate(resolve));
  const second = await client.callTool({ name: 'list_tables', arguments: {} }); assert.match(second.content[0].text, /in progress/);
  release([]); await first;
});
test('actual stdio executable performs handshake without database connection', async t => {
  const transport = new StdioClientTransport({ command: process.execPath, args: ['src/cli.js'], env: base, stderr: 'pipe' });
  const client = new Client({ name: 'stdio-test', version: '1' }); t.after(() => client.close());
  await client.connect(transport);
  const result = await client.callTool({ name: 'list_tables', arguments: {} });
  assert.deepEqual(JSON.parse(result.content[0].text), { tables: ['demo.events'] });
});
