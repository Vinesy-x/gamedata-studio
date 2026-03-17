---
name: pds-export
description: >
  Export a Pencil Design System to Tailwind CSS + React components. Use when user
  says "export to code" or "generate Tailwind".
disable-model-invocation: true
version: 1.5.0
license: MIT
metadata:
  author: jsstech
  tags: export, code, tailwind, react, design-system
---

# PDS Export

Convert design system to production code.

**Steps:** 1-Collect preferences (v3/v4, Next.js/Vite) → 2-Extract tokens (`get_variables`) → 3-Read components → 4-Load `get_guidelines("code")` + `get_guidelines("tailwind")` → 5-Generate globals.css → 6-Generate tailwind.config.js (v3) → 7-Font loading → 8-Component TSX → 9-Screen TSX.

See `references/code-export-guide.md`.
