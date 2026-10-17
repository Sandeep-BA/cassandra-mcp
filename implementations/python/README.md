# Python Cassandra MCP

Author: **Sandeep Belgavi**

Same three read-only tools as the Node implementation, using the official Python MCP SDK (pinned v1.30.0 API) and Cassandra Python driver 3.30.1. This pin is intentional; it is not a claim to use the newest SDK major version.

From the repository root, Python 3.11 or 3.12:

```sh
python -m venv implementations/python/.venv
# POSIX; on Windows use implementations/python/.venv/Scripts/python.exe
implementations/python/.venv/bin/python -m pip install -e 'implementations/python[test]'
implementations/python/.venv/bin/python -m pytest implementations/python/tests
```

Use your MCP client's stdio configuration with `command` set to the **absolute virtual-environment Python path**, and `args` set to `["-m", "cassandra_mcp.server"]`. Use the same `CASSANDRA_*` environment settings documented in the [root README](../../README.md). No shell activation is necessary when the client launches the absolute interpreter path.

Supported partition-key values: text/varchar/ascii strings; integer types (strings recommended for large values); UUID/timeuuid strings; booleans; finite float/double numbers. Collections, user-defined types, dates, timestamps and blob partition keys are not supported. Non-JSON result values are rendered as strings; this is an inspection interface, not a lossless data export.

The service requires complete partition keys, explicit columns, a SELECT-only role and exact table allowlists. It never fetches another result page automatically. Limits: 100 rows, 32 columns, 64 KiB output, one active request, 30 admitted requests per minute. Five-second driver connection/query timeouts are not a guaranteed end-to-end deadline. Large Cassandra cells may allocate memory before the response cap.

Tests use synthetic database fixtures. `scripts/check_transports.mjs` launches the real Python process and checks MCP discovery, calls and denials without a live cluster. Use the shared live-check instructions before deploying against your data. No hosted HTTP or multi-tenant authentication is implemented.
