# Contributing

Thanks for improving `penpot-mcp`. This repository packages an AI-agent skill for Penpot MCP workflows; it is primarily Markdown documentation, examples, and validation scripts.

## What to contribute

Good contributions include:

- Corrections to Penpot MCP setup or client configuration.
- Safer or clearer `execute_code` examples.
- New workflow recipes for design systems, prototyping, accessibility, handoff, or design-to-code.
- Updates when the official Penpot MCP Server or Penpot Plugin API changes.
- Packaging, validation, or documentation quality improvements.

Please keep examples generic and community-useful. Do not add private project details, unsupported Penpot behavior, or promotional copy.

## Core invariants

When changing skill docs or examples, preserve these rules:

- Inspect first with `penpot_api_info` or `high_level_overview`; only guide setup when connection checks fail.
- Follow READ -> PLAN -> WRITE -> VERIFY for Penpot modifications.
- Keep `execute_code` writes small, usually 5-10 shape operations per call.
- Never switch pages and write in the same `execute_code` call.
- Verify structurally through the Penpot API; treat `export_shape` as best-effort.
- Use `resize()` for shape size, `penpotUtils.setParentXY()` for parented coordinates, and `insertChild()` for z-order.
- Guard nullable `penpot.createText(...)` results and reset text `growType` after resize.
- Query installed font variants before applying font weights.
- Use deterministic, idempotent check-before-create patterns.
- Do not assume MCP can enumerate, install, launch, or drive arbitrary community plugins.

## Local workflow

1. Create a focused branch from `main`.
2. Make the smallest clear change.
3. Keep `README.md`, `package.json`, `penpot-mcp/SKILL.md`, and references aligned when changing public scope or metadata.
4. Run validation before opening a PR:

```bash
npm ci
npm run validate
npm run format:check
npm run lint
npm run check:whitespace
npm pack --dry-run
```

If a gate cannot run, explain why in the PR.

## Pull requests

A good PR includes:

- A short summary of what changed.
- The reason for the change and any source documentation used.
- Validation commands and results.
- Notes about any risky, uncertain, or intentionally conservative guidance.

For JavaScript snippets intended for `execute_code`, check them against `penpot-mcp/references/penpot-api-patterns.md` before submitting.
