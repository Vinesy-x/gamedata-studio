---
name: pds-screens
description: >
  Build domain-specific screens using component refs. Optional — only if user
  requests screens.
version: 1.5.0
license: MIT
metadata:
  author: jsstech
  tags: screens, design-system, pencil, domain
---

# PDS Screens

Build 3-5 screens using component refs. Only if user requests.

**Workflow:** `find_empty_space_on_canvas` → insert screen frame → build with refs → add images via `G()` → `get_screenshot`.

**Layout patterns:** A-Sidebar+Content, B-Hero+Sections, C-Card Grid, D-Form. Load `get_guidelines("design-system")` for patterns. See `references/screen-patterns.md` for domain templates.
