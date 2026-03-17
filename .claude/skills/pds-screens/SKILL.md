---
name: pds-screens
description: >
  Build domain-specific screens for a Pencil Design System. Creates 3-5 screens
  using component refs based on domain requirements. Optional phase — only runs
  if user requests screens.
version: 1.5.0
license: MIT
compatibility: Requires Pencil MCP server, existing tokens and components in .pen file.
metadata:
  author: jsstech
  tags: screens, design-system, pencil, domain
---

# PDS Screens — Domain Pages

Build 3-5 domain-specific screens using component refs. **Only runs if the user explicitly requests screens.**

## ⛔ Critical Rules

1. **Every frame MUST have `layout: "vertical"` or `layout: "horizontal"`** — no exceptions.
2. **After every `batch_design`, screenshot and check for overlap** — fix immediately.
3. **Every element must be a `ref` instance** — never recreate component internals.

## Prerequisites (verify silently)

1. A `.pen` file is open (`get_editor_state`)
2. Design tokens exist (`get_variables`)
3. Reusable components exist (`batch_get({ patterns: [{ reusable: true }] })`)
4. User has requested screens

## Step 0: Load MCP Guidelines

Call `get_guidelines("design-system")` — use Section 10 (Screen Layout Patterns A–D) as layout reference:
- **Pattern A:** Sidebar + Content (Dashboard) — `layout: "horizontal"`, sidebar 240px
- **Pattern B:** Hero + Sections (Landing Page) — `layout: "vertical"`, full-width sections
- **Pattern C:** Card Grid (Product Listing) — horizontal grid with filter sidebar
- **Pattern D:** Form Layout (Settings, Contact) — centered or left-aligned form

## Per-Screen Workflow

For each screen:

1. Call `find_empty_space_on_canvas({ direction: "right", width: 1440, height: 900, padding: 100 })` to get coordinates
2. Insert screen frame at returned position:
   ```javascript
   screen=I("document", { type: "frame", name: "[Screen Name]", width: 1440, height: 900, x: X, y: Y, layout: "[vertical or horizontal]", fill: "$--background", clip: true })
   ```
3. Build layout with component refs — customize via `U(instanceId+"/descendantId", {...})`
4. Add domain imagery via `G(imageFrame, "stock", "[domain keyword]")`
5. Call `get_screenshot` to verify

## Domain Screen Templates

See `references/screen-patterns.md` → Domain Screen Templates for domain-specific screen blueprints:
- **Bakery:** Landing Hero, Menu Grid, Order/Cart, About/Story, Contact
- **SaaS:** Dashboard, Settings, Login, Pricing
- **Fitness:** Home/Hero, Workout Tracker, Profile, Schedule
- **E-commerce:** Product Listing, Product Detail, Cart, Checkout

## Screen Creation Checklist

Before each screen:
- [ ] Found empty canvas space via `find_empty_space_on_canvas`
- [ ] Listed available components via `batch_get({ patterns: [{ reusable: true }] })`
- [ ] All content text is domain-relevant (not lorem ipsum)

After each screen:
- [ ] `get_screenshot` — no overlapping elements
- [ ] No hardcoded hex colors (all `$--` tokens)
- [ ] No recreated components (all `ref` instances)
- [ ] Text fits within containers

## Completion

Log screenshots of all screens. Continue automatically to verification.
