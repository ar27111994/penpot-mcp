# Design-to-Code Workflows

## Table of Contents
1. [Page/Screen to HTML+CSS](#1-pagescreen-to-htmlcss)
2. [Design to React Component](#2-design-to-react-component)
3. [Token Extraction for Code](#3-token-extraction-for-code)
4. [Component-to-Code Mapping](#4-component-to-code-mapping)
5. [Layout Extraction](#5-layout-extraction)
6. [Asset Export Pipeline](#6-asset-export-pipeline)
7. [Design-Code Sync Check](#7-design-code-sync-check)

---

## 1. Page/Screen to HTML+CSS

Use when: generating a semantic, implementation-ready HTML/CSS output from a Penpot frame.

### Full-page extraction prompt
```
ROLE: Senior Frontend Engineer. Expert in semantic HTML5 and CSS custom properties.
You do not invent values not present in the Penpot file.

TASK: Generate production-ready HTML + CSS for the frame named [FrameName].

RULES:
- HTML: semantic elements only (section, nav, header, main, article, button, input, label...)
- CSS: custom properties only — map Penpot tokens to CSS variables
  Format: --color-text-primary: [penpot token value]
- NO magic numbers — every value must trace to a token
- NO invented breakpoints — only use breakpoints visible in the design
- Spacing: derive from 8px grid, use CSS gap/padding (no margin hacks)
- Icons: placeholder SVGs with aria-label
- Accessibility: ARIA roles, alt text, focus states

OUTPUT STRUCTURE:
1. HTML (index.html) — semantic, minimal, no inline styles
2. CSS (styles.css) — variables block at top, then component styles
3. Notes — what's missing, what needs real assets, open questions
```

### Prompt for a specific component
```
"Export the [ComponentName] component to React.

Framework: React (functional component with hooks)
Styling: [Tailwind CSS | CSS Modules | styled-components] — specify which

Rules:
- Props interface from layer structure (variant names → prop types)
- Token → CSS variable mapping in comments
- No hardcoded colors/sizes/spacing
- WCAG AA compliant
- Storybook-ready: export default story at bottom

Do not invent interactive behavior not shown in the design."
```

---

## 2. Design to React Component

### Discovery first
```
"Inspect the [ComponentName] component on this page.
List:
1. All visual states (variants)
2. Content areas (text, images, icons)
3. Interactive zones (buttons, links, inputs)
4. Token values used for each property
5. Layout type (flex direction, gap, padding)

I will use this to write the component spec."
```

### Component generation
```
COMPONENT SPEC:
Name: [ComponentName]
States: [list from discovery]
Props: [derived from states and content areas]
Tokens: [paste token list from discovery]

TASK: Generate a TypeScript React functional component.

interface [ComponentName]Props {
  // derive from states and content areas
}

Rules:
- CSS custom properties for all design tokens (no Tailwind magic strings)
- Prop names match design layer names (camelCase)
- No useEffect unless interaction requires it
- Accessible: keyboard nav, focus ring, aria attributes
- No external dependencies beyond React
```

### Generating a full component library
```
"List all components on this page in a dependency-ordered list
(primitives first, composites last). 

For each component output:
{ 
  name: string,
  variants: string[],
  dependencies: string[],   // other components it uses
  tokens: { property: tokenPath }[],
  estimatedComplexity: 'simple' | 'medium' | 'complex'
}

I will use this to plan the implementation order."
```

---

## 3. Token Extraction for Code

Use when: setting up a design token pipeline (Style Dictionary, Theo, vanilla CSS variables).

### Extract full token set
```
GLOBAL RULESET - SOURCE: Penpot MCP - NO_GUESSING - OUTPUT: JSON only, no prose

TASK: Extract all design tokens from this file.

OUTPUT FORMAT (JSON, no comments):
{
  "color": {
    "base": { "neutral": { "100": "#hex", "200": "#hex" } },
    "semantic": { "bg": { "default": "{color.base.neutral.100}" } },
    "component": { "button": { "primary": { "bg": "{color.semantic.bg.brand}" } } }
  },
  "spacing": { "xs": 4, "sm": 8, "md": 16, "lg": 24, "xl": 32 },
  "typography": {
    "scale": { 
      "xs": { "size": 12, "lineHeight": 1.5, "weight": 400 },
      "sm": { "size": 14, "lineHeight": 1.5, "weight": 400 }
    }
  },
  "radius": { "sm": 4, "md": 8, "lg": 16, "full": 9999 },
  "shadow": { "sm": "0 1px 2px ...", "md": "..." }
}

SIZE CONSTRAINT: JSON only, concise, no explanations
```

### CSS custom properties output
```
"Convert the extracted tokens to CSS custom properties.

FORMAT:
:root {
  /* Color - Base */
  --color-base-neutral-100: #hex;
  
  /* Color - Semantic */
  --color-bg-default: var(--color-base-neutral-100);
  
  /* Spacing */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  
  /* Typography */
  --type-scale-sm-size: 14px;
  --type-scale-sm-line-height: 1.5;
}

Rules:
- Kebab-case, mirroring token path hierarchy
- Semantic tokens reference base tokens via var()
- Group with CSS comments
- No hardcoded values in semantic tier"
```

### Style Dictionary config generation
```
"Generate a Style Dictionary configuration for this token set.

Output:
1. tokens.json — raw token values (Tier 1 and Tier 2)
2. config.json — Style Dictionary config with:
   - CSS custom properties platform
   - SCSS variables platform
   - JSON flat platform
3. README.md — brief setup instructions (max 20 lines)"
```

---

## 4. Component-to-Code Mapping

Use when: creating a living mapping document between design components and code implementation.

### Generate mapping table
```
"List all components in this file and generate a component mapping document.

For each component output:
{
  penpotName: "button/primary/default",
  codeComponent: "Button",
  codeFile: "src/components/Button/Button.tsx",
  penpotVariants: ["default", "hover", "active", "disabled"],
  codeProps: { variant: "primary|secondary", state: "default|disabled|loading" },
  tokenMapping: { background: "--color-button-primary-bg", ... },
  notes: "..."
}

Output as JSON array. No prose."
```

### Sync documentation prompt
```
"For the [FrameName] screen, generate a handoff specification.

SECTIONS:
1. LAYOUT — grid columns, breakpoints, spacing units
2. COMPONENTS USED — list with Penpot path + code component name
3. TOKENS — all token references on this page (property → token path → value)
4. ASSETS — list of images/icons with suggested file names
5. OPEN QUESTIONS — anything ambiguous or missing in the design

FORMAT: Markdown. Max 200 lines total."
```

---

## 5. Layout Extraction

Use when: implementing responsive layout from a Penpot design.

### Extract layout structure
```
"Analyze the layout of [FrameName].

For each container, describe:
- Element: [layer path]
- Layout type: flex | grid | none
- Direction: row | column
- Gap: [value → token]
- Padding: [top right bottom left → tokens]
- Alignment: justify-content, align-items
- Sizing: fixed | fill | hug

Output as a nested JSON structure mirroring the layer hierarchy.
Max depth: 4 levels."
```

### Responsive behavior extraction
```
"This file has [N] breakpoints. For the [ComponentName] component:

1. List the breakpoint frames (names and widths)
2. For each breakpoint, describe what changes:
   - Layout direction changes
   - Column count changes
   - Hidden elements
   - Size changes
3. Output as a breakpoint map:

{ 
  mobile: { width: 375, changes: [...] },
  tablet: { width: 768, changes: [...] },
  desktop: { width: 1440, changes: [...] }
}"
```

---

## 6. Asset Export Pipeline

Use when: extracting icons, images, and other assets from a Penpot design.

### Icon audit and export
```
"Find all icon shapes on this page (typically: small SVG shapes, <32px, in an 'icons' group).

For each icon:
- Layer name → proposed file name (kebab-case)
- Dimensions
- Color (token or hard-coded hex)
- Used in: [list components that reference this icon]

Output as JSON. Do not export yet — list first."
```

### Export command
```
"Export the following icons as SVG using export_shape:
[list from audit]

Naming convention: [kebab-case layer name].svg
Target: If local MCP, export to [path]. If remote, describe each SVG structure."
```

### Image asset inventory
```
"List all raster images on this page.
For each: layer name, dimensions, placeholder vs real asset, suggested file name.
Flag any images that appear duplicated (same visual but different layers)."
```

---

## 7. Design-Code Sync Check

Use when: verifying that implemented code matches the current design.

### Design → Code drift check
```
"I will paste the current CSS for [ComponentName]. 
Check it against the Penpot design.

CSS TO CHECK:
[paste CSS]

For each discrepancy, output:
{
  property: "background-color",
  designValue: "token: color.button.primary.bg → #3451B2",
  codeValue: "#2940A0",
  severity: "high | medium | low",
  fix: "update --color-button-primary-bg to #3451B2"
}

Do not suggest code fixes for intentional overrides — only flag unintentional drift."
```

### Token usage audit
```
"Check whether the code is using the correct CSS variable names.
Token map (design → CSS variable):
  color.text.primary → --color-text-primary
  spacing.md → --spacing-md
  [... paste full map]

Analyze the pasted CSS and flag any:
- Raw hex values that should be a CSS variable
- Hardcoded spacing values
- Incorrect variable names (typos or old names)"
```
