# penpot-mcp skill

> AI-agent skill for creating, auditing, and maintaining production-grade design projects and design systems in [Penpot](https://penpot.app) via the official [Penpot MCP Server](https://help.penpot.app/mcp/).

## What this skill covers

- **Remote & local MCP setup** — accurate, up-to-date config for Claude Code, Cursor, and VS Code (including the hosted Remote MCP path most users should use)
- **All 5 MCP tools** — `execute_code`, `high_level_overview`, `penpot_api_info`, `export_shape`, `import_image`
- **Penpot JS API patterns** — `penpotUtils` reference, critical read-only property gotchas, flex ordering quirks, board positioning, CSS export, design system discovery
- **Token-aware prompting** — RULESET block, 3-tier token hierarchy, compact schema style
- **Design system workflows** — build from scratch, full audit, token migration, component library management, palette updates
- **Design-to-code workflows** — page→HTML/CSS, design→React, token extraction, Style Dictionary config, component mapping, layout extraction, asset export, drift detection
- **Design file best practices** — layer naming, component organization, spacing, accessibility, handoff conventions
- **Component checklists** — buttons, forms, navigation, cards, and a full pre-handoff review checklist

## Install

**Via npx (Claude Code / Codex CLI):**
```bash
npx skills add ar27111994/penpot-mcp
```

**Via gh CLI:**
```bash
gh skills install ar27111994/penpot-mcp
```

**Manually:** Copy the `penpot-mcp/` folder into your `.github/skills/` directory (or wherever your agent discovers skills).

## File structure

```
penpot-mcp/
├── SKILL.md                              ← Always-loaded core (300 lines)
└── references/
    ├── penpot-api-patterns.md            ← JS API, gotchas, defaults, checklists
    ├── design-system-workflows.md        ← Build, audit, migrate, manage
    └── design-to-code-workflows.md       ← HTML/CSS, React, tokens, assets
```

`SKILL.md` is light enough to always stay in context. Reference files are loaded on demand for the relevant task.

## Status vs. other Penpot skills

This skill was built directly from the [official Penpot MCP documentation](https://help.penpot.app/mcp/) and cross-referenced against the [`github/awesome-copilot` penpot-uiux-design skill](https://github.com/github/awesome-copilot/tree/main/skills/penpot-uiux-design).

Key differences:
- ✅ Covers **Remote MCP** (the now-recommended hosted path) — the awesome-copilot skill predates this
- ✅ Uses `npx @penpot/mcp@stable` for local setup — not the outdated `git clone` approach
- ✅ Correct VS Code endpoint (`/mcp` not `/sse`)
- ✅ Full JS API reference + gotchas merged from awesome-copilot's execution-layer content

## Contributing

PRs welcome — especially for new workflow recipes, additional platform templates, or corrections as the Penpot MCP API evolves.

## License

MIT
