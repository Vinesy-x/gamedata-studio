---
name: pds-components
description: >
  Build ~25 reusable UI components for a Pencil Design System. Creates Buttons,
  Inputs, Typography, Badges, Alerts, Cards, Navigation, Tables, Tabs,
  Breadcrumbs, Pagination, Modal, Dropdown, Misc. Run after foundations.
version: 1.5.0
license: MIT
metadata:
  author: jsstech
  tags: components, design-system, pencil, ui-kit
---

# PDS Components

Build ~25 reusable components at `x: 0, y: 1200`. All: `reusable: true`, `$--` tokens only, `"Category/Variant"` naming.

**Structure:** Category frame (vertical) → display row (horizontal) → components. Never insert directly into Components section.

**Batches:** 1-Buttons(5) → 2-Inputs(4) → 3-Typography(6) → 4-Badges+Alerts(8) → 5-Card+Nav(5) → 6-Table+Tabs+Breadcrumbs(9) → 7-Pagination+Modal+Misc(10). See `references/component-specs.md`.

**Rules:** Every frame needs `layout`. Screenshot after every batch. Fix overlap immediately. Icons use `icon_font` type.
