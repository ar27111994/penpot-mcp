# Design System Workflows

## Table of Contents
1. [New Design System from Scratch](#1-new-design-system-from-scratch)
2. [Audit Existing Design System](#2-audit-existing-design-system)
3. [Token Migration & Normalization](#3-token-migration--normalization)
4. [Component Library Management](#4-component-library-management)
5. [Palette & Brand Update](#5-palette--brand-update)
6. [Cross-File Consistency Audit](#6-cross-file-consistency-audit)

---

## 1. New Design System from Scratch

Use when: starting a new Penpot project or setting up a design system for an existing product.

### Phase 1: Discovery (read-only)
```
"Analyze this page. Identify any existing colors, type styles, spacing values,
and components. List them in a structured format with paths and hex values."
```

### Phase 2: Token architecture proposal
```
ROLE: Senior Design Systems Engineer
TASK: Propose a 3-tier token architecture for this product.

TIER 1 (Global): Palette-level values derived from brand colors and 8px spacing.
TIER 2 (Semantic): Aliases mapping global tokens to use cases
  (bg.default, text.primary, border.subtle, etc.)
TIER 3 (Component): Per-component token mappings.

CONSTRAINTS:
- Base spacing unit: 8px
- Typography scale: 12, 14, 16, 20, 24, 32, 48
- Color palette: [describe palette or paste extracted colors]
- No magic numbers — every value must trace to Tier 1

OUTPUT FORMAT: JSON key:value compact schema, no explanations
```

### Phase 3: Apply token set
```
"Apply the approved token architecture to this file.
Create color styles for Tier 1 and Tier 2. Do not create Tier 3 yet.
Describe each token you create before applying. Apply 5 at a time, then pause."
```

### Phase 4: Typography system
```
"Create text styles from this scale: [paste scale].
Name pattern: type/{category}/{size} e.g. type/heading/2xl, type/body/md.
Weight variants: regular (400), medium (500), bold (700).
Do not create any styles not in the approved scale."
```

### Phase 5: Component scaffolding
```
"Create the following base components using only defined tokens:
- button/primary/{default, hover, active, disabled}
- button/secondary/{default, hover, active, disabled}
- form/input/text/{default, focus, error, disabled}
Each component: use layout/flex, token-referenced colors only, WCAG AA contrast."
```

---

## 2. Audit Existing Design System

Use when: inheriting a Penpot file, preparing for a handoff, or before a major redesign.

### Full audit sequence
```
STEP 1 - Color audit:
"List every unique color value in this file (text, fill, stroke, shadow).
Group by: (a) defined as token/style, (b) hard-coded.
Flag all hard-coded values and identify which token they should map to."

STEP 2 - Typography audit:
"List every unique type style combination (family, size, weight, line-height).
Flag any not matching the defined scale. Identify the nearest token match."

STEP 3 - Spacing audit:
"Sample 20 components. List all padding and gap values.
Flag any not divisible by 8. Propose the nearest token value."

STEP 4 - Component audit:
"List all components. For each:
- Name and path
- Is the naming convention followed? (category/name/variant pattern)
- Are internal layers semantically named?
- Are all values token-referenced?
Output as a markdown table."

STEP 5 - Redundancy check:
"Find components that appear to be duplicates or near-duplicates.
List pairs/groups with % similarity estimate. Do not delete — list only."
```

### Audit report format
```
"Compile the audit findings into a structured report:
GLOBAL RULESET - SOURCE: Penpot MCP - NO_GUESSING - IF_MISSING: mark TODO - OUTPUT: JSON
{
  "colorIssues": [ { "value": "#hex", "location": "layer path", "suggestedToken": "..." } ],
  "typographyIssues": [...],
  "spacingIssues": [...],
  "componentIssues": [...],
  "duplicates": [...],
  "summary": { "totalIssues": N, "criticalCount": N, "effort": "low|medium|high" }
}"
```

---

## 3. Token Migration & Normalization

Use when: cleaning up a file with inconsistent or legacy token usage.

### Safe migration pattern
```
"We are migrating hard-coded colors to token references.

Phase 1 (inventory): List all layers using hard-coded color #[VALUE].
Phase 2 (mapping): The correct token is [TOKEN_PATH].
Phase 3 (apply): Replace hard-coded value with token reference on each layer.
  - Do 10 layers at a time
  - Report what you changed after each batch
  - Pause before each batch for approval

DO NOT rename any layers. DO NOT change any other properties."
```

### Spacing normalization
```
"Normalize spacing in the [FrameName] component.
Current values: [list extracted values]
Target token map:
  4px  → spacing.xs
  8px  → spacing.sm
  16px → spacing.md
  24px → spacing.lg
  32px → spacing.xl

Update padding and gap values only. Describe changes before applying."
```

---

## 4. Component Library Management

### Creating variants
```
"The Button/Primary/Default component exists. 
Add the following variants as new components in the same group:
- Button/Primary/Hover   (background: color.button.primary.bg.hover)
- Button/Primary/Active  (background: color.button.primary.bg.active)  
- Button/Primary/Disabled (opacity: 40%, not interactive)
- Button/Primary/Loading  (replace label with spinner icon, same sizing)

Rules:
- Copy structure from /Default, do not rebuild
- Only change the properties specified above
- All other tokens stay the same
- Describe each variant before creating it"
```

### Reorganizing a component library
```
"Analyze the component structure on this page.
Identify any components not following the [category/name/variant] pattern.
Propose a reorganization plan (new paths only — do not move yet).
Group by functional category: Forms, Navigation, Feedback, Data Display, Layout."
```

### Naming consistency enforcement
```
"Audit all component names on this page against this convention:
  PATTERN: category/component/variant
  EXAMPLES: button/primary/default, form/input/text/focus, nav/tab/active
  
For each non-conforming component, list:
  - Current name
  - Proposed name
  - Reason for change

Do not rename until the full list is approved."
```

---

## 5. Palette & Brand Update

### Palette swap workflow
```
CONTEXT: We are rebranding. Old primary color: #[OLD]. New primary: #[NEW].

PHASE 1 - Impact analysis:
"Find every component and style using #[OLD] or the token [OLD_TOKEN].
List them: name, location, property (fill/stroke/text/shadow)."

PHASE 2 - Token update:
"Update the token [color.base.primary.500] from #[OLD] to #[NEW].
Report: how many components will auto-update via this token reference?"

PHASE 3 - Hard-coded stragglers:
"Find any remaining hard-coded uses of #[OLD] not caught by the token update.
List them. Apply the new color to each — 10 at a time, with approval."

PHASE 4 - Contrast check:
"After the palette update, check all primary-colored text elements.
Flag any failing WCAG AA (4.5:1 for small text, 3:1 for large)."
```

---

## 6. Cross-File Consistency Audit

Use when multiple Penpot files share a design system.

```
"We have two files: [File A: focused page] and [File B: separate session].

For the currently focused file:
1. List all shared library components being used (name + source library)
2. List all local overrides applied to shared components
3. Flag any detached instances (components that were shared but are now local)
4. List any local components that duplicate shared library components

Output as JSON with counts and a 'sync_health' score (0-100)."
```
