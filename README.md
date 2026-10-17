# Cassandra MCP

A small, read-only [Model Context Protocol](https://modelcontextprotocol.io/docs/learn/architecture) server for inspecting authorized Cassandra tables and reading bounded partitions from a local MCP client.

**Status: v0.1.0 preview, installed from source.** There is no npm release, hosted service, AI model or production certification. The earlier AICassindra page advertised an unavailable package; this repository supplies an actual implementation with explicit limits. Do not use the old `npx @belgavi/cassandra-mcp` command.

## Tools

| Tool | Purpose |
| --- | --- |
| `list_tables` | List the operator's exact `keyspace.table` allowlist; no database request |
| `describe_table` | Read column types, partition keys and clustering keys |
| `read_partition` | Select explicit columns using equality on every partition-key component |

No arbitrary CQL, writes, schema changes, filtering, search, remote HTTP listener or automatic pagination. Every tool uses MCP read-only annotations; the actual enforcement is in the service and database permissions.

## Install

Requires Node.js 22 or newer, npm, Git and a reachable Cassandra cluster. The implementation targets the Cassandra `system_schema.columns` layout used in modern Cassandra. A live version compatibility matrix has **not** been established.

```sh
git clone https://github.com/Sandeep-BA/cassandra-mcp.git
cd cassandra-mcp
git checkout v0.1.0
npm ci --ignore-scripts
npm test
```

The lockfile pins dependencies. No build step or install script is needed. `npm start` starts a stdio server: it waits for an MCP client, not browser traffic. Application logs go to stderr; stdout is reserved for MCP JSON-RPC.

## Database permissions first

Use a dedicated Cassandra role with `LOGIN = true`, `SUPERUSER = false`, and only `SELECT` on the exact tables you intend to expose. Have your DBA provision its password using your normal secret-management process. For an existing role named `mcp_reader` and table `demo.events`, an administrator can grant:

```sql
GRANT SELECT ON TABLE demo.events TO mcp_reader;
LIST ALL PERMISSIONS OF mcp_reader;
```

Verify inherited roles do not grant write or administrative permissions. Schema discovery needs access to `system_schema.columns` according to your cluster's authentication/authorization policy. Never use the default superuser or production-wide credentials. The table allowlist is an extra boundary, not a replacement for Cassandra authorization.

## Configure your MCP client

Use your client's stdio server configuration. Clients using the common `mcpServers` format can adapt this example; configuration-file locations differ by client. Replace every placeholder. On Windows, use forward slashes in JSON paths, for example `C:/tools/cassandra-mcp/src/cli.js`.

```json
{
  "mcpServers": {
    "cassandra-readonly": {
      "command": "node",
      "args": ["/absolute/path/cassandra-mcp/src/cli.js"],
      "env": {
        "CASSANDRA_CONTACT_POINTS": "db.example.com",
        "CASSANDRA_LOCAL_DATACENTER": "datacenter1",
        "CASSANDRA_USERNAME": "mcp_reader",
        "CASSANDRA_PASSWORD": "REPLACE_WITH_YOUR_SECRET",
        "CASSANDRA_TABLES": "demo.events",
        "CASSANDRA_TLS": "true"
      }
    }
  }
}
```

Prefer your client's supported secret injection mechanism over storing passwords in JSON. Never commit client configuration containing real credentials. Data returned by tools goes to the client and potentially its model provider; allow only data suitable for that destination. All columns of an allowed table are available for explicit selection; there is no per-column masking or user/tenant authentication. Use dedicated sanitized tables or views where necessary.

| Environment variable | Meaning |
| --- | --- |
| `CASSANDRA_TABLES` | Required comma-separated exact lowercase `keyspace.table` names; 1-50 tables; system tables prohibited |
| `CASSANDRA_USERNAME`, `CASSANDRA_PASSWORD` | Required dedicated database credentials |
| `CASSANDRA_CONTACT_POINTS` | Comma-separated hosts; default `127.0.0.1` |
| `CASSANDRA_LOCAL_DATACENTER` | Driver local datacenter; default `datacenter1` |
| `CASSANDRA_PORT` | Default `9042` |
| `CASSANDRA_TLS` | Default `true`; `false` permitted only for literal loopback hosts |
| `CASSANDRA_CA_FILE` | Optional PEM CA file; certificate verification remains enabled |

Local development against loopback can set `CASSANDRA_TLS=false`. Environment files are not automatically loaded. Secure connect bundles, client certificates and managed-service-specific authentication are not implemented.

## Example tool arguments

First inspect `describe_table` with `{"keyspace":"demo","table":"events"}`. If its partition key is `tenant`:

```json
{
  "keyspace": "demo",
  "table": "events",
  "partition": { "tenant": "demo-customer" },
  "columns": ["tenant", "id", "body"],
  "limit": 20
}
```

Values are prepared-statement parameters. A composite key requires every component. Primitive string, numeric and boolean input is accepted; driver-compatible encodings are needed for the column type. Complex partition-key types are not supported. Large integer precision must not be entrusted to JSON numbers; validate your type encoding against the live driver.

## Limits and security model

- One active tool request and 30 tool calls/minute per process, reset on restart. This is not an account-level quota.
- At most 100 rows, 32 projected columns and 64 KiB serialized response; default 20 rows. Oversized responses are withheld rather than silently truncated.
- Five-second driver connect/read timeouts and fallthrough retry policy. These are driver timeouts, not a guaranteed total wall-clock deadline or server-side cancellation.
- No next-page token. `possiblyMore` indicates that the configured limit was reached or a driver page remains; it is not an exact row count.
- Schema capped at 256 columns. Quoted keyspace/table names outside the lowercase configuration format are not supported.
- Audit events contain tool name, success/failure and elapsed time, never arguments, credentials or row contents. These stderr events are not durable tamper-proof auditing. Input-schema failures are handled by the SDK before the tool audit callback.
- The size check runs after Cassandra returns rows. Large cells can still use significant memory or network bandwidth. Expose bounded, sanitized datasets and use database/network resource controls.
- A model may interpret text in a database row as instructions. Treat it as untrusted data and keep host tool permissions narrow. Read-only access does not prevent data disclosure.

This is a local, single-operator stdio integration. Do not expose it as a multi-tenant service or remove database authorization based on the tool annotations.

## Validation

`npm test` covers configuration, allowlist enforcement, parameter binding, composite keys, projection validation, MCP initialization/discovery/calls, error redaction, response limits, concurrency, rate limiting, and spawning the actual stdio executable. Database operations in these tests use controlled fixtures. The stdio test exercises the real SDK and entrypoint but does not connect to Cassandra.

For your own live database, supply the connection settings above and these additional variables, then run `npm run test:live`:

```text
CASSANDRA_TEST_PARTITION={"tenant":"demo-customer"}
CASSANDRA_TEST_COLUMNS=tenant,id,body
```

Use shell-appropriate quoting to preserve JSON. This read-only check describes the first configured table and reads at most one row. It prints pass/fail, not returned data. It does not create fixtures or prove that your database role cannot write: verify that separately with the DBA. Live Cassandra validation was not available in the initial development environment; do it before adopting the preview.

## Troubleshooting

- **Startup failed:** check required environment variables, exact table names, TLS setting and CA path. Startup deliberately withholds raw error messages to avoid leaking secrets.
- **Database request failed:** check connectivity, local datacenter, role permissions, schema and value types. Server responses deliberately hide raw driver errors.
- **Not authorized:** add the intended table to the operator-controlled allowlist only after reviewing its data and database permissions.
- **No browser page:** expected; this transport is stdio only.
- **npm package not found:** install this tagged source release; no registry package has been published.

## Development and references

CI runs Node 22/24 tests and a dependency audit. A green local test result is not a claim that hosted CI or live database tests ran. Issues and contributions are welcome; include redacted reproduction steps, Node/Cassandra versions and expected behavior.

- [MCP SDK server documentation](https://ts.sdk.modelcontextprotocol.io/server)
- [Apache Cassandra Node.js driver](https://github.com/apache/cassandra-nodejs-driver)
- [Driver prepared queries and paging](https://docs.datastax.com/en/developer/nodejs-driver/latest/index.html)
- [Security policy](SECURITY.md)

MIT licensed. Not affiliated with the Apache Software Foundation or the MCP project.
