// Author: Sandeep Belgavi
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { existsSync } from 'node:fs';
const python = process.env.MCP_PYTHON || (process.platform === 'win32' ? 'implementations/python/.venv/Scripts/python.exe' : 'implementations/python/.venv/bin/python');
const commands = [
  ['node', process.execPath, ['src/cli.js']],
  ['python', python, ['-m', 'cassandra_mcp.server']],
  ['java', process.env.MCP_JAVA || 'java', ['-jar', 'implementations/java/target/cassandra-mcp.jar']]
];
assert.ok(existsSync('implementations/java/target/cassandra-mcp.jar'), 'Build Java first');
for (const [name, command, args] of commands) {
  const client = new Client({ name: 'cross-language-verification', version: '1' });
  const transport = new StdioClientTransport({ command, args, env: { ...process.env, CASSANDRA_TABLES: 'demo.events', CASSANDRA_USERNAME: 'fixture-reader', CASSANDRA_PASSWORD: 'fixture-not-a-secret', CASSANDRA_TLS: 'false', CASSANDRA_CONTACT_POINTS: '127.0.0.1' }, stderr: 'pipe' });
  let stderr = ''; transport.stderr?.on('data', d => { stderr += d; });
  try {
    await client.connect(transport);
    const tools = await client.listTools();
    assert.deepEqual(tools.tools.map(t => t.name).sort(), ['describe_table', 'list_tables', 'read_partition']);
    for (const tool of tools.tools) assert.equal(tool.annotations.readOnlyHint, true);
    const list = await client.callTool({ name: 'list_tables', arguments: {} });
    assert.deepEqual(JSON.parse(list.content[0].text), { tables: ['demo.events'] });
    const denied = await client.callTool({ name: 'describe_table', arguments: { keyspace: 'private', table: 'users' } });
    assert.equal(denied.isError, true); assert.match(denied.content[0].text, /not authorized/);
    const invalid = await client.callTool({ name: 'read_partition', arguments: { keyspace: 'demo', table: 'events', partition: { tenant: 'a' }, columns: ['body'], limit: 101 } });
    assert.equal(invalid.isError, true);
    assert.ok(!stderr.includes('fixture-not-a-secret'));
    console.log(`${name}: initialize, discovery, annotations, list, denied table, invalid limit, stderr redaction PASS`);
  } catch (error) {
    console.error(`${name}: ${error.message}; stderr=${stderr.slice(-2000)}`); throw error;
  } finally { await client.close(); }
}
