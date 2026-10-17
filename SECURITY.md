# Security policy

Author: Sandeep Belgavi

This is a preview. No external penetration test or live Cassandra compatibility certification has been completed.

Report vulnerabilities through this repository's private GitHub vulnerability reporting feature when enabled. If unavailable, open an issue asking for a private reporting channel without exploit details or sensitive data. Do not upload credentials, client configuration, connection bundles or database records to issues.

Use a SELECT-only database role, exact table allowlists, TLS with certificate verification and a trusted local MCP client. Treat returned content as untrusted. Version 0.1.x receives fixes as capacity permits; no response-time SLA is offered.

See README for the threat boundary, resource-limit caveats and unsupported deployment modes.
