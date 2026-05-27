# penpot-mcp skill

[![GitHub Stars](https://img.shields.io/github/stars/ar27111994/penpot-mcp?style=flat&logo=github)](https://github.com/ar27111994/penpot-mcp/stargazers)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Agent Skills](https://img.shields.io/badge/npx_skills_add-ar27111994%2Fpenpot--mcp-8B5CF6)](https://github.com/ar27111994/penpot-mcp)
[![skills.sh](https://skills.sh/b/ar27111994/penpot-mcp)](https://skills.sh/ar27111994/penpot-mcp)
[![GitHub tag](https://img.shields.io/github/v/tag/ar27111994/penpot-mcp?sort=semver&logo=github)](https://github.com/ar27111994/penpot-mcp/tags)

> AI-agent skill for creating, auditing, and maintaining production-grade design projects and design systems — including flows, interactions, animations, and overlays — in [Penpot](https://penpot.app) via the official [Penpot MCP Server](https://help.penpot.app/mcp/).

## Compatible AI agents

Works with any MCP-compatible client: **Claude Code**, **Cursor**, **VS Code / Copilot**, **Codex / OpenCode**, **Amp**, **Cline**, **Windsurf**, **Claude Desktop** (via `mcp-remote`), and any agent supporting HTTP or SSE MCP transport.

## What this skill covers

- **Remote & local MCP setup** — up-to-date configs for all major MCP clients; Remote MCP recommended for most users
- **All 5 MCP tools** — `execute_code`, `high_level_overview`, `penpot_api_info`, `export_shape`, `import_image`
- **Penpot JS API patterns** — `penpotUtils` reference, read-only property gotchas, flex ordering quirks, board positioning, CSS export, plugin data API
- **Font & typography constraints** — installed variant detection, library vs. layer fontSize types, stale `fontId` limitation
- **Write safety rules** — batch size limits (~10 ops/call), page-switch two-call pattern, structural verification over export
- **Interactions & animations** — full `addInteraction` API, all triggers (`click`, `mouse-enter`, `mouse-leave`, `after-delay`), all actions (`navigate-to`, `open-overlay`, `toggle-overlay`, `close-overlay`, `previous-screen`, `open-url`), all animations (`Dissolve`, `Slide`, `Push`) with easing options
- **Prototyping workflows** — linear flows, overlays/modals, drawers, multi-flow prototypes, interaction audit, lo-fi→hi-fi progression, animation selection guide
- **Token-aware prompting** — RULESET block, 3-tier token hierarchy, compact schema style
- **Design system workflows** — build from scratch, full audit, token migration, component library management, palette updates
- **Design-to-code workflows** — page→HTML/CSS, design→React, token extraction, Style Dictionary config, component mapping, layout extraction, asset export, drift detection
- **Design file best practices** — layer naming, component organization, spacing, accessibility, handoff conventions
- **Component checklists** — buttons, forms, navigation, cards, prototype coverage, pre-handoff review

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

```text
penpot-mcp/
├── SKILL.md                                ← Always-loaded core (~340 lines)
└── references/
    ├── penpot-api-patterns.md              ← JS API, gotchas, fonts, interactions, animations
    ├── prototyping-workflows.md            ← Flows, overlays, audit, lo-fi→hi-fi
    ├── design-system-workflows.md          ← Build, audit, migrate, manage
    └── design-to-code-workflows.md         ← HTML/CSS, React, tokens, assets
```

`SKILL.md` is light enough to always stay in context. Reference files are loaded on demand for the relevant task.

## Status vs. other Penpot skills

Built directly from the [official Penpot MCP documentation](https://help.penpot.app/mcp/) and plugin API docs at [doc.plugins.penpot.app](https://doc.plugins.penpot.app), cross-referenced against the [`github/awesome-copilot` penpot-uiux-design skill](https://github.com/github/awesome-copilot/tree/main/skills/penpot-uiux-design) and battle-tested in production.

Key differences:

- ✅ Covers **Remote MCP** and all major MCP client configs (Cursor, Claude Code, VS Code, Codex, Claude Desktop)
- ✅ `npx @penpot/mcp@stable` — not the outdated `git clone` approach
- ✅ Correct VS Code config key (`mcp.servers`, not `mcpServers`)
- ✅ Full **interactions & animations** API (`addInteraction`, all triggers/actions/animations)
- ✅ **Font/typography constraints** from real-world production use
- ✅ **Write safety**: batch limits, page-switch two-call pattern, export reliability gotcha
- ✅ **Prototyping workflows**: flows, overlays, multi-flow, animation guide
- ✅ Compatible with **all MCP-compatible agents**, not just Claude Code or Cursor

## Contributing

PRs welcome — especially for new workflow recipes, additional platform templates, or corrections as the Penpot MCP API evolves. See [Penpot community thread](https://community.penpot.app/t/penpot-mcp-skill/10599).

## License

MIT

