# Long-running MCP tool calls with the Tasks extension

**Author: Sandeep Belgavi**

A runnable companion to *Long-Running MCP Tool Calls With the Tasks Extension: Handles, Polling and
Cancellation* (aicassindra.com, MCP). A fictional Belgavi's Book Store tool re-prices a publisher's backlist.
`Receiver` returns a task handle (`resultType: "task"`) to clients that declare the
`io.modelcontextprotocol/tasks` extension, and answers `tasks/get`, `tasks/update` and `tasks/cancel`.
`callToolDurably` is the agent-host side: it journals the task id before polling, honours `pollIntervalMs`,
answers `input_required`, resumes after a restart without calling the tool again, and reports a task that
disappears after its TTL as an unknown outcome.

Shapes follow the ext-tasks v2 schema in
[modelcontextprotocol/ext-tasks](https://github.com/modelcontextprotocol/ext-tasks) (Apache-2.0). No SDK code is
copied. **No MCP SDK, network or model is used**: the receiver runs in memory with simulated time.

## Prerequisites

- Node.js 22 or newer. Standard library only (`node:test`, `node:assert`); nothing to install.
- No API key. `.env.example` documents that nothing is read from the environment.

## Commands

```
node --test examples/mcp-tasks-durable-client/tasks.test.js
```

## Expected output

Seven passing tests:

1. A task-capable client polls every 2,000 ms, answers the confirmation and receives the result in the shape a
   synchronous call would return (3,120 titles re-priced). The server runs the tool once.
2. After a simulated host restart, the journaled task id is resumed. The server still counts exactly one run.
3. A client that does not declare the extension gets a synchronous result. A client that does gets `taskId`,
   `status`, `createdAt`, `lastUpdatedAt`, `ttlMs` and `pollIntervalMs`.
4. Cancellation is acknowledged with an empty result and takes effect at the next unit of work. Three of ten
   units had already been applied.
5. Another owner sees an unknown task and cannot cancel it.
6. A task whose TTL elapses during a long wait is reported as `unknown`, not `failed`.
7. A declined confirmation fails the task with a JSON-RPC error (-32603).

## Limitations

This is not a conforming MCP server or client. There is no transport, `server/discover`, JSON-RPC framing,
`notifications/tasks` or subscription. Persistence is a JavaScript `Map` standing in for a durable store, and
the worker is driven by the polling loop. Use it to test the host-side rules the article describes, then check
against an SDK that implements the extension and against your client's support.
