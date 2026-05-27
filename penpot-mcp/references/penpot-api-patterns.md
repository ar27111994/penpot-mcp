# Penpot API Patterns

Concrete JavaScript for `execute_code`, critical gotchas, font/typography constraints, interactions, animations, discovery, positioning, visual effects, and component checklists.

## Table of Contents

1. [Always Check Connection First](#1-always-check-connection-first)
2. [Core API Reference](#2-core-api-reference)
3. [CRITICAL API Gotchas](#3-critical-api-gotchas)
4. [Page Management API](#4-page-management-api)
5. [Library Creation API](#5-library-creation-api)
6. [Token API](#6-token-api)
7. [Font & Typography Constraints](#7-font--typography-constraints)
8. [Visual Effects: Fills, Gradients, Blur & Glassmorphism](#8-visual-effects-fills-gradients-blur--glassmorphism)
9. [storage Global: Cross-Call State](#9-storage-global-cross-call-state)
10. [Idempotency Helpers](#10-idempotency-helpers)
11. [Design System Discovery](#11-design-system-discovery)
12. [Board Positioning](#12-board-positioning)
13. [CSS Export](#13-css-export)
14. [Interactions, Flows & Animations](#14-interactions-flows--animations)
15. [Validation Patterns](#15-validation-patterns)
16. [Platform Layout Templates](#16-platform-layout-templates)
17. [Default Design Tokens (Fallback)](#17-default-design-tokens-fallback)
18. [Component Checklists](#18-component-checklists)

---

## 1. Always Check Connection First

```text
Call: mcp__penpot__penpot_api_info  (or high_level_overview)
```

- Succeeds → server running. Skip setup. Proceed to task.
- Fails → ask: "The Penpot MCP server doesn't appear connected. Is it running? I can help troubleshoot or guide setup."
- Only walk through setup if user confirms it's not installed.

---

## 2. Core API Reference

All code runs via `mcp__penpot__execute_code`.

### Read operations

```javascript
// Page structure (current page)
penpotUtils.shapeStructure(penpot.root);
penpotUtils.findShapes((s) => s.type === "text", penpot.root); // predicate-based
penpotUtils.findShapes((s) => s.name.startsWith("icon"), penpot.root);
penpotUtils.findShapes(() => true, penpot.root); // all shapes on current page
penpotUtils.findShape((s) => s.name === "target"); // ← singular, returns first match

// Find by ID
penpotUtils.findShapeById("uuid-string");

// Library reads
penpot.library.local.components;
penpot.library.local.colors;
penpot.library.local.typographies;
penpot.library.local.tokens; // TokenCatalog
penpot.library.local.tokens.sets; // TokenSet[]
penpot.library.local.tokens.themes; // TokenTheme[]

// File context
penpot.currentPage; // Page | null
penpot.currentFile; // File | null
penpot.root; // root Shape of current page

// Interactions on a shape
const board = penpotUtils.findShape((s) => s.name === "Home");
board.interactions; // Interaction[]
```

### Create shape operations

```javascript
const board = penpot.createBoard();
const rect = penpot.createRectangle();
const text = penpot.createText("Hello"); // returns Text | null
const ellipse = penpot.createEllipse();

// Layout on a container
board.addFlexLayout();
board.addGridLayout();

// Z-ordering (NOT appendChild for ordering)
parent.insertChild(0, shape); // index 0 = bottom of stack
parent.appendChild(shape); // appends without z-order control
```

### Modify shape operations

```javascript
// SIZE — always resize(), never direct assignment
shape.resize(400, 300); // ✅
shape.width = 400; // ❌ READ-ONLY

// POSITION
// Top-level shapes (boards on page root): direct assignment WORKS
board.x = 100;
board.y = 200; // ✅ for root-level shapes
// Parented shapes: use utility
penpotUtils.setParentXY(shape, 100, 200); // ✅ for children

// Text grow behavior (MUST reset after every resize)
text.resize(200, 0);
text.growType = "auto-height"; // 'auto-width' | 'auto-height' | 'fixed'

// Fills (solid color)
shape.fills = [{ fillColor: "#3451B2", fillOpacity: 1 }];

// Typography on a text layer
text.fontFamily = "Inter";
text.fontSize = String(16); // always string for safety
text.fontWeight = "400"; // always string
text.lineHeight = String(1.5); // always string
text.letterSpacing = "0";

// Flex layout
const layout = board.addFlexLayout();
layout.dir = "row"; // 'row' | 'column' | 'row-reverse' | 'column-reverse'
layout.gap = 16;
layout.padding = { top: 16, right: 16, bottom: 16, left: 16 };
layout.justifyContent = "center"; // 'start' | 'center' | 'end' | 'space-between'
layout.alignItems = "center"; // 'start' | 'center' | 'end' | 'stretch'

// Visual effects
shape.opacity = 0.9;
shape.blendMode = "multiply"; // 'normal' | 'multiply' | 'screen' | 'overlay' | ...
shape.borderRadius = 20;
shape.hidden = false;
```

### Clone and remove

```javascript
const clone = shape.clone(); // clones to same parent
shape.remove(); // removes shape from current page
interaction.remove(); // removes specific interaction
```

### Plugin data (persistent metadata per shape/page/library)

```javascript
// Shape-level
shape.setPluginData("my-key", "my-value");
shape.getPluginData("my-key");
shape.getPluginDataKeys();

// Library-level (file-wide metadata)
penpot.library.local.setPluginData("spec", JSON.stringify(payload));
penpot.library.local.getPluginData("spec");

// Page-level
page.setPluginData("role", "foundations");

// Shared across plugins (namespace required)
shape.setSharedPluginData("design-system", "token", "color.primary.500");
```

### Community plugin boundaries

The Penpot MCP Server runs through the Penpot MCP plugin and exposes the Penpot Plugin API. Do not assume it can list installed community plugins, install plugins, launch another plugin, or call another plugin's private UI/API. The documented plugin API supports file content, libraries, comments, user data, and plugin/shared plugin data according to the active plugin's manifest permissions; it is not a general installed-plugin automation bus.

Safe coordination pattern:

1. Use MCP to inspect the file first.
2. If a task appears to need a community plugin, check only for file-visible evidence such as generated layers, library assets, comments, or namespaced shared plugin data.
3. If the user provides an installed-plugin inventory, treat it as user-provided context and choose a plugin only when the task clearly maps to that plugin's stated capability.
4. If the plugin must run, ask the user to confirm the exact installed plugin and whether they want it used.
5. Ask the user to run that plugin manually when it requires its own UI or permissions, then re-inspect the file with MCP.
6. Never browse, search, or install plugins from an agent loop unless the user explicitly requested plugin discovery or installation.

---

## 3. CRITICAL API Gotchas

| Property / Behaviour                        | Status                    | Correct Approach                                   |
| ------------------------------------------- | ------------------------- | -------------------------------------------------- |
| `shape.width` / `shape.height`              | ❌ READ-ONLY              | `shape.resize(w, h)`                               |
| `shape.parentX` / `shape.parentY`           | ❌ READ-ONLY              | `penpotUtils.setParentXY(shape, x, y)`             |
| `shape.x` / `shape.y` for parented shapes   | ❌ READ-ONLY              | `penpotUtils.setParentXY(shape, x, y)`             |
| `shape.x` / `shape.y` for root-level shapes | ✅ Works                  | Direct assignment OK for top-level boards          |
| Z-ordering via `appendChild`                | ❌ Ignores order          | `insertChild(index, shape)`                        |
| `penpot.createText(...)`                    | ⚠️ Nullable               | Check result before resize/style calls             |
| Text clips after `resize()`                 | ⚠️ Reset required         | Set `growType` after every `text.resize()`         |
| Flex children order                         | ⚠️ Reversed               | For column: last inserted = visually top           |
| Page switch + write in same call            | ❌ Writes to wrong page   | Two calls: switch page, then write                 |
| Large batch writes                          | ⚠️ Silent timeout/partial | Max ~10 ops per call; verify after                 |
| `export_shape` HTTP error                   | ⚠️ Unreliable             | Verify structurally; don't rely on export          |
| Library `fontSize`                          | ⚠️ Must be string         | `"16"` not `16` for library typographies           |
| Shadow `color` field                        | ⚠️ Color object           | `{ color: '#hex', opacity: 0.15 }` not `{r,g,b,a}` |
| `LibraryColor.color`                        | ⚠️ Different from fill    | `color.color = '#hex'` not `color.fillColor`       |

### Flex children reversal

```javascript
// Column: LAST inserted = visually TOP
container.insertChild(0, footer); // bottom
container.insertChild(1, content); // middle
container.insertChild(2, header); // top ← counter-intuitive
```

### Text resize + growType (always pair)

```javascript
const label = penpot.createText("Button Label");
if (!label) return { error: "Text creation failed" };

label.resize(120, 0);
label.growType = "auto-height"; // MUST follow every resize
label.fontSize = "14"; // string
label.fontWeight = "500"; // string
```

### Batch size discipline

```javascript
for (let i = 0; i < shapes.length; i += 5) {
  const batch = shapes.slice(i, i + 5);
  // process batch
  // return partial results so caller can verify before continuing
}
```

---

## 4. Page Management API

### Read pages

```javascript
// List all pages (returns {id, name}[] — lightweight)
const pages = penpotUtils.getPages(); // [{id, name}]

// Get Page object by name/id (full Page API)
const pageByName = penpotUtils.getPageByName("Mobile"); // Page | null
const pageById = penpotUtils.getPageById("uuid"); // Page | null

// Current page
const currentPage = penpot.currentPage; // Page | null
```

### Page-scoped shape search (preferred over root search)

```javascript
// Criteria-based search on a specific page — cleaner than predicate on root
const page = penpotUtils.getPageByName("Mobile");
if (!page) return { error: "Page not found", pageName: "Mobile" };

const boards = page.findShapes({ type: "board" });
const named = page.findShapes({ name: "Header" });
const like = page.findShapes({ nameLike: "btn-" });
// Type options: 'board'|'rectangle'|'ellipse'|'text'|'group'|'path'|'image'|'boolean'|'svg-raw'
```

### Create and navigate pages

```javascript
// Create a new page
const newPage = penpot.createPage();
newPage.name = "Foundations";

// Navigate to a page — SEPARATE CALL from writes that follow
penpot.openPage(page); // pass Page object
penpot.openPage(page.id); // or page id string
// After openPage, penpot.root and penpot.currentPage reflect the new page
```

### Move shapes between pages

```javascript
// Access root of any page and append to it
const targetPage = penpotUtils.getPageByName("Mobile");
targetPage.root.appendChild(board); // moves board to that page's root
```

### idempotent ensurePage helper

```javascript
function ensurePage(name) {
  const existing = penpotUtils.getPageByName(name);
  if (existing) {
    penpot.openPage(existing);
    return penpot.currentPage;
  }
  const page = penpot.createPage();
  page.name = name;
  penpot.openPage(page);
  return page;
}
```

### Page flows (prototype entry points) — via API

```javascript
// Flows CAN be created via API (Page.createFlow)
const page = penpot.currentPage;
const entryBoard = penpotUtils.findShape(
  (s) => s.name === "/flows/onboarding-start",
);
const flow = page.createFlow("Onboarding", entryBoard);

// Remove a flow
page.removeFlow(flow);

// List existing flows
page.flows; // Flow[]
```

### Ruler guides

```javascript
page.addRulerGuide("vertical", 320); // 'horizontal' | 'vertical'
page.addRulerGuide("horizontal", 64, board); // optional: board-scoped guide
page.removeRulerGuide(guide);
page.rulerGuides; // RulerGuide[]
```

---

## 5. Library Creation API

### Create library color

```javascript
function ensureColor(name, hex) {
  const existing = penpot.library.local.colors.find((c) => c.name === name);
  if (existing) return existing;
  const color = penpot.library.local.createColor();
  color.name = name; // supports path: 'Brand/Primary'
  color.color = hex; // ← .color not .fillColor
  return color;
}

// Access
color.name; // 'Brand/Primary'
color.color; // '#RRGGBB' — the hex value passed in
color.path; // path segment (before last '/')
```

### Create library typography

```javascript
function ensureTypography(
  name,
  fontFamilies,
  fontWeight,
  fontSize,
  lineHeight,
  letterSpacing,
  textTransform,
) {
  const existing = penpot.library.local.typographies.find(
    (t) => t.name === name,
  );
  if (existing) return existing;
  const typo = penpot.library.local.createTypography();
  typo.name = name;
  typo.fontFamilies = fontFamilies; // ← 'fontFamilies' not 'fontFamily'
  typo.fontWeight = fontWeight; // string: '700'
  typo.fontSize = fontSize; // string: '16' (MUST be string)
  typo.lineHeight = lineHeight; // string: '1.5'
  typo.letterSpacing = letterSpacing; // string: '0.02'
  typo.fontStyle = "normal"; // 'normal' | 'italic' | null
  if (textTransform) typo.textTransform = textTransform; // 'uppercase' | 'capitalize' | 'lowercase'
  return typo;
}

// Apply to a text shape
typo.applyToText(textShape); // apply typography style to whole text
typo.applyToTextRange(range); // apply to a text range
typo.setFont(font, variant); // set font + variant from Fonts API
```

### Create library component

```javascript
function ensureComponent(name, shapes) {
  if (penpot.library.local.components.some((c) => c.name === name)) return null;
  const component = penpot.library.local.createComponent(shapes); // shapes: Shape[]
  component.name = name; // supports path: 'category/component/variant'
  return component;
}

// Typical pattern: clone shape, position it off-canvas, then create component
const clone = sourceShape.clone();
clone.x = 3400;
clone.y = 0;
const component = penpot.library.local.createComponent([clone]);
component.name = "category/component/variant";
```

---

## 6. Token API

Full `W3C DTCG`-compatible token system accessible via `penpot.library.local.tokens`.

### TokenCatalog

```javascript
const catalog = penpot.library.local.tokens;
catalog.sets; // TokenSet[] in precedence order
catalog.themes; // TokenTheme[]
catalog.addSet({ name: "brand/base" }); // create TokenSet
catalog.addTheme({ group: "Theme", name: "Light" }); // create TokenTheme
catalog.getSetById(id); // TokenSet | undefined
catalog.getThemeById(id); // TokenTheme | undefined
```

### TokenSet

```javascript
const set = catalog.addSet({ name: "brand/base" });
set.name; // string (supports / for grouping)
set.active; // boolean
set.tokens; // Token[]
set.toggleActive(); // activate / deactivate

// Add token to set
const token = set.addToken({
  type: "color", // TokenType (see below)
  name: "color.brand.primary", // dot-path
  value: "#RRGGBB", // TokenValueString — can reference: '{color.base.500}'
});

// TokenType values:
// 'color' | 'dimension' | 'spacing' | 'typography' | 'shadow' | 'opacity'
// 'borderRadius' | 'borderWidth' | 'fontWeights' | 'fontSizes' | 'fontFamilies'
// 'letterSpacing' | 'textDecoration' | 'textCase' | 'number' | 'sizing'

set.duplicate(); // clone set
set.remove(); // delete set
```

### TokenTheme

```javascript
const theme = catalog.addTheme({ group: "Theme", name: "Dark" });
theme.group; // 'Theme'
theme.name; // 'Dark'
theme.active; // boolean
theme.activeSets; // TokenSet[]
theme.addSet(set); // add a TokenSet to this theme
theme.removeSet(set); // remove
theme.toggleActive(); // activate theme
theme.duplicate();
theme.remove();
```

### Full token setup example (production pattern)

```javascript
function ensureSet(name) {
  return (
    penpot.library.local.tokens.sets.find((s) => s.name === name) ||
    penpot.library.local.tokens.addSet({ name })
  );
}
function addToken(set, type, name, value) {
  return (
    set.tokens.find((t) => t.name === name && t.type === type) ||
    set.addToken({ type, name, value: String(value) })
  );
}
function ensureTheme(group, name, sets) {
  const existing = penpot.library.local.tokens.themes.find(
    (t) => t.group === group && t.name === name,
  );
  const theme =
    existing || penpot.library.local.tokens.addTheme({ group, name });
  sets.forEach((set) => {
    if (!theme.activeSets.some((a) => a.name === set.name)) theme.addSet(set);
  });
  return theme;
}

const base = ensureSet("brand/base");
addToken(base, "color", "color.brand.primary", "#RRGGBB"); // replace with your brand color
addToken(base, "spacing", "spacing.md", "16");
addToken(base, "borderRadius", "radius.md", "8");
addToken(base, "borderRadius", "radius.lg", "16");
addToken(base, "opacity", "opacity.overlay", "0.8");

const light = ensureSet("theme/light");
addToken(light, "color", "color.bg.default", "#F5F5F5");
addToken(light, "color", "color.text.primary", "{color.neutral.900}"); // reference

const dark = ensureSet("theme/dark");
addToken(dark, "color", "color.bg.default", "#121212");

// Activate base + light by default
if (!base.active) base.toggleActive();
if (!light.active) light.toggleActive();

ensureTheme("Theme", "Light", [base, light]);
ensureTheme("Theme", "Dark", [base, dark]);
```

---

## 7. Font & Typography Constraints

### Font weight — must match installed variants

```javascript
// Always discover installed typographies before using a font family
const typos = penpot.library.local.typographies;
const interWeights = typos
  .filter((t) => t.fontFamilies === "Inter")
  .map((t) => t.fontWeight);
// Only use weights confirmed in interWeights array

// Library typographies use 'fontFamilies' (not 'fontFamily')
typo.fontFamilies = "Inter 28pt"; // ← fontFamilies, not fontFamily
```

### Library fontSize — must be string

```javascript
typo.fontSize = "16"; // ✅ string required for library typographies
text.fontSize = "16"; // ✅ string also safest for text layers
text.fontSize = 16; // ✅ also works on text layers but string safer
```

### fontId stale after typography update

Known API limitation: updating `fontFamily`/`fontWeight` on a library typography does not update the internal `fontId` field. Rendered text layers use correct IDs. Do not attempt to patch `fontId` manually. Workaround: delete and recreate the typography style.

---

## 8. Visual Effects: Fills, Gradients, Blur & Glassmorphism

### Solid fill

```javascript
shape.fills = [{ fillColor: "#RRGGBB", fillOpacity: 1 }];
```

### Linear gradient fill

```javascript
shape.fills = [
  {
    fillColorGradient: {
      type: "linear",
      startX: 0.5,
      startY: 0, // 0–1 normalized
      endX: 0.5,
      endY: 1,
      width: 1,
      stops: [
        { color: "#RRGGBB", opacity: 1, offset: 0 },
        { color: "#RRGGBB", opacity: 0, offset: 1 },
      ],
    },
  },
];
```

### Radial gradient fill

```javascript
shape.fills = [
  {
    fillColorGradient: {
      type: "radial",
      startX: 0.5,
      startY: 0.5,
      endX: 1,
      endY: 0.5,
      width: 0.5,
      stops: [
        { color: "#FFFFFF", opacity: 0.2, offset: 0 },
        { color: "#FFFFFF", opacity: 0, offset: 1 },
      ],
    },
  },
];
```

### Image fill (from URL)

```javascript
// uploadMediaUrl is async — must use await
const imageData = await penpot.uploadMediaUrl(
  "image-name",
  "https://example.com/image.jpg",
);
shape.fills = [{ fillOpacity: 1, fillImage: imageData }];
```

### Blur (layer-blur only)

```javascript
shape.blurs = [{ type: "layer-blur", value: 20, hidden: false }];
// ← shape.blurs is an array
// type 'layer-blur' is the only supported type
```

### Shadow

```javascript
shape.shadows = [
  {
    style: "drop-shadow", // 'drop-shadow' | 'inner-shadow'
    offsetX: 0,
    offsetY: 8,
    blur: 32,
    spread: 0,
    color: { color: "#000000", opacity: 0.08 }, // ← .color + .opacity, not r/g/b/a
    hidden: false,
  },
];
```

### Glassmorphism recipe (20px standard)

```javascript
// Semi-transparent surface + blur + subtle border + shadow
function glassPanel(
  parent,
  name,
  x,
  y,
  w,
  h,
  surfaceColor = "#FFFFFF",
  surfaceOpacity = 0.8,
  blurValue = 20,
  borderRadius = 16,
) {
  const panel = penpot.createRectangle();
  panel.name = name;
  panel.resize(w, h);
  panel.borderRadius = borderRadius;
  panel.fills = [{ fillColor: surfaceColor, fillOpacity: surfaceOpacity }];
  panel.blurs = [{ type: "layer-blur", value: blurValue, hidden: false }];
  panel.shadows = [
    {
      style: "drop-shadow",
      offsetX: 0,
      offsetY: 4,
      blur: 16,
      spread: 0,
      color: { color: "#000000", opacity: 0.08 },
      hidden: false, // adjust color/opacity to match your palette
    },
  ];
  parent.appendChild(panel);
  penpotUtils.setParentXY(panel, x, y);
  return panel;
}
```

### Strokes

```javascript
shape.strokes = [
  {
    strokeColor: "#2e3434",
    strokeOpacity: 1,
    strokeStyle: "solid", // 'solid' | 'dashed' | 'dotted' | 'mixed' | 'none'
    strokeWidth: 2,
    strokeAlignment: "center", // 'center' | 'inner' | 'outer'
  },
];
```

---

## 9. storage Global: Cross-Call State

The `storage` object persists across all `execute_code` calls within a single MCP session. Use it to share large data structures (design tokens, color palettes, component lists) between calls without re-computing or re-passing them.

```javascript
// ── Call 1: store design system data ──
const DS = { colors: { primary: "#RRGGBB" }, typography: [] };
storage.designSystem = DS;
return { stored: true, colorCount: Object.keys(DS.colors).length };
```

```javascript
// ── Call 2+: retrieve from storage ──
const fallback = { colors: {}, typography: [] };
const DS = storage.designSystem || fallback; // fallback if session reset
const C = DS.colors;

// Pattern for processing queues
storage.shapesToProcess = allShapes.map((s) => s.id);
storage.processed = [];

// Later call:
const id = storage.shapesToProcess.shift();
const shape = penpotUtils.findShapeById(id);
storage.processed.push(id);
return {
  remaining: storage.shapesToProcess.length,
  done: storage.processed.length,
};
```

> **Note:** `storage` is session-scoped — it resets when the MCP server is restarted. Always use `|| fallback` when reading from storage.

---

## 10. Idempotency Helpers

Always use idempotent helpers for design system construction — calls will often be retried after partial failures.

```javascript
// Idempotent set creation
function ensureSet(name) {
  return (
    penpot.library.local.tokens.sets.find((s) => s.name === name) ||
    penpot.library.local.tokens.addSet({ name })
  );
}

// Idempotent token addition
function addToken(set, type, name, value) {
  return (
    set.tokens.find((t) => t.name === name && t.type === type) ||
    set.addToken({ type, name, value: String(value) })
  );
}

// Idempotent color creation
function ensureColor(name, hex) {
  return (
    penpot.library.local.colors.find((c) => c.name === name) ||
    (() => {
      const c = penpot.library.local.createColor();
      c.name = name;
      c.color = hex;
      return c;
    })()
  );
}

// Idempotent typography creation
function ensureTypography(
  name,
  fontFamilies,
  weight,
  size,
  lineHeight,
  letterSpacing,
) {
  return (
    penpot.library.local.typographies.find((t) => t.name === name) ||
    (() => {
      const t = penpot.library.local.createTypography();
      t.name = name;
      t.fontFamilies = fontFamilies;
      t.fontWeight = weight;
      t.fontSize = size;
      t.lineHeight = lineHeight;
      t.letterSpacing = letterSpacing;
      return t;
    })()
  );
}

// Idempotent page creation + navigation
function ensurePage(name) {
  const existing = penpotUtils.getPageByName(name);
  if (existing) {
    penpot.openPage(existing);
    return penpot.currentPage;
  }
  const page = penpot.createPage();
  page.name = name;
  penpot.openPage(page);
  return page;
}

// Idempotent board creation
function ensureBoard(name, x, y, w, h, fill = "#F5F5F5") {
  const existing = penpotUtils.findShape(
    (s) => s.type === "board" && s.name === name,
  );
  if (existing) return existing;
  const board = penpot.createBoard();
  board.name = name;
  board.resize(w, h);
  board.x = x;
  board.y = y;
  board.fills = [{ fillColor: fill, fillOpacity: 1 }];
  return board;
}

// Clear boards by name prefix (useful for re-runs)
function clearBoards(prefix) {
  penpotUtils
    .findShapes(
      (s) => s.type === "board" && s.name.startsWith(prefix),
      penpot.root,
    )
    .forEach((s) => s.remove());
}
```

---

## 11. Design System Discovery

Run this before any design work:

```javascript
const allShapes = penpotUtils.findShapes(() => true, penpot.root);

// Colors in use on current page
const colors = new Set();
allShapes.forEach((s) => {
  if (s.fills)
    s.fills.forEach((f) => {
      if (f.fillColor) colors.add(f.fillColor);
    });
  if (s.strokes)
    s.strokes.forEach((st) => {
      if (st.strokeColor) colors.add(st.strokeColor);
    });
});

// Library assets
const components = penpot.library.local.components;
const colorStyles = penpot.library.local.colors;
const typographies = penpot.library.local.typographies;
const catalog = penpot.library.local.tokens;

// Prototype coverage
const boardsWithInteractions = allShapes
  .filter((s) => s.type === "board" && s.interactions?.length > 0)
  .map((s) => ({ name: s.name, count: s.interactions.length }));

// All pages
const pages = penpotUtils.getPages().map((p) => {
  const page = penpotUtils.getPageByName(p.name);
  return {
    name: p.name,
    boardCount: page ? page.findShapes({ type: "board" }).length : 0,
  };
});

return {
  pages,
  uniqueColorCount: colors.size,
  colorStyleCount: colorStyles.length,
  componentCount: components.length,
  typographyCount: typographies.length,
  tokenSetCount: catalog.sets.length,
  tokenThemeCount: catalog.themes.length,
  boardsWithInteractions,
  textStyleSample: [
    ...new Set(
      allShapes
        .filter((s) => s.type === "text")
        .map((s) => `${s.fontFamily} ${s.fontSize}/${s.fontWeight}`),
    ),
  ].slice(0, 10),
};
```

---

## 12. Board Positioning

### On current page

```javascript
// Find rightmost edge for next board
const boards = penpotUtils.findShapes((s) => s.type === "board", penpot.root);
let nextX = 0;
const GAP = 100;
boards.forEach((b) => {
  const edge = b.x + b.width;
  if (edge + GAP > nextX) nextX = edge + GAP;
});

const newBoard = penpot.createBoard();
newBoard.resize(375, 812);
newBoard.x = nextX; // ← direct assignment OK for root-level boards
newBoard.y = 0;
return { placedAt: { x: nextX, y: 0 } };
```

### Across multiple pages

```javascript
// Example — replace page names and canvas sizes to match your project
const pageDefs = [
  { name: "Foundations", w: 1600, h: 900 },
  { name: "Mobile", w: 1440, h: 900 },
  { name: "Desktop", w: 1600, h: 900 },
];
// NOTE: create all pages first, then write boards in separate calls per page
```

**Conventions:**

- 100px gap → related screens (same flow)
- 200px+ gap → separate flows or sections
- Wireframes left → final design right

---

## 13. CSS Export

```javascript
const selection = penpot.selection;
if (!selection || selection.length === 0) return "No shape selected";
const css = penpot.generateStyle(selection[0], {
  type: "css",
  includeChildren: true,
});
return css;
```

> `export_shape` (raster/SVG file) may fail with HTTP errors in remote MCP. Always verify structurally via API. Export is best-effort.

---

## 14. Interactions, Flows & Animations

### Interaction model

```typescript
interface Interaction {
  trigger: Trigger; // 'click' | 'mouse-enter' | 'mouse-leave' | 'after-delay'
  delay?: number | null; // ms; only for 'after-delay'
  action: Action;
  remove(): void;
}
type Action =
  | NavigateTo
  | OpenOverlay
  | ToggleOverlay
  | CloseOverlay
  | PreviousScreen
  | OpenUrl;
```

### Animation types

```typescript
{ type: 'dissolve', duration: 300, easing?: 'linear'|'ease'|'ease-in'|'ease-out'|'ease-in-out' }
{ type: 'slide', way: 'in'|'out', direction: 'left'|'right'|'up'|'down', duration: 300, easing?: ... }
{ type: 'push', direction: 'left'|'right'|'up'|'down', duration: 300, easing?: ... }
```

### Add interactions

```javascript
const home = penpotUtils.findShape((s) => s.name === "Home");
const detail = penpotUtils.findShape((s) => s.name === "Detail");

// Navigate with animation
home.addInteraction("click", {
  type: "navigate-to",
  destination: detail,
  animation: { type: "dissolve", duration: 300, easing: "ease-in-out" },
});

// After-delay (splash screen)
home.addInteraction(
  "after-delay",
  { type: "navigate-to", destination: detail },
  2000,
);

// Open overlay
const modal = penpotUtils.findShape((s) => s.name === "overlay/confirm-delete");
home.addInteraction("click", {
  type: "open-overlay",
  destination: modal,
  position: "center",
  closeWhenClickOutside: true,
  addBackgroundOverlay: true,
  animation: { type: "dissolve", duration: 200 },
});
```

### Create prototype flow via API

```javascript
// Flows (prototype entry points) can be created directly via Page API
const page = penpot.currentPage;
const entryBoard = penpotUtils.findShape(
  (s) => s.name === "/flows/onboarding-start",
);
page.createFlow("Onboarding", entryBoard);
// page.flows returns all Flow objects on the page
```

### Animation duration guide

| 100ms | subtle state change (toggle, checkbox) |
| 200ms | component transition (modal open) |
| 300ms | screen navigation |
| 400ms+ | deliberate (onboarding, hero) |

---

## 15. Validation Patterns

```javascript
const allBoards = penpotUtils.findShapes(
  (s) => s.type === "board",
  penpot.root,
);
const allBoardNames = new Set(allBoards.map((b) => b.name));

// Accessibility checks
const tinyText = penpotUtils.findShapes(
  (s) => s.type === "text" && Number(s.fontSize) < 12,
  penpot.root,
);
const hardCodedFills = penpotUtils.findShapes(
  (s) => s.fills?.some((f) => f.fillColor && !f.fillColorRefId),
  penpot.root,
);

// Naming checks
const autoNamed = penpotUtils.findShapes(
  (s) => /^(Rectangle|Ellipse|Text|Group|Frame|Board)\s*\d+$/.test(s.name),
  penpot.root,
);

// Prototype coverage
const unwiredBoards = allBoards
  .filter((b) => !b.interactions?.length)
  .map((b) => b.name);
const brokenInteractions = allBoards
  .flatMap((b) =>
    (b.interactions || []).map((i) => ({
      source: b.name,
      dest: i.action.destination?.name,
      broken:
        i.action.destination && !allBoardNames.has(i.action.destination.name),
    })),
  )
  .filter((i) => i.broken);

// Token coverage
const tokenSetNames = penpot.library.local.tokens.sets.map((s) => s.name);

// Nesting depth
function getDepth(shape, d = 0) {
  if (!shape.children?.length) return d;
  return Math.max(...shape.children.map((c) => getDepth(c, d + 1)));
}

return {
  tinyTextCount: tinyText.length,
  hardCodedFillCount: hardCodedFills.length,
  autoNamedCount: autoNamed.length,
  unwiredBoardCount: unwiredBoards.length,
  unwiredBoards,
  brokenInteractions,
  tokenSetNames,
  maxNestingDepth: getDepth(penpot.root),
};
```

---

## 16. Platform Layout Templates

### Mobile (375×812)

```text
┌─────────────────────────────┐
│ Status Bar          (44px)  │
├─────────────────────────────┤
│ Header / Nav        (56px)  │
├─────────────────────────────┤
│ Content (scrollable) 16px H │
├─────────────────────────────┤
│ Bottom Nav / CTA    (84px)  │
└─────────────────────────────┘
```

### Tablet (768×1024)

- Content max-width: 680px centered; side margins: 44px
- Common layout: 2-column grid or navigation rail + content
- Overlay max-width: ~50% of screen

### Desktop Dashboard (1440×900)

```text
┌──────┬──────────────────────────────────┐
│Sidebar│ Header                  (64px)  │
│ 240px ├──────────────────────────────────┤
│       │ Content Grid (4-col, gap 24px)   │
└──────┴──────────────────────────────────┘
```

### Create platform boards

```javascript
const platforms = [
  { name: "Mobile", w: 375, h: 812 },
  { name: "Tablet", w: 768, h: 1024 },
  { name: "Desktop", w: 1440, h: 900 },
];
let x = 0;
platforms.forEach(({ name, w, h }) => {
  const b = penpot.createBoard();
  b.name = name;
  b.resize(w, h);
  b.x = x;
  b.y = 0;
  x += w + 100;
});
```

---

## 17. Default Design Tokens (Fallback)

**Only when no existing design system. Always prefer discovered tokens.**

### Spacing (8px base)

| Token         | Value | Usage            |
| ------------- | ----- | ---------------- |
| `spacing-xs`  | 4px   | Tight inline     |
| `spacing-sm`  | 8px   | Related elements |
| `spacing-md`  | 16px  | Default padding  |
| `spacing-lg`  | 24px  | Section spacing  |
| `spacing-xl`  | 32px  | Major sections   |
| `spacing-2xl` | 48px  | Page-level       |

### Typography scale

| Level   | Size    | Weight |
| ------- | ------- | ------ |
| Display | 48–64px | 700    |
| H1      | 32–40px | 700    |
| H2      | 24–28px | 600    |
| H3      | 20–22px | 600    |
| Body    | 16px    | 400    |
| Small   | 14px    | 400    |
| Caption | 12px    | 400    |

### Semantic colors

| Role    | Example       |
| ------- | ------------- |
| Primary | Brand-defined |
| Success | #22C55E range |
| Warning | #F59E0B range |
| Error   | #EF4444 range |

### Border radius

| Token            | Value  | Usage                  |
| ---------------- | ------ | ---------------------- |
| `radius-sm`      | 4px    | Inputs, tags           |
| `radius-md`      | 8px    | Cards                  |
| `radius-lg`      | 16px   | Panels                 |
| `radius-full`    | 9999px | Pills, avatars         |
| `radius-overlay` | 20px   | Overlays, glass panels |

---

## 18. Component Checklists

### Buttons

- [ ] Min touch target 44×44px (iOS) / 48×48dp (Android)
- [ ] States: default, hover, active, disabled, loading
- [ ] WCAG AA contrast (3:1 large, 4.5:1 small text)
- [ ] Consistent border-radius

### Form inputs

- [ ] Label above input (never placeholder-only)
- [ ] States: default, focus, error, disabled
- [ ] Error adjacent to field; min height 44px

### Navigation

- [ ] Active state indicated; max 7±2 items
- [ ] Touch targets 48px minimum on mobile

### Cards

- [ ] Clear hierarchy; hover/focus if interactive; empty state defined

### Prototype checklist

- [ ] Flow entry boards named `/flows/*` and defined (API or Prototype panel)
- [ ] All click targets have interactions
- [ ] No broken interaction destinations
- [ ] Overlay boards prefixed `overlay/`
- [ ] Animation durations match content weight (100/200/300ms)

### Pre-handoff review

- [ ] Visual hierarchy unambiguous
- [ ] All spacing from token scale
- [ ] Body text ≥16px; all text WCAG AA contrast
- [ ] Loading / empty / error states designed
- [ ] All layers semantically named
- [ ] No hard-coded colors or spacing
- [ ] Interactions wired and verified
