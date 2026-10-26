// Author: Sandeep Belgavi. Serve a folder of skills over MCP (Skills extension, SEP-2640) and read it back.
import { McpServer, InMemoryTransport } from '@modelcontextprotocol/server';
import { loadSkills } from '@modelcontextprotocol/server/ext/skills/node';
import { Client } from '@modelcontextprotocol/client';
import { SkillsClient } from '@modelcontextprotocol/client/ext/skills';

/** Build a server that publishes every skill folder under `root` as skill://<prefix>/<name>/... */
export async function skillsServer(root, prefix = 'cassandra-mcp') {
  const catalog = await loadSkills(root, { prefix, strict: true });
  const server = new McpServer({ name: 'cassandra-mcp-skills', version: '0.1.0' });
  catalog.attach(server);                       // experimental in 2.4.0: may change in a minor release
  return { server, catalog };
}

/** Connect a client in memory and return a SkillsClient plus a close function. */
export async function connectInMemory(server) {
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  await server.connect(serverSide);
  const client = new Client({ name: 'skills-host', version: '0.1.0' });
  await client.connect(clientSide);
  return { client, skills: new SkillsClient(client), close: () => client.close() };
}

/** List every skill and read each SKILL.md; every read is size- and digest-checked by the SDK. */
export async function inventory(skills) {
  const { skills: entries } = await skills.list();
  const out = [];
  for (const entry of entries) {
    const manifest = await skills.read(entry);
    out.push({ uri: entry.uri, name: entry.frontmatter.name, files: entry.resources.length,
               verified: manifest.verified, bodyStart: manifest.body.trim().split('\n')[0] });
  }
  return out;
}
