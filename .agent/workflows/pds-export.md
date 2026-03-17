---
description: Export a Pencil Design System to production-ready Tailwind CSS + React code.
---

# PDS Code Export

Export the design system to Tailwind CSS + React components. Read `../pds-export/SKILL.md` and follow all steps.

## Quick Steps

1. Ask user: Tailwind v3 or v4? Next.js or Vite+React?
2. Extract tokens with `get_variables`
3. Read components with `batch_get({ patterns: [{ reusable: true }] })`
4. Load `get_guidelines("code")` and `get_guidelines("tailwind")`
5. Generate: globals.css → tailwind.config.js (v3) → font loading → component TSX → screen TSX
6. Present file list
