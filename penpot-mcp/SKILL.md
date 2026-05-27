---
name: penpot-mcp
description: >
  Use this skill whenever the user wants to use AI agents to work with Penpot design files via
  the Penpot MCP Server. Triggers include: any mention of Penpot, design files, design systems,
  design tokens, Penpot MCP, design-to-code, generating UI from design, auditing a design system,
  creating components/variants, renaming layers, exporting assets from Penpot, adding flows,
  interactions, animations, overlays, or prototyping in Penpot, or prompting an AI agent to
  read/modify a Penpot file. Also triggers when the user wants to set up Penpot MCP, connect
  any MCP-compatible AI agent or IDE to Penpot, or produce production-ready HTML/CSS/React from
  a Penpot design. Use this skill for ALL Penpot-agent workflows — design, code, audit,
  prototyping, or setup.
---

# Penpot MCP Skill

AI-agent workflows for creating, auditing, and maintaining production-grade design projects and design systems — including flows, interactions, animations, tokens, and visual effects — in Penpot via the official MCP Server.

## Compatible AI Agents

Works with any MCP-compatible client: **Claude Code**, **Cursor**, **VS Code / Copilot**, **Codex / OpenCode**, **Amp**, **Cline**, **Windsurf**, **Claude Desktop** (via `mcp-remote`), and any agent supporting HTTP or SSE MCP transport.

---

## Architecture Overview

```
MCP Client (any MCP-compatible agent / IDE)
      ↕  HTTP  (or stdio via mcp-remote proxy)
MCP Server (hosted remote OR local npx)
      ↕  WebSocket / plugin bridge
Penpot Plugin (running inside the open design file)
```

MCP **always acts on the currently focused page** in the active Penpot browser tab. Only one tab can own MCP at a time.

MCP runs through the Penpot MCP plugin. It does **not** provide a documented way to enumerate, install, launch, or drive arbitrary installed community plugins. Coordinate with other plugins only when the user explicitly asks or when file-visible evidence makes a plugin relevant.

---

## 1. Connection Setup

### Remote MCP (recommended for most users)

1. Penpot → **Your account → Integrations → MCP Server** → enable
2. Generate MCP key (shown once — store safely; only one key per user at a time)
3. Copy server URL: `https://<your-penpot-domain>/mcp/stream?userToken=YOUR_MCP_KEY`
4. Add to your MCP client config (see snippets below)
5. Open a design file → **File → MCP Server → Connect**

### Local MCP (advanced; extra file-system access)

```bash
npx @penpot/mcp@stable   # keep running; matches current Penpot release
npx @penpot/mcp@beta     # for beta/test environments
```

- Load plugin: **Plugins → Load from URL** → `http://localhost:4400/manifest.json`
- Click **Connect to MCP server** in plugin UI → keep plugin window open at all times
- Client URL: `http://localhost:4401/mcp` (no auth)
- Legacy SSE fallback: `http://localhost:4401/sse`

### Client Config Snippets

**Claude Code** (`.claude/settings.json`):

```json
{
  "mcpServers": {
    "penpot": { "transport": "http", "url": "REMOTE_OR_LOCAL_URL" }
  }
}
```

**Cursor**:

```json
{ "mcpServers": { "penpot": { "url": "REMOTE_OR_LOCAL_URL", "type": "http" } } }
```

**VS Code / Copilot** (`settings.json`):

```json
{
  "mcp.servers": {
    "penpot": { "transport": "http", "url": "REMOTE_OR_LOCAL_URL" }
  }
}
```

**Codex / OpenCode**:

```json
{
  "servers": {
    "penpot": { "url": "REMOTE_OR_LOCAL_URL", "transport": { "type": "http" } }
  }
}
```

**Claude Desktop** (stdio-only — requires proxy):

```bash
npx -y mcp-remote http://localhost:4401/mcp --allow-http
```

### Troubleshooting Checklist

- Restart MCP server process
- Reconnect plugin (**File → MCP Server → Connect**)
- Restart MCP client / reload tools
- Keep plugin window open while agents run at all times
- Firefox preferred if Chromium blocks `localhost` from `https://design.penpot.app`
- Expired MCP key → regenerate in Penpot → Integrations; update all client configs

---

## 2. Available MCP Tools

| Tool                  | Mode       | Description                                                         |
| --------------------- | ---------- | ------------------------------------------------------------------- |
| `high_level_overview` | Both       | Read overall file structure, pages, layers, components              |
| `penpot_api_info`     | Both       | Query Penpot plugin API documentation                               |
| `execute_code`        | Both       | Run JavaScript in Penpot plugin context — primary read/write tool   |
| `export_shape`        | Both       | Export shape as PNG/SVG (remote: limited; may fail with HTTP error) |
| `import_image`        | Local only | Import image from local file path into design                       |

> Remote MCP cannot import images from local paths. `export_shape` may fail with HTTP errors — always verify structurally via API rather than relying on export success.

### Check connection first (always)

Before any setup steps, **call `penpot_api_info` or `high_level_overview` first**. If it succeeds, skip setup entirely.

### Community plugin guardrails

- Do not assume MCP can read the user's installed plugin list or invoke another plugin's UI/API.
- Prefer MCP-native reads/writes for normal design, prototyping, token, and export tasks.
- If a community plugin could materially help, first look for file-visible evidence: generated layers, library assets, comments, or namespaced shared plugin data.
- If the user provides an installed-plugin inventory, treat it as user-provided context and select a plugin only when the task clearly maps to that plugin's stated capability.
- Ask for user confirmation before using or relying on any community plugin. If it has its own UI, ask the user to run it manually, then re-inspect the file.
- Never use a plugin marketplace/browser plugin such as **Plugins list** unless the user explicitly asks to browse, search, discover, or install plugins. Do not search/install plugins automatically for routine tasks.

### JavaScript API

`execute_code` runs JS against the Penpot plugin API. **Read `references/penpot-api-patterns.md` before any `execute_code` calls.** It covers the full API including tokens, library creation, page management, visual effects, storage, and idempotency helpers.

---

## 3. Safety-First Workflow (ALWAYS follow this order)

```
1. READ   → Inspect, list, analyze (never skip)
2. PLAN   → Describe intended changes BEFORE applying
3. WRITE  → Small atomic batches; one logical unit per call
4. VERIFY → Structural read after each write batch (not export-based)
```

**Write call limits — enforce strictly:**

- Max ~5–10 shape operations per `execute_code` call
- Pause and verify between batches
- Never "build everything" in one call — MCP writes time out on large batches, leaving partial updates with no error indication

**Page switching — mandatory two-call pattern:**

```text
Call N:   penpot.openPage(page)    ← switch page
Call N+1: write/read on that page  ← write after switch
```

Page switching is asynchronous in the plugin bridge. Writing in the same call as `openPage` applies changes to the _previously_ active page. Exception: calling `openPage` at the top of a call then immediately reading (not writing) can be reliable.

**Use `storage` for large workflows:**

```javascript
// Call 1: compute and store your design token data
storage.tokenData = { colors: { primary: '#HEX' }, spacing: 8, ... };
// Call 2+: retrieve from storage instead of recomputing
const fallback = { colors: {}, spacing: 8 }; // safe default if session reset
const DS = storage.tokenData || fallback;
```

**Starter prompts (always run first after connecting):**

```
"List all pages in this file."
"Show all components on this page."
"Analyze the design structure and summarize the token system."
```

---

## 4. Role & Prompt Engineering

### Define the agent role precisely

```
BAD:  "You are a creative designer."
GOOD: "You are a Senior Product Designer expert in design systems, WCAG accessibility,
       Penpot plugin API constraints, and Penpot-to-code workflows. You do not make
       product decisions without data. You never invent tokens, colors, or components
       not present in the file. You always work in small reversible batches."
```

### Structured Brief Template

```
CONTEXT: [product name, target user, current state of file]
GOAL: [specific problem — e.g., "build design token system and foundations page"]
INPUTS: [page names, board names, component names, token paths, brand colors]
CONSTRAINTS:
  - Max ~10 shape operations per execute_code call
  - Always use idempotency helpers (ensureColor, ensureTypography, etc.)
  - Never switch page and write in the same call
  - Never invent font weights not confirmed installed for this family
  - Verify structurally after each batch — do not rely on export_shape
  - Store shared data in storage global for cross-call access
QUALITY CRITERIA: [how you'll know it's done]
```

### Negatives (always include)

- "Do not invent colors not in the token set."
- "Do not use font weights not confirmed installed for this font family."
- "Do not switch page and write in the same execute_code call."
- "Do not rely on export_shape for verification — use structural API checks."
- "Do not create duplicate colors/typographies — always check before creating."

### Iteration pattern

```
1. Discovery  → read all pages, library assets, tokens, existing components
2. Proposal   → describe planned structure, wait for approval
3. Foundation → build token sets + themes + colors + typographies (batched)
4. Structure  → create pages (all in one call), then build boards per page (separate calls)
5. Components → register library components from source boards
6. Verify     → structural checklist — count colors, typographies, components, token sets
```

---

## 5. Token-Aware Prompting

### Global RULESET block (prepend to every design-system prompt)

```
GLOBAL RULESET
- SOURCE: Penpot MCP only
- NO_GUESSING: true
- IF_MISSING: mark as TODO
- PREFER: structured data > prose
- OUTPUT: deterministic, stable ordering
- BATCH_LIMIT: ~10 ops per execute_code call
- PAGE_SWITCH: separate call from writes
- IDEMPOTENCY: always check-before-create
- STORAGE: use storage global for cross-call data
SIZE CONSTRAINTS
- design-system.json: tokens + mappings only
- components.catalog.json: real components only
- layout-and-rules.md: max ~300 lines
STYLE
- Use schemas, key:value, compact bullets
- No narrative explanations
```

### Token hierarchy

```text
Tier 1 (Global):    color.base.neutral.100, spacing.base.8
Tier 2 (Semantic):  color.bg.default, color.text.primary
Tier 3 (Component): color.button.primary.bg
```

Reference tokens can be other tokens: `'{color.base.neutral.100}'` — use curly brace syntax.

---

## 6. Workflow Recipes

Read the relevant reference before starting:

- **Full API, tokens, page management, storage, visual effects** → `references/penpot-api-patterns.md` _(mandatory before any `execute_code` calls)_
- **Design system creation/audit** → `references/design-system-workflows.md`
- **Design-to-code generation** → `references/design-to-code-workflows.md`
- **Prototyping: flows, interactions, animations** → `references/prototyping-workflows.md`

### Quick reference: Common task prompts

**Design system from scratch:**

```
"Read all existing pages, colors, typographies, and token sets in this file."

"Build the token system: create token sets [base, theme-light, theme-dark],
populate with [color palette] + spacing (8px grid) + border radii + motion tokens.
Use addToken idempotency. Store DS object in storage. Max 15 tokens per call."

"Create library colors from the base token set.
Use ensureColor pattern. 5 colors per call, pause after each batch."

"Create typographies for the scale: [paste scale].
Use ensureTypography. Check installed font variants first."
```

**Multi-page design system:**

```
"Create pages: [Page1], [Page2], [Page3] — all in one call (list all pages to create).
Then report the current page list before doing anything else."

"Switch to page [PageName]. Confirm currentPage before writing."

"Build the [BoardName] board on the current [PageName] page.
Max 8 shapes per call. Pause after."
```

**Prototyping tasks:**

```
"List all boards on this page and their existing interactions."

"Create a prototype flow entry for '/flows/onboarding-start' using Page.createFlow."

"Add click→navigate interactions from [BoardA] to [BoardB] with Dissolve 300ms."

"Audit all interactions: list broken destinations and prototype coverage percentage."
```

**Visual effects:**

```
"Apply a backdrop blur effect to the [BoardName] overlay:
[N]px layer-blur, [N]px borderRadius, semi-transparent surface fill,
and a drop shadow. Describe the values you'll use before applying."

"Add linear gradient fill to [ShapeName]: brand primary → transparent, top to bottom."
```

---

## 7. Design File Best Practices

### File & page structure

- Choose one page organisation strategy:
  - **Domain-based**: e.g. `Foundations`, `Mobile`, `Desktop`
  - **Atomic-level**: e.g. `Tokens`, `Primitives`, `Components`, `Patterns`
- Canvas: wireframes left → final design right
- Every board has a clear purpose and visual entry point

### Layer naming

- Function-based: `background`, `icon-close`, `label-primary` ✅
- Not appearance-based: `rectangle-23`, `blue-box` ❌
- Hierarchy with `/`: `component/card/default`, `overlay/confirm-delete`

### Components

- Naming: `mobile/card/default`, `mobile/nav-bar`
- Register from source shapes via `createComponent([shapes])`
- Clone source shape first if it's already placed on a page

### Spacing & layout

- Base unit: 8px. All margins/paddings derived from it.
- No invisible rectangles for spacing — use Flex/Grid layout

### Visual effects & glassmorphism

- Glass recipe: `blurs: [{ type: 'layer-blur', value: 20 }]` + `borderRadius: 20` + shadow
- Shadow color: `{ color: '#hex', opacity: 0.06 }` (not r/g/b/a)
- Ghost border only when accessibility explicitly requires it

### Prototyping

- Flow entry boards: prefix `/flows/[journey]-start`
- Overlay boards: prefix `overlay/`
- Create flows via `page.createFlow('name', entryBoard)` or Prototype panel

### Accessibility

- WCAG AA contrast minimum for all text
- 44px min touch target (iOS) / 48dp (Android)
- Never use color alone to communicate status

### Handoff readiness

- Component/variable names developer-readable
- No duplicates — single source of truth

---

## 8. Model Selection

- Always use frontier models (Claude Sonnet/Opus, GPT-4o, Gemini Pro)
- VLM required for image-based tasks
- More complex tasks → stronger model
- Token-constrained workflows → apply RULESET block from §5

---

## 9. Key Gotchas

**MCP/infrastructure:**

| Gotcha                                  | Mitigation                                         |
| --------------------------------------- | -------------------------------------------------- |
| MCP acts on focused page only           | Confirm page focus before each write batch         |
| Write ops immediate — no undo via MCP   | Plan + describe before applying                    |
| Large batches time out silently         | Max ~10 ops per call; verify after each            |
| Page switch is async                    | Never switch page and write in same call           |
| `export_shape` may fail with HTTP error | Verify structurally via API; export is best-effort |
| Remote MCP can't read local file system | Use local MCP for `import_image`                   |
| Only one active MCP tab                 | Close other Penpot tabs before running agents      |
| MCP key shown only once                 | Copy immediately; regenerate if lost               |
| Expired key blocks all connections      | Regenerate in Integrations; update all configs     |
| Chromium ≥142 blocks localhost          | Use Firefox, or allow local network explicitly     |

**Penpot plugin API (full detail → `references/penpot-api-patterns.md`):**

| Gotcha                                              | Mitigation                                                                |
| --------------------------------------------------- | ------------------------------------------------------------------------- |
| `shape.width` / `shape.height` READ-ONLY            | Use `shape.resize(w, h)`                                                  |
| `shape.x` / `shape.y` READ-ONLY for parented shapes | Use `penpotUtils.setParentXY(shape, x, y)`                                |
| `shape.x` / `shape.y` for root-level boards         | ✅ Direct assignment works                                                |
| `appendChild` ignores z-order                       | Use `insertChild(index, shape)`                                           |
| Flex children reversed for column dirs              | Last inserted = top visually                                              |
| `penpot.createText(...)` may return null            | Guard before resize/style calls; return a clear error if unavailable      |
| Text clips after `resize()`                         | Always reset `growType` after every `text.resize()`                       |
| Font weight rejection                               | Only use weights explicitly installed for the font family                 |
| Library `fontSize` must be string                   | `"16"` not `16`; library typographies use `fontFamilies` not `fontFamily` |
| `LibraryColor.color` for hex                        | `.color = '#hex'` not `.fillColor`                                        |
| `shape.blurs` is an array                           | `shape.blurs = [{ type: 'layer-blur', value: 20 }]`                       |
| Shadow color format                                 | `{ color: '#hex', opacity: 0.15 }` not `{r,g,b,a}`                        |
| Typography `fontId` stays stale                     | Known API limitation; rendered layers use correct ID                      |
| `storage` resets on server restart                  | Always use a fallback value when reading                                  |
| `Page.findShapes()` takes criteria object           | `page.findShapes({ type: 'board' })` not a predicate                      |
| `createComponent` wraps an array                    | `createComponent([shape])` not `createComponent(shape)`                   |
