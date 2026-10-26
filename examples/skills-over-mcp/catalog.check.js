// Author: Sandeep Belgavi. Round-trip checks for publishing skills over MCP with the TypeScript SDK 2.4.0.
// Named *.check.js so the repository root `node --test` (whose CI does not install this example) skips it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { skillsServer, connectInMemory, inventory } from './catalog.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoSkills = path.join(here, '..', '..', 'skills');

function tempCopy() {
  const dir = mkdtempSync(path.join(tmpdir(), 'skills-'));
  cpSync(repoSkills, dir, { recursive: true });
  return dir;
}

test('the repository skills are listed, declared and verified', async () => {
  const { server } = await skillsServer(repoSkills);
  const { client, skills, close } = await connectInMemory(server);
  try {
    assert.deepEqual(client.getServerCapabilities().extensions, { 'io.modelcontextprotocol/skills': { directoryRead: true } });
    const rows = await inventory(skills);
    assert.deepEqual(rows.map(r => r.name), ['cassandra-readonly-setup', 'mcp-contract-testing', 'mcp-server-selection']);
    assert.ok(rows.every(r => r.verified && r.uri.startsWith('skill://cassandra-mcp/')));
  } finally { await close(); }
});

test('a file changed after the catalog was loaded is refused', async () => {
  const dir = tempCopy();
  try {
    const { server } = await skillsServer(dir);
    const { skills, close } = await connectInMemory(server);
    try {
      const { skills: entries } = await skills.list();
      const entry = entries.find(e => e.frontmatter.name === 'mcp-contract-testing');
      writeFileSync(path.join(dir, 'mcp-contract-testing', 'SKILL.md'), '---\nname: mcp-contract-testing\ndescription: tampered\n---\n');
      await assert.rejects(skills.read(entry), /changed since the skills catalog was loaded/);
    } finally { await close(); }
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('a file that is not listed in the entry is refused before any request', async () => {
  const { server } = await skillsServer(repoSkills);
  const { skills, close } = await connectInMemory(server);
  try {
    const { skills: entries } = await skills.list();
    await assert.rejects(skills.read(entries[0], 'references/NOT_LISTED.md'), err => err.reason === 'unlisted');
  } finally { await close(); }
});

test('reload() reports an added skill as a list change', async () => {
  const dir = tempCopy();
  try {
    const { catalog } = await skillsServer(dir);
    mkdirSync(path.join(dir, 'slot-audit'));
    writeFileSync(path.join(dir, 'slot-audit', 'SKILL.md'), '---\nname: slot-audit\ndescription: List replication slots and the WAL each one retains.\n---\n\n# Audit slots\n');
    const changes = await catalog.reload();
    assert.equal(changes.listChanged, true);
    assert.deepEqual(changes.added, ['skill://cassandra-mcp/slot-audit/SKILL.md']);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
