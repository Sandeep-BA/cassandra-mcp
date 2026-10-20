# Loopback Host and Origin guard

**Author: Sandeep Belgavi**

A small, dependency-free Node.js example for anyone who runs an HTTP server on loopback: a
local agent dev UI, an A2A endpoint, or an MCP server using the Streamable HTTP transport. It
accompanies *DNS Rebinding Against Local Agent and MCP Servers: Host and Origin Checks on Every
Route and What ADK Go 2.6.0 Changed* on aicassindra.com.

The Cassandra MCP server in this repository uses stdio and opens no HTTP listener, so it does not
need this guard. The example exists because the same machines that run it often run local HTTP
agent servers that do.

- `guard.js` builds a checker that allows a request only if its `Host` is an exact loopback name
  with the server's port (or the host of an explicitly allowed origin), and its `Origin`, when
  present, is an exact loopback origin or an allowed origin. `Origin: null` is refused.
- `guarded()` wraps a request handler so refused requests get 403 with a JSON-RPC style error
  body before any route runs, as the MCP Streamable HTTP transport requires for an invalid Origin.
- `server.js` is a three-route demo server (`/health`, `GET /api/sessions`, `POST /api/run`) bound
  to 127.0.0.1. It holds no data and calls no model.

## Prerequisites

- Node.js 22 or newer. Standard library only (`node:http`, `node:test`); nothing to install.
- No credentials. `.env.example` lists the two optional variables.

## Commands

From the repository root:

```sh
node --test examples/localhost-http-guard/guard.test.js
GUARD_PORT=8000 node examples/localhost-http-guard/server.js
```

With the server running, send the requests a browser would send:

```sh
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8000/health
curl -s -o /dev/null -w "%{http_code}\n" -H "Host: rebind.attacker.example:8000" http://127.0.0.1:8000/health
curl -s -o /dev/null -w "%{http_code}\n" -H "Origin: https://evil.example" -X POST http://127.0.0.1:8000/api/run
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://127.0.0.1:8000/api/run
```

Expected output: `200`, `403`, `403`, `202`. The second request is what a DNS-rebinding page
sends after its name resolves to 127.0.0.1: a same-origin GET with an attacker Host and usually no
Origin header. The third is an ordinary cross-site POST with a loopback Host and a foreign Origin.
`npm test` also runs these tests together with the repository's own suite.

## Tests

`guard.test.js` (10 tests) covers every row of the article's table (developer UI, rebinding GET,
rebinding POST, cross-site POST, curl), substring and suffix tricks such as
`localhost.attacker.example`, a missing Host, `Origin: null`, explicitly allowed origins,
invalid configuration, and an end-to-end run proving that `/health` is guarded as well as the API.

## Limitations

- The guard is not authentication. Anything that can take actions should also require a token or
  use a Unix socket or named pipe.
- It assumes the server is reached directly. Behind a reverse proxy or tunnel, add the proxy's
  public origin with `GUARD_ALLOWED_ORIGINS`, and make sure the proxy forwards the original Host.
- It does not defend against software already running on the machine, such as a malicious
  package or browser extension.
- Binding to 0.0.0.0, for example inside a container with a published port, removes the loopback
  assumption; this example always binds to 127.0.0.1.
