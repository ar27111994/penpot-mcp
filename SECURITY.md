# Security Policy

## Supported versions

This repository tracks the current public `main` branch and the latest packaged skill version. Security fixes should target `main` unless maintainers explicitly note otherwise.

## Reporting a vulnerability

Please report suspected vulnerabilities through GitHub Security Advisories when available for this repository. If advisories are unavailable, open a minimal GitHub issue that avoids sensitive details and ask for a private disclosure path.

Do not post secrets, private MCP keys, Penpot file contents, workspace URLs, or exploit details in public issues.

## Scope

In scope:

- Unsafe instructions that could cause agents to expose MCP keys or private file data.
- Documentation that encourages unreviewed destructive writes to Penpot files.
- Packaging mistakes that publish local workspace files, secrets, or generated artifacts.
- Validation gaps that allow malformed skill metadata or dangerous examples.

Out of scope:

- Vulnerabilities in Penpot, the official Penpot MCP Server, MCP clients, or third-party community plugins. Report those to their respective maintainers.
- Issues requiring access to private Penpot files unless a minimal reproducible example is provided.

## Security expectations for contributors

- Never commit real MCP keys, access tokens, cookies, private URLs, or customer/project data.
- Keep examples generic and deterministic.
- Treat Remote MCP URLs containing `userToken=` as secrets.
- Prefer read-only inspection before write guidance.
- Do not add instructions that browse, install, or run community plugins automatically unless a user explicitly asked for plugin discovery or installation.
