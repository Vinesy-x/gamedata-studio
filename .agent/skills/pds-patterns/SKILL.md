---
name: pds-patterns
description: >
  Build 4 composition patterns for a Pencil Design System using component refs.
  Form, Data Display, Navigation, Card Layout. Run after components.
version: 1.5.0
license: MIT
metadata:
  author: jsstech
  tags: patterns, design-system, pencil, composition
---

# PDS Patterns

Build 4 patterns at `x: 1540, y: 1200` using `ref` instances. Load `get_guidelines("design-system")` for composition reference.

**Patterns:** 1-Form (vertical InputGroups + Submit) → 2-Data Display (Table + Pagination) → 3-Navigation (horizontal: sidebar vertical + content vertical) → 4-Card Layout (horizontal Card refs with `G()` images).

**Images:** `G(frame, "stock", "[domain keyword]")`. Insert frame FIRST, then `G()`. See `references/screen-patterns.md`.

**Rules:** Every frame needs `layout`. Sidebars ALWAYS `layout: "vertical"`. Screenshot after every pattern.
