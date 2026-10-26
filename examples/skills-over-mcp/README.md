# Skills over MCP with the TypeScript SDK 2.4.0

**Author: Sandeep Belgavi**

This example publishes the repository's own [`skills/`](../../skills) folder over MCP using the Skills
extension (SEP-2640) that shipped in `@modelcontextprotocol/server` and `@modelcontextprotocol/client` 2.4.0
on 2026-10-23, and reads it back from a client. It accompanies *MCP TypeScript SDK 2.4.0: Skills Over MCP,
Rejected x-mcp-header Number Parameters and the structuredContent Unwrap* on aicassindra.com.

The Cassandra MCP server itself still uses `@modelcontextprotocol/sdk` 1.32.1 and stdio; this example has its
own `package.json` with the 2.4.0 packages pinned, so nothing in the server changes.

- `catalog.js` loads a folder with `loadSkills(root, { prefix, strict: true })`, attaches it to an
  `McpServer`, connects a `Client` over `InMemoryTransport`, and lists and reads every skill with
  `SkillsClient`, which checks each file's size and SHA-256 digest against the server's entry.
- `roundtrip.js` prints the server's declared extension and one line per skill.
- `catalog.check.js` checks the listing, a file changed after loading (refused), a file not listed in the
  entry (refused before any request, reason `unlisted`) and `reload()` reporting an added skill.

## Prerequisites

- Node.js 22 or newer.
- `npm install` in this folder (installs the two pinned 2.4.0 packages and their dependencies).
- No credentials, no network calls, no model. `.env.example` lists the one optional variable.

## Commands

```sh
cd examples/skills-over-mcp
npm install
npm start      # node roundtrip.js
npm test       # node --test catalog.check.js
```

## Expected output

```
server extensions: {"io.modelcontextprotocol/skills":{"directoryRead":true}}
{"uri":"skill://cassandra-mcp/cassandra-readonly-setup/SKILL.md","name":"cassandra-readonly-setup","files":1,"verified":true,"bodyStart":"# Configure Cassandra MCP"}
{"uri":"skill://cassandra-mcp/mcp-contract-testing/SKILL.md","name":"mcp-contract-testing","files":1,"verified":true,"bodyStart":"# Test the MCP contract"}
{"uri":"skill://cassandra-mcp/mcp-server-selection/SKILL.md","name":"mcp-server-selection","files":1,"verified":true,"bodyStart":"# Select an MCP server"}
```

`npm test` reports 4 passing checks. The check file is named `*.check.js` so the repository root `npm test`,
whose CI does not install this example's dependencies, does not pick it up.

## Limitations

`attach()` is marked experimental in 2.4.0 and may change in a minor release. Digest verification proves the
files a host reads are the files the server listed; it does not make the publisher trustworthy, so a host still
needs its own approval step before loading a skill. The in-memory transport stands in for stdio or Streamable
HTTP; caching fields (`ttlMs`, `cacheScope`) are documented for 2026-07-28 connections and were not present on
this in-memory connection.
