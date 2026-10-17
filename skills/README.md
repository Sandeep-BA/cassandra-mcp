# Reusable MCP skills

Author: **Sandeep Belgavi**

Three portable `SKILL.md` folders are included:

- [mcp-server-selection](mcp-server-selection/SKILL.md): shortlist catalog servers and verify upstream requirements.
- [cassandra-readonly-setup](cassandra-readonly-setup/SKILL.md): configure and diagnose this repository's three runtimes.
- [mcp-contract-testing](mcp-contract-testing/SKILL.md): test protocol and permission boundaries without confusing fixtures with live evidence.

Clone the repository, then copy the selected skill folder into your agent application's documented skill directory. For Codex, the default user directory is `~/.codex/skills/`. Other clients have different locations and may not support this format. These skills refer to the cloned repository's files, so give your agent the clone path when invoking them.

Skills are instructions, not MCP servers or executable plugins. Installing one does not install its referenced software, authenticate accounts or grant permission for external effects. There are no embedded API keys or automatic network operations. Existing user instructions and authorization remain in force.

The skill frontmatter and folder structure were validated using the skill-creator validator. This checks packaging, not the correctness of every future model action.
