import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
const [keyspace, table] = (process.env.CASSANDRA_TABLES || '').split(',')[0].split('.');
if (!keyspace || !table || !process.env.CASSANDRA_TEST_PARTITION || !process.env.CASSANDRA_TEST_COLUMNS) throw new Error('Set documented Cassandra settings, CASSANDRA_TEST_PARTITION JSON and CASSANDRA_TEST_COLUMNS comma-separated');
const client = new Client({ name: 'live-check', version: '1' });
try {
  await client.connect(new StdioClientTransport({ command: process.execPath, args: ['src/cli.js'], env: { ...process.env }, stderr: 'inherit' }));
  for (const request of [ { name: 'describe_table', arguments: { keyspace, table } }, { name: 'read_partition', arguments: { keyspace, table, partition: JSON.parse(process.env.CASSANDRA_TEST_PARTITION), columns: process.env.CASSANDRA_TEST_COLUMNS.split(','), limit: 1 } } ]) {
    const result = await client.callTool(request); assert.ok(!result.isError, `${request.name} failed: ${result.content[0].text}`);
    console.log(`${request.name}: passed (data withheld from test log)`);
  }
} finally { await client.close(); }
