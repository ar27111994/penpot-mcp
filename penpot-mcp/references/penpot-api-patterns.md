# Penpot API Patterns

Concrete JavaScript patterns for the `execute_code` tool, critical API gotchas, design system discovery, platform defaults, and component checklists.

## Table of Contents
1. [Always Check Connection First](#1-always-check-connection-first)
2. [Core API Reference](#2-core-api-reference)
3. [CRITICAL API Gotchas](#3-critical-api-gotchas)
4. [Design System Discovery](#4-design-system-discovery)
5. [Board Positioning](#5-board-positioning)
6. [CSS Export](#6-css-export)
7. [Validation Patterns](#7-validation-patterns)
8. [Platform Layout Templates](#8-platform-layout-templates)
9. [Default Design Tokens (Fallback)](#9-default-design-tokens-fallback)
10. [Component Checklists](#10-component-checklists)

---

## 1. Always Check Connection First

Before any setup instructions, **attempt a tool call first**:

```
Call: mcp__penpot__penpot_api_info (or high_level_overview)
```
- If it **succeeds** → server is running. No setup needed. Proceed to the task.
- If it **fails** → ask: *"The Penpot MCP server doesn't appear to be connected. Is it already installed and running? I can help troubleshoot, or guide you through setup."*
- Only walk through setup if the user confirms the server is not installed.

---

## 2. Core API Reference

All code runs via `mcp__penpot__execute_code`. The Penpot plugin context exposes:

### Read operations

```javascript
// Get full shape hierarchy of current page
penpotUtils.shapeStructure(penpot.root);

// Find shapes by predicate
penpotUtils.findShapes(s => s.type === 'text', penpot.root);
penpotUtils.findShapes(s => s.name.startsWith('icon'), penpot.root);
penpotUtils.findShapes(() => true, penpot.root); // all shapes

// Analyze descendants
penpotUtils.analyzeDescendants(penpot.root);

// Get local library components
penpot.library.local.components;

// Get all colors in file
penpot.library.local.colors;
```

### Create operations

```javascript
// Create shapes
const board = penpot.createBoard();
const rect  = penpot.createRectangle();
const text  = penpot.createText('Hello');
const ellipse = penpot.createEllipse();

// Add flex layout to a container
board.addFlexLayout();

// Insert child at z-index position (NOT appendChild for z-ordering)
parent.insertChild(0, shape);  // index 0 = bottom of stack
```

### Modify operations

```javascript
// SIZE — MUST use resize(), never assign width/height directly
shape.resize(400, 300);   // ✅
shape.width = 400;        // ❌ READ-ONLY, silently ignored

// POSITION — MUST use utility, never assign x/y directly for parented shapes
penpotUtils.setParentXY(shape, 100, 200);  // ✅ for parented shapes
shape.x = 100;            // ❌ READ-ONLY on parented shapes, use carefully

// Text grow behavior (reset after resize)
text.resize(200, 0);
text.growType = 'auto-height';  // or 'auto-width' | 'fixed'

// Fills
shape.fills = [{ fillColor: '#3451B2', fillOpacity: 1 }];

// Typography
text.fontFamily = 'Inter';
text.fontSize   = 16;
text.fontWeight = '400';
text.lineHeight = 1.5;

// Flex layout
const layout = board.addFlexLayout();
layout.dir = 'row';        // 'row' | 'column' | 'row-reverse' | 'column-reverse'
layout.gap = 16;
layout.padding = { top: 16, right: 16, bottom: 16, left: 16 };
layout.justifyContent = 'center';  // 'start' | 'center' | 'end' | 'space-between'
layout.alignItems = 'center';      // 'start' | 'center' | 'end' | 'stretch'
```

---

## 3. CRITICAL API Gotchas

These will silently break your designs if ignored:

| Property | Status | Correct approach |
|----------|--------|-----------------|
| `shape.width` | ❌ READ-ONLY | Use `shape.resize(w, h)` |
| `shape.height` | ❌ READ-ONLY | Use `shape.resize(w, h)` |
| `shape.parentX` | ❌ READ-ONLY | Use `penpotUtils.setParentXY(shape, x, y)` |
| `shape.parentY` | ❌ READ-ONLY | Use `penpotUtils.setParentXY(shape, x, y)` |
| Z-ordering | ❌ Not `appendChild` | Use `insertChild(index, shape)` |
| Text after resize | ⚠️ Reset required | Set `growType` after every `text.resize()` |
| Flex children order | ⚠️ Reversed | For `dir="column"`, last child in array = top visually |

### Flex children reversal (critical)

```javascript
// For column-direction flex containers:
// The LAST element in the children array appears at the TOP visually.
// Insert header LAST if you want it at the top.
container.insertChild(0, footer);  // appears at bottom
container.insertChild(1, content); // appears in middle
container.insertChild(2, header);  // appears at top ← counter-intuitive!
```

### Text resize + growType pattern

```javascript
const label = penpot.createText('Button Label');
label.resize(120, 0);
label.growType = 'auto-height';  // MUST set this or text may be clipped
label.fontSize = 14;
label.fontWeight = '500';
```

---

## 4. Design System Discovery

Run this before any design work to understand what tokens and patterns already exist:

```javascript
// Full discovery snapshot
const allShapes = penpotUtils.findShapes(() => true, penpot.root);

// Existing colors (from fills)
const colors = new Set();
allShapes.forEach(s => {
  if (s.fills) s.fills.forEach(f => { if (f.fillColor) colors.add(f.fillColor); });
  if (s.strokes) s.strokes.forEach(st => { if (st.strokeColor) colors.add(st.strokeColor); });
});

// Existing text styles
const textStyles = allShapes
  .filter(s => s.type === 'text')
  .map(s => ({
    fontFamily: s.fontFamily,
    fontSize: s.fontSize,
    fontWeight: s.fontWeight,
    lineHeight: s.lineHeight
  }));

// Local components
const components = penpot.library.local.components;

// Named color styles
const colorStyles = penpot.library.local.colors;

return {
  uniqueColors: [...colors],
  textStyles: textStyles.slice(0, 20), // first 20
  componentCount: components.length,
  colorStyleCount: colorStyles.length
};
```

**Interpret results:**
- Many unique colors + low `colorStyleCount` → hard-coded values, needs token migration
- Low `componentCount` → early-stage file, design system not yet established
- Clustered `textStyles` sizes → good scale discipline; scattered = no scale

---

## 5. Board Positioning

Always calculate existing board positions before creating new ones to avoid overlap:

```javascript
// Find rightmost edge and position new board after it
const boards = penpotUtils.findShapes(s => s.type === 'board', penpot.root);
let nextX = 0;
const GAP = 100; // px between related boards; use 200+ for different flows

if (boards.length > 0) {
  boards.forEach(b => {
    const rightEdge = b.x + b.width;
    if (rightEdge + GAP > nextX) nextX = rightEdge + GAP;
  });
}

// Create new board at safe position
const newBoard = penpot.createBoard();
newBoard.resize(375, 812); // resize before positioning
penpotUtils.setParentXY(newBoard, nextX, 0);

return { placedAt: { x: nextX, y: 0 } };
```

**Board spacing conventions:**
- 100px gap → related screens (same user flow)
- 200px+ gap → separate flows or sections
- Align `y` across related boards for horizontal flow readability
- Wireframes left → final design right (horizontal canvas progression)

---

## 6. CSS Export

Extract CSS directly from a selected Penpot shape via the API:

```javascript
// Get current selection
const selection = penpot.selection;
if (!selection || selection.length === 0) return 'No shape selected';

const shape = selection[0];

// Generate CSS for shape and all children
const css = penpot.generateStyle(shape, {
  type: 'css',
  includeChildren: true
});

return css;
```

**Usage pattern:**
1. In Penpot, select the frame/component you want to export
2. Run the above via `mcp__penpot__execute_code`
3. Post-process: replace hard-coded values with CSS custom property references

---

## 7. Validation Patterns

Use these to audit designs programmatically:

```javascript
// Find text smaller than minimum size
const tinyText = penpotUtils.findShapes(
  s => s.type === 'text' && s.fontSize < 12,
  penpot.root
);

// Find shapes with hard-coded colors (not token-referenced)
// Note: token-referenced fills will have a 'fillColorRefId' property
const hardCodedFills = penpotUtils.findShapes(s => {
  if (!s.fills || s.fills.length === 0) return false;
  return s.fills.some(f => f.fillColor && !f.fillColorRefId);
}, penpot.root);

// Check for unnamed/auto-named layers
const autoNamed = penpotUtils.findShapes(
  s => /^(Rectangle|Ellipse|Text|Group|Frame)\s*\d+$/.test(s.name),
  penpot.root
);

// Hierarchy depth audit
function getDepth(shape, depth = 0) {
  if (!shape.children || shape.children.length === 0) return depth;
  return Math.max(...shape.children.map(c => getDepth(c, depth + 1)));
}
const maxDepth = getDepth(penpot.root);

return {
  tinyTextCount: tinyText.length,
  hardCodedFillCount: hardCodedFills.length,
  autoNamedCount: autoNamed.length,
  maxNestingDepth: maxDepth,
  tinyTextLayers: tinyText.map(s => s.name),
};
```

---

## 8. Platform Layout Templates

Reference dimensions and structure for common screen types:

### Mobile (375×812 — iPhone standard)
```
┌─────────────────────────────┐
│ Status Bar          (44px)  │
├─────────────────────────────┤
│ Header / Nav        (56px)  │
├─────────────────────────────┤
│                             │
│ Content Area (scrollable)   │
│ H-padding: 16px             │
│                             │
├─────────────────────────────┤
│ Bottom Nav / CTA    (84px)  │
└─────────────────────────────┘
```

### Tablet (768×1024)
- Content max-width: 680px centered
- Side margins: 44px
- Use 2-column grid for main content

### Desktop Dashboard (1440×900)
```
┌──────┬──────────────────────────────────┐
│      │ Header                  (64px)   │
│      ├──────────────────────────────────┤
│ Side │ Page Title + Actions    (56px)   │
│ bar  ├──────────────────────────────────┤
│      │ Content Grid                     │
│ 240  │ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ │
│ px   │ │Card │ │Card │ │Card │ │Card │ │
│      │ └─────┘ └─────┘ └─────┘ └─────┘ │
└──────┴──────────────────────────────────┘
Content area width: 1440 - 240 = 1200px
```

### Creating platform boards via API
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

## 9. Default Design Tokens (Fallback)

**Use only when the user has no existing design system.** Always prefer discovered tokens.

### Spacing (8px base grid)
| Token | Value | Usage |
|-------|-------|-------|
| `spacing-xs` | 4px | Tight inline elements |
| `spacing-sm` | 8px | Related elements |
| `spacing-md` | 16px | Default padding |
| `spacing-lg` | 24px | Section spacing |
| `spacing-xl` | 32px | Major sections |
| `spacing-2xl` | 48px | Page-level spacing |

### Typography scale
| Level | Size | Weight | Usage |
|-------|------|--------|-------|
| Display | 48–64px | 700 | Hero headlines |
| H1 | 32–40px | 700 | Page titles |
| H2 | 24–28px | 600 | Section headers |
| H3 | 20–22px | 600 | Subsections |
| Body | 16px | 400 | Main content |
| Small | 14px | 400 | Secondary text |
| Caption | 12px | 400 | Labels, hints |

### Semantic colors (role-based)
| Role | Usage | Example range |
|------|-------|--------------|
| Primary | CTAs, brand | User-defined |
| Secondary | Supporting actions | User-defined |
| Success | Confirmations | #22C55E range |
| Warning | Caution states | #F59E0B range |
| Error | Errors, destructive | #EF4444 range |
| Neutral | Text, borders, BG | Gray scale |

### Border radius
| Token | Value | Usage |
|-------|-------|-------|
| `radius-sm` | 4px | Inputs, tags |
| `radius-md` | 8px | Cards, modals |
| `radius-lg` | 16px | Large panels |
| `radius-full` | 9999px | Pills, avatars |

---

## 10. Component Checklists

Verify these before finalizing any component.

### Buttons
- [ ] Minimum touch target: 44×44px
- [ ] Label: action-oriented, 2–3 words
- [ ] States: default, hover, active, disabled, loading
- [ ] Contrast: 3:1 against background (WCAG AA Large)
- [ ] Consistent border-radius across app
- [ ] Icon+label spacing: 8px gap

### Form inputs
- [ ] Label above input (never placeholder-only)
- [ ] Required field indicator (`*` or "Required")
- [ ] Error message adjacent to field, not tooltip
- [ ] States: default, focus, error, disabled
- [ ] Minimum height: 44px (touch target)
- [ ] Logical tab order

### Navigation
- [ ] Current location clearly indicated (active state)
- [ ] Consistent position across all screens
- [ ] Max 7±2 top-level items
- [ ] Touch targets: 48px minimum on mobile
- [ ] Keyboard accessible

### Cards
- [ ] Clear visual hierarchy within card (title, body, action)
- [ ] Consistent padding (use spacing token)
- [ ] Defined hover/focus state if interactive
- [ ] Defined empty state if data-driven

### Design review (before any handoff)
- [ ] Visual hierarchy is unambiguous
- [ ] Spacing consistent (all values from token scale)
- [ ] Body text minimum 16px
- [ ] All text WCAG AA contrast
- [ ] Interactive elements visually obvious
- [ ] Loading / empty / error states designed
- [ ] All layers semantically named
- [ ] No hard-coded color or spacing values
