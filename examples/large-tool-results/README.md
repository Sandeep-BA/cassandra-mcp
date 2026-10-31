# Large MCP tool results: narrowing, a summary page, a resource link and a byte budget

**Author: Sandeep Belgavi**

A dependency-free Node.js companion to *Large MCP Tool Results: Size Budgets, Resource Links, Structured
Content and Server-Side Narrowing* on aicassindra.com. A `search_returns` tool for Belgavi's Book Store
would return 4,000 synthetic returns. The example builds the naive result (every row as `structuredContent`
and again as the backwards-compatible text copy) and a shaped result: server-side filters, totals, a page of
20 rows sorted by amount, the tool's own continuation argument, and a `resource_link` to the full export.

Result shapes follow the Model Context Protocol specification revision 2026-07-28 (`server/tools`). MCP's
`nextCursor` pagination is defined for list operations such as `tools/list`, so the continuation here is a
tool argument (`after`) that carries a digest of the filtered set and is refused for a different query.

**No MCP client, server transport, model or network is used.** The functions return plain objects.

## Prerequisites

- Node.js 22 or newer. Standard library only (`node:crypto`, `node:test`); nothing to install.
- No credentials. `.env.example` documents that nothing is read from the environment.

## Commands

From the repository root:

```
node examples/large-tool-results/results.js
node --test examples/large-tool-results/results.test.js
```

## Expected output

```
{"rows":4000,"naive_bytes":1316238,"shaped_bytes":4636,"total":4000,"page":20}
```

Five tests pass: the naive result is more than twice the size of its structured object, the shaped result
keeps the text copy and `structuredContent` identical and fits an 8,000-byte budget, following `after` to
the end returns every pending return exactly once, a cursor from another query and an unbounded `limit` are
refused, and a smaller budget is enforced with a tool error.

## Limitations

Byte counts are not token counts; measure with your provider's token counter before setting a budget. The
export URI is illustrative: a real server must implement `resources/read` for it with the same authorisation
as the tool, scope it to the caller and let it expire. Clients decide how to use annotations such as
`audience`, so test with the clients you support.
