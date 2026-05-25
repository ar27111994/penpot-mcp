# Penpot API Patterns

Concrete JavaScript for `execute_code`, critical gotchas, font/typography constraints, interactions, animations, discovery, positioning, and component checklists.

## Table of Contents
1. [Always Check Connection First](#1-always-check-connection-first)
2. [Core API Reference](#2-core-api-reference)
3. [CRITICAL API Gotchas](#3-critical-api-gotchas)
4. [Font & Typography Constraints](#4-font--typography-constraints)
5. [Design System Discovery](#5-design-system-discovery)
6. [Board Positioning](#6-board-positioning)
7. [CSS Export](#7-css-export)
8. [Interactions, Flows & Animations](#8-interactions-flows--animations)
9. [Validation Patterns](#9-validation-patterns)
10. [Platform Layout Templates](#10-platform-layout-templates)
11. [Default Design Tokens (Fallback)](#11-default-design-tokens-fallback)
12. [Component Checklists](#12-component-checklists)

---

## 1. Always Check Connection First

```
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
// Page structure
penpotUtils.shapeStructure(penpot.root);
penpotUtils.findShapes(s => s.type === 'text', penpot.root);
penpotUtils.findShapes(s => s.name.startsWith('icon'), penpot.root);
penpotUtils.findShapes(() => true, penpot.root); // all shapes
penpotUtils.analyzeDescendants(penpot.root);

// Library
penpot.library.local.components;
penpot.library.local.colors;
penpot.library.local.typographies;  // typography styles

// Interactions on a shape
const board = penpotUtils.findShapes(s => s.name === 'Home', penpot.root)[0];
board.interactions;  // Interaction[]
```

### Create operations
```javascript
const board   = penpot.createBoard();
const rect    = penpot.createRectangle();
const text    = penpot.createText('Hello');
const ellipse = penpot.createEllipse();

// Layout on a container
board.addFlexLayout();
board.addGridLayout();

// Z-ordering (NOT appendChild)
parent.insertChild(0, shape);  // index 0 = bottom of stack
```

### Modify operations
```javascript
// SIZE — always resize(), never direct assignment
shape.resize(400, 300);   // ✅
shape.width = 400;        // ❌ READ-ONLY

// POSITION — always utility for parented shapes
penpotUtils.setParentXY(shape, 100, 200);  // ✅
shape.x = 100;            // ❌ READ-ONLY on parented shapes

// Text grow behavior (MUST reset after every resize)
text.resize(200, 0);
text.growType = 'auto-height';  // 'auto-width' | 'auto-height' | 'fixed'

// Fills
shape.fills = [{ fillColor: '#3451B2', fillOpacity: 1 }];

// Typography on a text layer (numbers OK here)
text.fontFamily = 'Inter';
text.fontSize   = 16;        // number OK on text layers
text.fontWeight = '400';     // string always safe
text.lineHeight = 1.5;

// Flex layout
const layout = board.addFlexLayout();
layout.dir = 'row';            // 'row' | 'column' | 'row-reverse' | 'column-reverse'
layout.gap = 16;
layout.padding = { top: 16, right: 16, bottom: 16, left: 16 };
layout.justifyContent = 'center';   // 'start' | 'center' | 'end' | 'space-between'
layout.alignItems = 'center';       // 'start' | 'center' | 'end' | 'stretch'

// Blend mode, opacity, shadows, blur
shape.opacity = 0.9;
shape.blendMode = 'multiply';  // 'normal' | 'multiply' | 'screen' | 'overlay' | ...
shape.shadows = [{ style: 'drop-shadow', offsetX: 0, offsetY: 4, blur: 8, spread: 0, color: { r: 0, g: 0, b: 0, a: 0.15 } }];
```

### Clone and remove
```javascript
const clone = shape.clone();      // clones to same parent
shape.remove();                   // removes shape from page
interaction.remove();             // removes specific interaction
```

### Plugin data (persistent metadata per shape)
```javascript
shape.setPluginData('my-key', 'my-value');
const val = shape.getPluginData('my-key');
const keys = shape.getPluginDataKeys();

// Shared across plugins (namespace required)
shape.setSharedPluginData('design-system', 'token-name', 'color.primary.500');
```

---

## 3. CRITICAL API Gotchas

| Property / Behaviour | Status | Correct Approach |
|----------------------|--------|-----------------|
| `shape.width` / `shape.height` | ❌ READ-ONLY | `shape.resize(w, h)` |
| `shape.parentX` / `shape.parentY` | ❌ READ-ONLY | `penpotUtils.setParentXY(shape, x, y)` |
| Z-ordering via `appendChild` | ❌ Ignores order | `insertChild(index, shape)` |
| Text clips after `resize()` | ⚠️ Reset required | Set `growType` after every `text.resize()` |
| Flex children order | ⚠️ Reversed | For column: last inserted = visually top |
| Page switch + write in same call | ❌ Writes to wrong page | Two calls: switch then write |
| Large batch writes | ⚠️ Silent timeout/partial | Max ~10 ops per call; verify after |
| `export_shape` HTTP error | ⚠️ Unreliable | Verify structurally; don't rely on export |

### Flex children reversal (critical)
```javascript
// Column containers: LAST inserted = visually TOP
container.insertChild(0, footer);   // bottom
container.insertChild(1, content);  // middle
container.insertChild(2, header);   // top ← counter-intuitive
```

### Text resize + growType (always pair)
```javascript
const label = penpot.createText('Button Label');
label.resize(120, 0);
label.growType = 'auto-height';  // MUST follow every resize
label.fontSize = 14;
label.fontWeight = '500';
```

### Batch size discipline
```javascript
// DO: small verifiable batches
for (let i = 0; i < shapes.length; i += 5) {
  const batch = shapes.slice(i, i + 5);
  // process batch
  // return partial results so caller can verify before continuing
}
```

---

## 4. Font & Typography Constraints

These are the most common silent failure source in typography work.

### Font weight — must match installed variants
Penpot rejects weights not explicitly installed for a font family. Do not assume standard weights exist.

```javascript
// Step 1: discover what's actually installed
const typos = penpot.library.local.typographies;
// Each typography has: fontFamily, fontStyle, fontWeight, fontSize (string), ...

// Step 2: extract installed weights for a family
const interVariants = typos.filter(t => t.fontFamily === 'Inter 28pt');
const installedWeights = interVariants.map(t => t.fontWeight);
// e.g. ['100', '200', '300', '400', '500', '600', '700', '800', '900']

// Step 3: only use confirmed weights
// From Ahmed's fonts screenshot: Inter 28pt has Hairline(100), ExtraLight(200),
// Light(300), Regular(400), Medium(500), SemiBold(600), Bold(700),
// ExtraBold(800), Black(900) — and their Italic variants
```

### Library typography fontSize — must be string
```javascript
// Library typographies (penpot.library.local.typographies)
typography.fontSize = '16';   // ✅ string required for library styles
typography.fontWeight = '700'; // ✅ string always

// Text layer shapes — numbers also accepted
textShape.fontSize = 16;      // ✅ number OK on rendered text layers
textShape.fontWeight = '700'; // ✅ string always safe
```

### fontId stale after typography style update
```javascript
// Known API limitation: when you update fontFamily/fontWeight on a library
// typography style, the internal `fontId` field (e.g. 'sourcesanspro') does
// NOT update automatically. This is a Penpot library-style limitation.
// Rendered text layers on the canvas DO use the correct installed font IDs.
// Do not attempt to patch fontId — it will be ignored or cause errors.
// Workaround: delete and recreate the typography style if fontId staleness
// causes visual issues.
```

### Font size discovery before applying
```javascript
// Always discover installed typographies before creating or modifying
const installedTypographies = penpot.library.local.typographies;
return installedTypographies.map(t => ({
  name: t.name,
  fontFamily: t.fontFamily,
  fontWeight: t.fontWeight,
  fontSize: t.fontSize,      // string
  fontStyle: t.fontStyle,    // 'normal' | 'italic'
}));
```

---

## 5. Design System Discovery

Run this before any design work:

```javascript
const allShapes = penpotUtils.findShapes(() => true, penpot.root);

// Colors in use
const colors = new Set();
allShapes.forEach(s => {
  if (s.fills) s.fills.forEach(f => { if (f.fillColor) colors.add(f.fillColor); });
  if (s.strokes) s.strokes.forEach(st => { if (st.strokeColor) colors.add(st.strokeColor); });
});

// Text styles in use
const textStyles = allShapes
  .filter(s => s.type === 'text')
  .map(s => ({ fontFamily: s.fontFamily, fontSize: s.fontSize, fontWeight: s.fontWeight }));

// Library assets
const components  = penpot.library.local.components;
const colorStyles = penpot.library.local.colors;
const typographies = penpot.library.local.typographies;

// Interactions audit
const boardsWithInteractions = allShapes
  .filter(s => s.type === 'board' && s.interactions && s.interactions.length > 0)
  .map(s => ({ name: s.name, interactionCount: s.interactions.length }));

return {
  uniqueColorCount: colors.size,
  colorStyleCount: colorStyles.length,
  componentCount: components.length,
  typographyCount: typographies.length,
  boardsWithInteractions,
  textStyleSample: [...new Set(textStyles.map(t => `${t.fontFamily} ${t.fontSize}/${t.fontWeight}`))].slice(0, 10),
};
```

**Interpret results:**
- Many unique colors + low `colorStyleCount` → hard-coded values, token migration needed
- Low `componentCount` → early-stage file
- Boards with 0 interactions → prototype not yet wired

---

## 6. Board Positioning

Always check existing positions before creating boards:

```javascript
const boards = penpotUtils.findShapes(s => s.type === 'board', penpot.root);
let nextX = 0;
const GAP = 100; // related screens; use 200+ for separate flows

boards.forEach(b => {
  const rightEdge = b.x + b.width;
  if (rightEdge + GAP > nextX) nextX = rightEdge + GAP;
});

const newBoard = penpot.createBoard();
newBoard.resize(375, 812);
penpotUtils.setParentXY(newBoard, nextX, 0);

return { placedAt: { x: nextX, y: 0 } };
```

**Conventions:**
- 100px gap → related screens (same flow)
- 200px+ gap → separate flows or sections
- Align `y` across related boards for horizontal readability
- Wireframes left → final design right

---

## 7. CSS Export

```javascript
const selection = penpot.selection;
if (!selection || selection.length === 0) return 'No shape selected';
const shape = selection[0];
const css = penpot.generateStyle(shape, { type: 'css', includeChildren: true });
return css;
```

> **Note:** `export_shape` (raster/SVG file export) may fail with HTTP errors in remote MCP. For verification, always use structural API checks (reading shape properties) rather than relying on export success. Export is best-effort.

---

## 8. Interactions, Flows & Animations

Full official API from `doc.plugins.penpot.app`.

### Interaction model

```typescript
interface Interaction {
  shape?: Shape;                  // shape that owns the interaction
  trigger: Trigger;               // what starts it
  delay?: number | null;          // ms; only for 'after-delay' trigger
  action: Action;                 // what happens
  remove(): void;
}

type Trigger = 'click' | 'mouse-enter' | 'mouse-leave' | 'after-delay';

type Action =
  | NavigateTo       // go to another board
  | OpenOverlay      // show overlay board
  | ToggleOverlay    // toggle overlay
  | CloseOverlay     // close overlay
  | PreviousScreen   // go back
  | OpenUrl;         // open external URL
```

### Animation types

```typescript
// Dissolve — cross-fade
{ type: 'dissolve', duration: 300, easing?: 'linear'|'ease'|'ease-in'|'ease-out'|'ease-in-out' }

// Slide — directional wipe
{ type: 'slide', way: 'in'|'out', direction: 'left'|'right'|'up'|'down',
  duration: 300, offsetEffect?: boolean, easing?: ... }

// Push — push current screen off
{ type: 'push', direction: 'left'|'right'|'up'|'down', duration: 300, easing?: ... }
```

### Add interactions via API

```javascript
// Find source and destination boards
const boards = penpotUtils.findShapes(s => s.type === 'board', penpot.root);
const home    = boards.find(b => b.name === 'Home');
const detail  = boards.find(b => b.name === 'Detail');

if (!home || !detail) return 'Boards not found';

// Simple click → navigate
home.addInteraction('click', { type: 'navigate-to', destination: detail });

// With animation
home.addInteraction('click', {
  type: 'navigate-to',
  destination: detail,
  preserveScrollPosition: false,
  animation: { type: 'dissolve', duration: 300, easing: 'ease-in-out' }
});

// After-delay auto-advance (e.g. splash screen)
home.addInteraction(
  'after-delay',
  { type: 'navigate-to', destination: detail },
  2000   // delay in ms
);

// Open overlay (modal/tooltip)
const modal = boards.find(b => b.name === 'overlay/confirm-delete');
const button = penpotUtils.findShapes(s => s.name === 'btn-delete', home)[0];
button.addInteraction('click', {
  type: 'open-overlay',
  destination: modal,
  position: 'center',
  closeWhenClickOutside: true,
  addBackgroundOverlay: true,
  animation: { type: 'dissolve', duration: 200 }
});

// Remove an interaction
home.interactions.forEach(i => i.remove());  // clear all
```

### Read and audit interactions

```javascript
const allBoards = penpotUtils.findShapes(s => s.type === 'board', penpot.root);
const boardNames = new Set(allBoards.map(b => b.name));

return allBoards.flatMap(board =>
  (board.interactions || []).map(ix => ({
    source: board.name,
    trigger: ix.trigger,
    actionType: ix.action.type,
    destination: ix.action.destination?.name ?? 'n/a',
    brokenDestination: ix.action.destination
      ? !boardNames.has(ix.action.destination.name)
      : false,
    animation: ix.action.animation?.type ?? 'none',
    delay: ix.delay ?? 0
  }))
);
```

### Flow definition (prototype entry points)

Flows are defined in Penpot's Prototype panel per board (not via the Plugin API directly). Agent prompts for flows:

```
"List all boards on this page. Identify which should be flow entry points
(first screen of a user journey). Name them following the pattern:
/flows/[journey-name]-start (e.g. /flows/onboarding-start).
Do not create flows via API — list the boards and I will define flows
in the Prototype panel manually."
```

### Animation duration guide
- 100ms → subtle state change (toggle, checkbox)
- 200ms → component-level transition (modal open, dropdown)
- 300ms → screen-level navigation (page transition)
- 300ms+ → deliberate, noticeable (onboarding, hero animation)

---

## 9. Validation Patterns

```javascript
// Text smaller than minimum
const tinyText = penpotUtils.findShapes(
  s => s.type === 'text' && s.fontSize < 12, penpot.root
);

// Hard-coded fills (no token reference)
const hardCodedFills = penpotUtils.findShapes(s => {
  if (!s.fills || s.fills.length === 0) return false;
  return s.fills.some(f => f.fillColor && !f.fillColorRefId);
}, penpot.root);

// Auto-named layers
const autoNamed = penpotUtils.findShapes(
  s => /^(Rectangle|Ellipse|Text|Group|Frame|Board)\s*\d+$/.test(s.name),
  penpot.root
);

// Boards with no interactions (prototype coverage)
const unwiredBoards = penpotUtils.findShapes(s => s.type === 'board', penpot.root)
  .filter(b => !b.interactions || b.interactions.length === 0)
  .map(b => b.name);

// Broken interactions (destination board deleted)
const allBoardNames = new Set(
  penpotUtils.findShapes(s => s.type === 'board', penpot.root).map(b => b.name)
);
const brokenInteractions = penpotUtils.findShapes(s => s.type === 'board', penpot.root)
  .flatMap(b => (b.interactions || []).map(i => ({
    source: b.name,
    destination: i.action.destination?.name,
    broken: i.action.destination && !allBoardNames.has(i.action.destination.name)
  })))
  .filter(i => i.broken);

// Nesting depth
function getDepth(shape, depth = 0) {
  if (!shape.children || shape.children.length === 0) return depth;
  return Math.max(...shape.children.map(c => getDepth(c, depth + 1)));
}

return {
  tinyTextCount: tinyText.length,
  hardCodedFillCount: hardCodedFills.length,
  autoNamedCount: autoNamed.length,
  unwiredBoardCount: unwiredBoards.length,
  unwiredBoards,
  brokenInteractions,
  maxNestingDepth: getDepth(penpot.root),
};
```

---

## 10. Platform Layout Templates

### Mobile (375×812)
```
┌─────────────────────────────┐
│ Status Bar          (44px)  │
├─────────────────────────────┤
│ Header / Nav        (56px)  │
├─────────────────────────────┤
│ Content Area (scrollable)   │
│ H-padding: 16px             │
├─────────────────────────────┤
│ Bottom Nav / CTA    (84px)  │
└─────────────────────────────┘
```

### Tablet (768×1024)
- Content max-width: 680px centered; side margins: 44px
- 2-column grid for main content

### Desktop Dashboard (1440×900)
```
┌──────┬──────────────────────────────────┐
│Sidebar│ Header                  (64px)  │
│ 240px ├──────────────────────────────────┤
│       │ Content Grid (4-col, gap 24px)   │
└──────┴──────────────────────────────────┘
Content area: 1440 - 240 = 1200px
```

### Create platform boards via API
```javascript
const platforms = [
  { name: 'Mobile',  w: 375,  h: 812  },
  { name: 'Tablet',  w: 768,  h: 1024 },
  { name: 'Desktop', w: 1440, h: 900  },
];
let x = 0;
platforms.forEach(({ name, w, h }) => {
  const board = penpot.createBoard();
  board.name = name;
  board.resize(w, h);
  penpotUtils.setParentXY(board, x, 0);
  x += w + 100;
});
```

---

## 11. Default Design Tokens (Fallback)

**Only when no existing design system is present. Always prefer discovered tokens.**

### Spacing (8px base)
| Token | Value | Usage |
|-------|-------|-------|
| `spacing-xs` | 4px | Tight inline |
| `spacing-sm` | 8px | Related elements |
| `spacing-md` | 16px | Default padding |
| `spacing-lg` | 24px | Section spacing |
| `spacing-xl` | 32px | Major sections |
| `spacing-2xl` | 48px | Page-level |

### Typography scale
| Level | Size | Weight | Usage |
|-------|------|--------|-------|
| Display | 48–64px | 700 | Hero |
| H1 | 32–40px | 700 | Page title |
| H2 | 24–28px | 600 | Section |
| H3 | 20–22px | 600 | Subsection |
| Body | 16px | 400 | Content |
| Small | 14px | 400 | Secondary |
| Caption | 12px | 400 | Labels |

### Semantic colors (role-based)
| Role | Usage | Example |
|------|-------|---------|
| Primary | CTAs, brand | User-defined |
| Success | Confirmations | #22C55E range |
| Warning | Caution | #F59E0B range |
| Error | Destructive | #EF4444 range |
| Neutral | Text, borders, BG | Gray scale |

### Border radius
| Token | Value | Usage |
|-------|-------|-------|
| `radius-sm` | 4px | Inputs, tags |
| `radius-md` | 8px | Cards, modals |
| `radius-lg` | 16px | Large panels |
| `radius-full` | 9999px | Pills, avatars |

---

## 12. Component Checklists

### Buttons
- [ ] Min touch target 44×44px
- [ ] States: default, hover, active, disabled, loading
- [ ] WCAG AA contrast (3:1 for large, 4.5:1 for small text)
- [ ] Consistent border-radius

### Form inputs
- [ ] Label above input (never placeholder-only)
- [ ] States: default, focus, error, disabled
- [ ] Error message adjacent to field
- [ ] Min height 44px

### Navigation
- [ ] Active state clearly indicated
- [ ] Max 7±2 top-level items
- [ ] Touch targets 48px minimum on mobile

### Cards
- [ ] Clear hierarchy: title, body, action
- [ ] Hover/focus state if interactive
- [ ] Empty state defined

### Prototype / interaction checklist
- [ ] All flow entry boards named and defined in Prototype panel
- [ ] All click targets have interactions
- [ ] No broken interaction destinations
- [ ] Overlay boards named with `overlay/` prefix
- [ ] Animation durations match content weight (100/200/300ms guide)
- [ ] `after-delay` triggers have appropriate delay (not too short)

### Pre-handoff review
- [ ] Visual hierarchy unambiguous
- [ ] All spacing from token scale
- [ ] Body text ≥16px
- [ ] All text WCAG AA contrast
- [ ] Loading / empty / error states designed
- [ ] All layers semantically named
- [ ] No hard-coded colors or spacing
- [ ] Interactions wired and verified (no broken destinations)
