# 100 MCP projects to evaluate

Author: **Sandeep Belgavi**

This is a curated selection of 100 public, non-archived MCP server projects and server suites, ordered by GitHub stars **within the selection**. It is not an exhaustive global top-100 ranking. Repository stars are a popularity signal, not proof of safety, quality, licensing suitability or runtime compatibility. A suite's star count describes its entire repository.

The snapshot in [servers.json](servers.json) contains upstream source and README links, original short descriptions, categories, primary language, detected license, stars, last push and the README content SHA. Check `checkedAt` for the observation time; the timestamp is UTC. Descriptions summarize task fit and do not endorse upstream marketing claims. No catalog server was executed or connected to an account for this review.

## How selection and checks work

Candidates were gathered from GitHub search and upstream MCP integrations, then selected for distinct tasks across development, browsers, data, cloud, design, research and business workflows. SDK-only projects, general directories, missing repositories and archived entries were excluded. The list includes community integrations as well as vendor-owned projects; a vendor's name in a description does not establish official endorsement.

The refresh script checks each repository's public metadata and README for MCP evidence. Redirects are resolved and duplicate canonical repositories are rejected. All 100 checks must pass before a new snapshot replaces the previous one. This is a **link and metadata check**, not a source audit or installation test. A repository that passes can still contain insecure code, stale instructions or write-capable tools.

```sh
# Requires GitHub CLI authentication; read-only GitHub API calls
python scripts/refresh_catalog.py
python scripts/validate_catalog.py
```

Review [seeds.tsv](seeds.tsv) before changing selection. Refreshing does not silently substitute different projects when one disappears: it writes a check report and fails so a maintainer can review replacements. There is no paid hosted update service or claimed daily refresh job.

## Before installing a candidate

Open its upstream README and release history. Verify installation commands, package publisher, license, transport, credentials, tool permissions and operating-system support. Inspect whether it can write files, send messages, execute commands or modify infrastructure. Start with a sandbox and narrow credentials appropriate to the task. Do not connect all 100 projects to your assistant at once.

The catalog has no universal installer because these projects have different owners, setup requirements and effect boundaries. The [selection skill](../skills/mcp-server-selection/SKILL.md) helps make a small, evidence-based shortlist. Upstream projects retain their original authorship and licenses; no third-party source code is redistributed here.
