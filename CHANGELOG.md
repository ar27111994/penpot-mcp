# Changelog

All notable changes to this community skill are documented here.

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
