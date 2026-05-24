---
name: penpot-mcp
description: >
  Use this skill whenever the user wants to use AI agents to work with Penpot design files via
  the Penpot MCP Server. Triggers include: any mention of Penpot, design files, design systems,
  design tokens, Penpot MCP, design-to-code, generating UI from design, auditing a design system,
  creating components/variants, renaming layers, exporting assets from Penpot, or prompting an AI
  agent to read/modify a Penpot file. Also triggers when the user wants to set up Penpot MCP,
  connect Claude Code or Cursor to Penpot, or produce production-ready HTML/CSS/React from a
  Penpot design. Use this skill for ALL Penpot-agent workflows — design, code, audit, or setup.
---

# Penpot MCP Skill

AI-agent workflows for creating, auditing, and maintaining production-grade design projects and design systems in Penpot via the official MCP Server.

## Architecture Overview

Three components must all be active simultaneously:

```
MCP Client (Claude Code / Cursor / VS Code)
      ↕  HTTP/SSE
MCP Server (hosted remote OR local npx)
      ↕  plugin bridge
Penpot Plugin (running inside the open design file)
```

MCP **always acts on the currently focused page** in the active Penpot browser tab. Only one tab can own MCP at a time.

---

## 1. Connection Setup

### Remote MCP (recommended for most users)
1. Penpot → **Your account → Integrations → MCP Server** → enable
2. Generate MCP key (shown once — store safely, treat like a password)
3. Copy server URL: `https://<your-penpot-domain>/mcp/stream?userToken=YOUR_MCP_KEY`
4. Add to MCP client config (see client configs below)
5. Open a design file → **File → MCP Server → Connect**

### Local MCP (advanced users, extra file-system access)
```bash
npx @penpot/mcp@stable   # keep running in terminal
```
- Load plugin from `http://localhost:4400/manifest.json` in Penpot
- Client URL: `http://localhost:4401/mcp` (no auth needed)

### Client Config Snippets

**Claude Code:**
```json
{ "mcpServers": { "penpot": { "transport": "http", "url": "REMOTE_OR_LOCAL_URL" } } }
```
**Cursor / VS Code:**
```json
{ "mcpServers": { "penpot": { "url": "REMOTE_OR_LOCAL_URL", "type": "http" } } }
```

### Troubleshooting Checklist
- Restart MCP server process
- Reconnect plugin (**File → MCP Server → Connect**)
- Restart MCP client / reload tools
- Keep plugin window open while agents run
- Firefox preferred if Chromium blocks `localhost` from `https://design.penpot.app`

---

## 2. Available MCP Tools

| Tool | Mode | Description |
|------|------|-------------|
| `high_level_overview` | Both | Read overall file structure, pages, layers, components |
| `penpot_api_info` | Both | Query Penpot plugin API documentation |
| `execute_code` | Both | Run JavaScript in the Penpot plugin context — the primary tool for reading and writing designs |
| `export_shape` | Both | Export a shape/frame as PNG/SVG for visual inspection |
| `import_image` | Local only | Import image from local file path into design |

> **Note:** Remote MCP cannot import images from local paths or export directly to local file paths. Use local MCP for asset-heavy workflows.

### Check if already connected (do this first)
Before any setup steps, **call `penpot_api_info` first**. If it succeeds, the server is running — skip setup entirely and go straight to the task. Only walk through setup if the call fails and the user confirms the server is not installed.

### JavaScript API patterns
The `execute_code` tool runs JavaScript against the Penpot plugin API. For the full reference — including `penpotUtils` functions, critical gotchas (read-only properties, flex ordering quirks), design system discovery code, board positioning, CSS export, and validation patterns — read **`references/penpot-api-patterns.md`** before writing any `execute_code` calls.

---

## 3. Safety-First Workflow (ALWAYS follow this order)

```
1. READ   → Inspect, list, analyze (never skip this)
2. PLAN   → Ask agent to describe what it will change BEFORE applying
3. WRITE  → Small, reversible steps only
4. VERIFY → Read again after each write batch
```

**Starter prompts (always run first after connecting):**
- `"List all pages in this file."`
- `"Show all components on this page."`
- `"Analyze the design structure and summarize the token system."`
- `"List color styles and explain how they're used."`

---

## 4. Role & Prompt Engineering

### Define the agent role precisely
```
BAD:  "You are a creative designer."
GOOD: "You are a Senior Product Designer expert in design systems, WCAG accessibility,
       and Penpot-to-code workflows. You do not make product decisions without data.
       You never invent tokens, colors, or components not present in the file."
```

### Structured Brief Template (use for every non-trivial task)
```
CONTEXT: [product name, target user, current state of file]
GOAL: [specific problem to solve — e.g., "normalize spacing on the Settings page"]
INPUTS: [page name, component names, token paths]
CONSTRAINTS:
  - Only use existing components and tokens
  - WCAG AA contrast minimum
  - No new navigation patterns
  - Do not touch visual identity
QUALITY CRITERIA: [how you'll know it's done]
```

### Negatives (always include what NOT to do)
- "Do not invent colors not in `/core/colors` token set."
- "Do not rename components, only layers."
- "Do not add new pages."
- "Do not assume product decisions."

### Iteration pattern (never one-shot complex tasks)
```
1. Analysis prompt  → understand current state
2. Proposal prompt  → describe planned changes, wait for approval
3. Apply prompt     → execute one logical unit of work
4. Verify prompt    → confirm results, check for drift
5. Repeat for next unit
```

---

## 5. Token-Aware Prompting

Penpot's SVG/open-standards structure makes tokens directly machine-readable. Use this advantage.

### Global RULESET block (prepend to every design-system prompt)
```
GLOBAL RULESET
- SOURCE: Penpot MCP only
- NO_GUESSING: true
- IF_MISSING: mark as TODO
- PREFER: structured data > prose
- OUTPUT: deterministic, stable ordering
SIZE CONSTRAINTS
- design-system.json: tokens + mappings only, no comments
- components.catalog.json: real components only
- layout-and-rules.md: max ~300 lines
- screens.reference.json: 3-6 screens max
STYLE
- Use schemas, key:value, compact bullets
- No narrative explanations, no redundant wording
```

### Compact schema style (saves 20–35% tokens vs prose)
```
BAD:  "Include font families, sizes, line heights, weights, and letter spacing."
GOOD: typography: fontFamily fontSize lineHeight fontWeight letterSpacing
```

### Token hierarchy to enforce in prompts
```
Tier 1 (Global):    color.base.neutral.100, spacing.base.8
Tier 2 (Semantic):  color.bg.default, color.text.primary
Tier 3 (Component): color.button.primary.bg
```
Always reference tokens by full path. Never use raw hex or px values in agent outputs.

---

## 6. Workflow Recipes

For detailed workflow guides, read the relevant reference file:
- **Penpot JS API, gotchas, code patterns, defaults** → `references/penpot-api-patterns.md` *(read this before any `execute_code` calls)*
- **Design system creation/audit** → `references/design-system-workflows.md`
- **Design-to-code generation** → `references/design-to-code-workflows.md`

### Quick reference: Common task prompts

**Design tasks:**
```
# Create spacing/color token set
"Read all spacing values on this page. Identify inconsistencies.
Propose a normalized 8px-base token set. Show token names before applying."

# Rename layers to match convention
"List all layer names on this page. Flag any that don't follow
function-based naming (e.g., 'rectangle 23' instead of 'background').
Propose renames. Do not apply until approved."

# Generate component variants
"Show current Button component. List existing variants.
Propose missing states (disabled, loading). Describe each before creating."

# Audit design system
"Scan all color styles. Identify duplicates and near-duplicates (within 10% hue).
List components that use hard-coded colors instead of tokens."
```

**Developer tasks:**
```
# Extract HTML/CSS
"Generate semantic HTML + CSS for the [FrameName] frame.
Framework: React. Styling: CSS variables mapped from Penpot tokens.
Do not invent breakpoints. Do not use magic numbers."

# Map components to code
"List all components and their token usage.
Output as JSON: { componentName, tokenRefs[], suggestedCodeName }"

# Export assets
"List all icon shapes on this page.
Export each as SVG. Name files using the layer name in kebab-case."
```

---

## 7. Design File Best Practices (enforce in all agent work)

### File & page structure
- One board per functional area (`Onboarding`, `Dashboard`, `Settings`) — not per screen
- Canvas as logical map: wireframes left → final design right
- Every board has a clear purpose and visual entry point

### Layer naming (agent must enforce)
- Function-based: `background`, `icon-close`, `label-primary` ✅
- Not appearance-based: `rectangle-23`, `blue-box` ❌
- Hierarchy with `/`: `form/input/text`, `form/input/checkbox`
- No context duplication: if component = `button`, internals ≠ `button-icon`

### Components
- Group by function: `Button`, `FormField`, `Card` (not by color/size)
- Naming: `button/primary/default`, `button/primary/hover`, `button/primary/disabled`
- Variants only for same-pattern differences (not distinct components)
- Max visual depth: 3–4 levels of frame nesting
- Flex layout for linear stacks; Grid for predictable structures (cards, galleries)

### Spacing & layout
- Base unit: 8px. All margins/paddings derived from it.
- Apply layout to most containers — never use invisible rectangles for spacing.
- No fixed boards except graphic/decorative elements.

### Accessibility
- WCAG AA contrast minimum for all text
- Typography from predefined scale: 8, 10, 12, 14, 16, 20, 24, 32...
- Never use color alone to communicate status — pair with text/icon

### Handoff readiness
- Boards named for handoff: `/screens/login`, `/components/button`
- Component/variable names developer-readable
- No duplicates — single source of truth per component or style

---

## 8. Model Selection

- **Always use frontier models** (GPT-4o, Claude Sonnet/Opus, Gemini Pro)
- Vision-language model (VLM) required for image-based tasks (export inspection, screenshot analysis)
- More complex design tasks → stronger model required
- For token-constrained workflows → apply RULESET block from §5

---

## 9. Key Gotchas

**MCP/infrastructure:**

| Gotcha | Mitigation |
|--------|-----------|
| MCP acts on focused page only | Switch page in Penpot, confirm agent sees it |
| Write ops are immediate (no undo stack via MCP) | Always plan + describe before apply |
| Remote MCP can't read local file system | Use local MCP for import_image / local exports |
| Only one active MCP tab | Close or disable other Penpot tabs before running agents |
| MCP key shown only once | Copy and store securely immediately on generation |
| Expired MCP key blocks all connections | Regenerate and update all client configs |
| Chromium may block localhost from HTTPS | Use Firefox, or allow local network in browser settings |

**Penpot plugin API (see `references/penpot-api-patterns.md` for full detail):**

| Gotcha | Mitigation |
|--------|-----------|
| `shape.width` / `shape.height` are READ-ONLY | Always use `shape.resize(w, h)` |
| `shape.parentX` / `shape.parentY` are READ-ONLY | Use `penpotUtils.setParentXY(shape, x, y)` |
| `appendChild` doesn't control z-order | Use `insertChild(index, shape)` |
| Flex children order is **reversed** visually for column/row dirs | Last child in array = top visually |
| Text clips after `resize()` | Always reset `growType` after every `text.resize()` |
| New board may overlap existing ones | Always check board positions before placing |
