---
name: cassandra-readonly-setup
description: Configure and troubleshoot the Node, Python, or Java Cassandra MCP implementations in this repository with bounded read-only access.
metadata:
  author: Sandeep Belgavi
---

# Configure Cassandra MCP

Author: Sandeep Belgavi

Read the repository README and the selected implementation README. All implementations expose `list_tables`, `describe_table`, and `read_partition` over stdio; they are not HTTP services. Node requires Node 22+, Python uses its isolated environment, and Java runs the built executable JAR.

Use the requested runtime; do not silently install a different language. Configure exact lowercase `CASSANDRA_TABLES` entries and a dedicated database role with only necessary SELECT permissions. TLS verification is required outside loopback. Keep credentials outside shared files, commands, logs and screenshots. A table allowlist permits reading its rows across tenants; it is not per-user authorization.

Verify discovery first with no database read, then schema discovery and a one-row read from an authorized non-sensitive fixture. A passing protocol test does not establish live database compatibility. Use all partition-key fields and explicit columns. Large rows may consume memory before the output cap is applied.

When diagnosis fails, record runtime version, sanitized settings, expected result and error category. Do not weaken TLS, add wildcard permissions or substitute a superuser to make a test pass. Make at most one retry after a concrete correction; otherwise report the missing prerequisite.
