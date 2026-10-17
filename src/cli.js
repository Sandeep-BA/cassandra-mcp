import { readFileSync } from 'node:fs';
import cassandra from 'cassandra-driver';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { config } from './config.js';
import { CassandraService } from './service.js';
import { createServer } from './server.js';
let client, server;
async function close() { await server?.close(); await client?.shutdown(); }
try {
  const c = config();
  client = new cassandra.Client({ contactPoints: c.hosts, localDataCenter: c.datacenter, credentials: { username: c.username, password: c.password }, protocolOptions: { port: c.port }, socketOptions: { connectTimeout: 5000, readTimeout: 5000 }, policies: { retry: new cassandra.policies.retry.FallthroughRetryPolicy() }, ...(c.tls ? { sslOptions: { rejectUnauthorized: true, ...(c.ca ? { ca: [readFileSync(c.ca)] } : {}) } } : {}) });
  server = createServer(new CassandraService(client, c.tables));
  await server.connect(new StdioServerTransport());
  process.once('SIGINT', () => { void close(); });
  process.once('SIGTERM', () => { void close(); });
  process.stdin.once('end', () => { void close(); });
} catch {
  process.stderr.write('Cassandra MCP startup failed. Check documented environment settings and CA file. No credentials were logged.\n');
  await close(); process.exitCode = 1;
}
