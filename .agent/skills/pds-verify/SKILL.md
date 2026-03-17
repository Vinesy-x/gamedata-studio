---
name: pds-verify
description: >
  Verify and fix a Pencil Design System. Layout enforcement, shadow fixes, token
  audit, component count validation. Final QA phase.
version: 1.5.0
license: MIT
metadata:
  author: jsstech
  tags: verification, qa, design-system, pencil
---

# PDS Verify

Run QA on the complete design system.

**Steps:** 1-Layout enforcement (find frames with `gap`/`alignItems` missing `layout`, bulk-fix) → 2-Shadow fix (`rgba()` → `#RRGGBBAA`) → 3-TextGrowth fix (`fill_container` text needs `textGrowth: "fixed-width"`) → 4-Token audit (`search_all_unique_properties`, replace leaked hex) → 5-Component audit (~25+ reusable) → 6-Visual verification (screenshot all sections) → 7-Organization audit (no orphans at root).

See `references/verification-checklist.md`. Present final summary with counts and screenshots.
