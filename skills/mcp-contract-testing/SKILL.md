---
name: mcp-contract-testing
description: Test MCP server boundaries and cross-language protocol behavior in the Cassandra MCP repository, including rejected calls and secret-safe output.
metadata:
  author: Sandeep Belgavi
---

# Test the MCP contract

Author: Sandeep Belgavi

Use the documented build and test commands for the changed implementations, then `node scripts/check_transports.mjs` for the real executable handshake checks. Test database policy against controlled fixtures; do not run mutation probes against a user's live cluster without authorization.

Evidence should cover authorization before database access, exact composite keys, parameter binding, selected-column validation, row limits, concurrency, oversized output, rate limits and redacted failures. Test malformed arguments through an MCP client as well as the service method: SDK validation can differ by language.

Separate fixture tests, real transport tests, live database checks and hosted CI results in your report. If a change only affects one language, run its unit tests and the shared protocol contract; broader testing is warranted when shared semantics change. A successful tool list does not prove queries work. Keep stdout exclusively for JSON-RPC while running servers.
