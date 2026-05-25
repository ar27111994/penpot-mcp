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

AI-agent workflows for creating, auditing, and maintaining production-grade design projects and design systems — including flows, interactions, animations, and overlays — in Penpot via the official MCP Server.

## Compatible AI Agents

Works with any MCP-compatible client, including: **Claude Code**, **Cursor**, **VS Code / Copilot**, **Codex / OpenCode**, **Amp**, **Cline**, **Windsurf**, **Claude Desktop** (via `mcp-remote`), and any agent supporting HTTP or SSE MCP transport.

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

---

## 1. Connection Setup

### Remote MCP (recommended for most users)
1. Penpot → **Your account → Integrations → MCP Server** → enable
2. Generate MCP key (shown once — store safely, treat like a password; only one key exists per user)
3. Copy server URL shown in-page: `https://<your-penpot-domain>/mcp/stream?userToken=YOUR_MCP_KEY`
4. Add to your MCP client config (see snippets below)
5. Open a design file → **File → MCP Server → Connect**

### Local MCP (advanced; extra file-system access)
```bash
npx @penpot/mcp@stable   # keep running; matches current Penpot release
# beta/test environments:
npx @penpot/mcp@beta
```
- Load plugin in Penpot → **Plugins → Load from URL** → `http://localhost:4400/manifest.json`
- Click **Connect to MCP server** in plugin UI → keep plugin window open at all times
- Client URL: `http://localhost:4401/mcp` (no auth; uses active Penpot browser session)
- Fallback legacy SSE: `http://localhost:4401/sse`

### Client Config Snippets

**Claude Code** (`.claude/settings.json`):
```json
{ "mcpServers": { "penpot": { "transport": "http", "url": "REMOTE_OR_LOCAL_URL" } } }
```
**Cursor**:
```json
{ "mcpServers": { "penpot": { "url": "REMOTE_OR_LOCAL_URL", "type": "http" } } }
```
**VS Code / Copilot** (`settings.json`):
```json
{ "mcp.servers": { "penpot": { "transport": "http", "url": "REMOTE_OR_LOCAL_URL" } } }
```
**Codex / OpenCode**:
```json
{ "servers": { "penpot": { "url": "REMOTE_OR_LOCAL_URL", "transport": { "type": "http" } } } }
```
**Claude Desktop** (stdio-only clients — requires proxy):
```bash
npx -y mcp-remote http://localhost:4401/mcp --allow-http
```

### Troubleshooting Checklist
- Restart MCP server process
- Reconnect plugin (**File → MCP Server → Connect**)
- Restart MCP client / reload tools
- Keep plugin window open while agents run at all times
- Firefox preferred if Chromium blocks `localhost` from `https://design.penpot.app` (Chromium ≥142 may need explicit local network permission; Brave requires Shield disabled)
- Expired MCP key → regenerate in Penpot → Integrations; update all client configs

---

## 2. Available MCP Tools

| Tool | Mode | Description |
|------|------|-------------|
| `high_level_overview` | Both | Read overall file structure, pages, layers, components |
| `penpot_api_info` | Both | Query Penpot plugin API documentation |
| `execute_code` | Both | Run JavaScript in Penpot plugin context — primary read/write tool |
| `export_shape` | Both | Export a shape/frame as PNG/SVG (remote: limited; no local path write) |
| `import_image` | Local only | Import image from local file path into design |

> Remote MCP cannot import images from local paths. `export_shape` may fail with HTTP errors — always verify structurally via API rather than relying on export success.

### Check connection first (always)
Before any setup steps, **call `penpot_api_info` or `high_level_overview` first**. If it succeeds, skip setup entirely. Only walk through setup if the user confirms the server is not installed.

### JavaScript API
`execute_code` runs JS against the Penpot plugin API. **Read `references/penpot-api-patterns.md` before writing any `execute_code` calls.** Critical bugs from skipping this: silent write failures, overlapping boards, text clipping, wrong page targeting.

---

## 3. Safety-First Workflow (ALWAYS follow this order)

```
1. READ   → Inspect, list, analyze (never skip)
2. PLAN   → Describe intended changes BEFORE applying
3. WRITE  → Small atomic batches; one logical unit per call
4. VERIFY → Read again after each write batch (structural, not export-based)
```

**Write call limits — enforce strictly:**
- Max ~5-10 shape operations per `execute_code` call
- Pause and verify between batches
- Never "refactor everything" in one call — MCP writes time out on large batches, leaving partial updates with no error indication

**Page switching — mandatory two-call pattern:**
```
Call 1: switch page (navigate focus in Penpot manually or confirm page is focused)
Call 2: read or write on that page
```
Page switching is asynchronous in the plugin bridge. Writing on the same call as a page switch applies changes to the *previously* active page.

**Starter prompts (always run first after connecting):**
```
"List all pages in this file."
"Show all components on this page."
"Analyze the design structure and summarize the token system."
"List color styles and explain how they're used."
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
GOAL: [specific problem — e.g., "add navigate interactions between onboarding screens"]
INPUTS: [page name, board names, component names, token paths]
CONSTRAINTS:
  - Only use existing components and tokens
  - WCAG AA contrast minimum
  - Max 5 shape operations per execute_code call
  - Do not switch page and write in the same call
  - Do not invent font weights not installed for this family
QUALITY CRITERIA: [how you'll know it's done]
```

### Negatives (always include)
- "Do not invent colors not in the token set."
- "Do not use font weights not confirmed installed for this font family."
- "Do not switch page and write in the same execute_code call."
- "Do not assume product decisions."
- "Do not rely on export_shape for verification — use structural API checks."

### Iteration pattern
```
1. Analysis → understand current state
2. Proposal → describe planned changes, wait for approval
3. Apply    → one logical unit, max ~10 operations
4. Verify   → structural read to confirm, not visual export
5. Repeat
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
- BATCH_LIMIT: 5-10 ops per execute_code call
- PAGE_SWITCH: separate call from writes
SIZE CONSTRAINTS
- design-system.json: tokens + mappings only
- components.catalog.json: real components only
- layout-and-rules.md: max ~300 lines
- screens.reference.json: 3-6 screens max
STYLE
- Use schemas, key:value, compact bullets
- No narrative explanations
```

### Token hierarchy
```
Tier 1 (Global):    color.base.neutral.100, spacing.base.8
Tier 2 (Semantic):  color.bg.default, color.text.primary
Tier 3 (Component): color.button.primary.bg
```
Always reference tokens by full path. Never use raw hex or px values in agent outputs.

---

## 6. Workflow Recipes

Read the relevant reference before starting any task:
- **Penpot JS API, gotchas, fonts, interactions, animations** → `references/penpot-api-patterns.md` *(mandatory before any `execute_code` calls)*
- **Design system creation/audit** → `references/design-system-workflows.md`
- **Design-to-code generation** → `references/design-to-code-workflows.md`
- **Prototyping: flows, interactions, animations** → `references/prototyping-workflows.md`

### Quick reference: Common task prompts

**Design tasks:**
```
"Read all spacing values on this page. Identify inconsistencies.
Propose a normalized 8px-base token set. Show names before applying."

"List all layer names. Flag any not following function-based naming.
Propose renames. Do not apply until approved."

"Show current Button component. List existing variants.
Propose missing states (disabled, loading). Describe each before creating."
```

**Prototyping tasks:**
```
"List all boards on this page and their existing interactions."

"Add a click→navigate interaction from [BoardA] to [BoardB]
with a Dissolve animation (300ms, ease-in-out). Describe before applying."

"Audit all interactions on this page. List any broken destinations
(boards that no longer exist)."
```

**Developer tasks:**
```
"Generate semantic HTML + CSS for [FrameName].
Framework: React. Styling: CSS variables from Penpot tokens.
Do not invent breakpoints. Do not use magic numbers."

"List all components and token usage. Output as JSON."

"List all icon shapes. Export as SVG named in kebab-case."
```

---

## 7. Design File Best Practices

### File & page structure
- One board per functional area (`Onboarding`, `Dashboard`, `Settings`) — not per screen
- Canvas as logical map: wireframes left → final design right
- Every board has a clear purpose and visual entry point

### Layer naming
- Function-based: `background`, `icon-close`, `label-primary` ✅
- Not appearance-based: `rectangle-23`, `blue-box` ❌
- Hierarchy with `/`: `form/input/text`, `form/input/checkbox`
- No context duplication: if component = `button`, internals ≠ `button-icon`

### Components
- Group by function: `Button`, `FormField`, `Card`
- Naming: `button/primary/default`, `button/primary/hover`, `button/primary/disabled`
- Variants only for same-pattern differences
- Max visual depth: 3–4 levels; use Flex for stacks, Grid for galleries/dashboards

### Spacing & layout
- Base unit: 8px. All margins/paddings derived from it.
- Apply layout to most containers — never use invisible rectangles for spacing.

### Prototyping
- Name flow entry boards clearly: `/flows/onboarding-start`, `/flows/checkout-start`
- Each board that's a flow entry should have a flow defined (start point in Prototype panel)
- Overlay boards: prefix `overlay/` — e.g., `overlay/confirm-delete`
- Use `after-delay` trigger sparingly — prefer `click` for testability

### Accessibility
- WCAG AA contrast minimum for all text
- Typography from predefined scale: 12, 14, 16, 20, 24, 32...
- Never use color alone to communicate status — pair with text/icon

### Handoff readiness
- Boards named for handoff: `/screens/login`, `/components/button`
- Component/variable names developer-readable
- No duplicates — single source of truth

---

## 8. Model Selection

- Always use frontier models (Claude Sonnet/Opus, GPT-4o, Gemini Pro)
- VLM (vision-language model) required for image-based tasks — standard commercial models already support vision
- More complex tasks → stronger model
- Token-constrained workflows → apply RULESET block from §5

---

## 9. Key Gotchas

**MCP/infrastructure:**

| Gotcha | Mitigation |
|--------|-----------|
| MCP acts on focused page only | Confirm page focus before each write batch |
| Write ops are immediate — no undo via MCP | Plan + describe before applying |
| Large batches time out silently, leaving partial updates | Max ~10 ops per call; verify after each batch |
| Page switch is async | Never switch page and write in the same call |
| Remote MCP can't read local file system | Use local MCP for `import_image` / local exports |
| Only one active MCP tab | Close other Penpot tabs before running agents |
| MCP key shown only once | Copy immediately; regenerate if lost |
| Expired key blocks all connections | Regenerate in Integrations; update all configs |
| Chromium ≥142 blocks localhost | Use Firefox, or allow local network explicitly |
| `export_shape` may fail with HTTP error | Always verify structurally via API, not export |

**Penpot plugin API (full detail → `references/penpot-api-patterns.md`):**

| Gotcha | Mitigation |
|--------|-----------|
| `shape.width` / `shape.height` READ-ONLY | Use `shape.resize(w, h)` |
| `shape.parentX` / `shape.parentY` READ-ONLY | Use `penpotUtils.setParentXY(shape, x, y)` |
| `appendChild` ignores z-order | Use `insertChild(index, shape)` |
| Flex children order reversed for column dirs | Last inserted = top visually |
| Text clips after `resize()` | Always reset `growType` after every `text.resize()` |
| New board may overlap existing ones | Check all board positions before placing |
| Font weight rejection | Only use weights explicitly installed for the font family |
| Library `fontSize` must be string | `"16"` not `16`; text layers accept numbers |
| Typography style `fontId` stays stale | Known API limitation; rendered layers use correct ID |
