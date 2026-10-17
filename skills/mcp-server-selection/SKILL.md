---
name: mcp-server-selection
description: Choose MCP servers from this repository's researched catalog using task fit, upstream status, permissions, and deployment constraints.
metadata:
  author: Sandeep Belgavi
---

# Select an MCP server

Author: Sandeep Belgavi

Read `catalog/servers.json` from the cloned repository. Its ranking is only within a curated selection; stars measure repository attention, not security or compatibility. Suite entries represent multiple servers.

Match the user's concrete task to a small shortlist. For each candidate, open its linked upstream README and inspect the current installation, transport, authentication requirements, license, and write-capable tools. Report whether you checked documentation or actually executed the server. Do not copy another project's commands or infer package names from repository names.

Prefer the narrowest scopes and resource access that accomplish the task. For a database, distinguish schema inspection from arbitrary queries and mutations. For browser, filesystem, messaging and infrastructure servers, explain the relevant effect boundary. The catalog itself never authorizes installing packages or connecting accounts.

Return source links, fit, limitations, and the next concrete verification step. If upstream evidence conflicts with the snapshot, use current evidence and flag the stale record. Refresh the catalog with `python scripts/refresh_catalog.py` only when updating this repository is requested; it performs read-only GitHub checks and fails without overwriting the catalog if checks fail.
