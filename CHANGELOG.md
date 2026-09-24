# Changelog

All notable changes to this community skill are documented here.

## 1.6.0 - 2026-09-24

- Updated for Penpot 2.16–2.18 (sources: `penpot/penpot` `CHANGES.md`, plugin types at tag `2.18.0`, the 2.18 MCP server's `high_level_overview` text):
  - MCP tools: `export_shape` `mode: "shape" | "fill"`; tool registration is conditional (`import_image` only with file-system access, REPL/dev tools only in a dev environment, never in multi-user mode), so a remote team server exposes four tools.
  - Troubleshooting for the 2.18 plugin heartbeat ("plugin tab appears to be suspended"): after a server upgrade the browser can keep serving stale plugin code; `No Penpot instance connected for user token`; the MCP key is no longer accepted as an API access token.
  - Plugin API: variants (`penpotUtils.createVariantContainer`, the ordered low-level `createVariantFromComponents` path, `isVariant()`, `switchVariant()`, `resetOverrides()`), token helpers (`penpotUtils.tokenOverview/findTokenByName/findTokensByName/getTokenSet`, `token.applyToShapes()`), `await waitForLayoutUpdate()` instead of sleeps, `Stroke.strokeImage`.
  - `openPage()` is typed as `Promise<void>` in 2.18; the two-call page-switch pattern stays the default until a single awaited call is confirmed live.
- Fixed client config snippets: Claude Code project servers live in `.mcp.json` with `"type": "http"` (or `claude mcp add --transport http`); VS Code uses `.vscode/mcp.json` with a top-level `servers` object.
- Fixed reference snippets: idempotent `ensureComponent` returns the existing component instead of `null`; parented clones are positioned with `penpotUtils.setParentXY`; prototyping snippets re-resolve boards in each `execute_code` call (no cross-call variables) and guard missing boards.

## 1.5.3 - 2026-05-29

- Added snippet validation for direct `parentX` / `parentY` assignments and now require `penpotUtils.setParentXY(shape, x, y)`.
- Expanded positive trigger eval coverage for HTML/CSS generation, flow animations, and design-system setup prompts.

## 1.5.2 - 2026-05-28

- Added skill frontmatter metadata for version, category, tags, and compatibility.
- Tightened trigger wording to focus on Penpot-agent workflows instead of any Penpot mention.
- Clarified local `/mcp` vs `/sse` usage and the `Already connected to a transport` troubleshooting path.
- Added an `uploadMediaUrl` trust warning for URL-based image imports.
- Added Markdown JavaScript snippet validation for common Penpot API anti-patterns.

## 1.5.1 - 2026-05-28

- Fixed README badge validation to parse badge URLs safely and satisfy CodeQL URL-sanitization checks.

## 1.5.0 - 2026-05-28

- Added public repository maintenance files, security reporting guidance, validation CI, CodeQL, Dependabot, and package validation improvements.

## 1.0.0–1.4.2 - 2026-05-24 to 2026-05-27

- Initial release and iterative development of the Penpot MCP skill, including MCP setup, JS API patterns, design system workflows, design-to-code workflows, prototyping workflows, Token API, visual effects, page management, storage global, idempotency helpers, and Penpot community submission.
