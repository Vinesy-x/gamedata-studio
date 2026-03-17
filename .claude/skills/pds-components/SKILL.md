---
name: pds-components
description: >
  Build ~25 reusable UI components for a Pencil Design System. Creates Buttons,
  Inputs, Typography, Badges, Alerts, Cards, Navigation, Tables, Tabs,
  Breadcrumbs, Pagination, Modal, Dropdown, and Misc components. Part of the
  PDS workflow — run after foundations.
version: 1.5.0
license: MIT
compatibility: Requires Pencil MCP server and existing design tokens in .pen file.
metadata:
  author: jsstech
  tags: components, design-system, pencil, ui-kit
---

# PDS Components — Reusable UI Library

Build ~25 reusable components organized by category. All components use `reusable: true`, `$--` tokens only, and `"Category/Variant"` naming.

## ⛔ Critical Rules

1. **Every frame MUST have `layout: "vertical"` or `layout: "horizontal"`** — no exceptions.
2. **After every `batch_design`, screenshot and check for overlap** — fix immediately.
3. **Copy exact code from reference files** — do NOT improvise layout code.

## Property Checklist (verify after every batch_design)

- [ ] Every frame with children has `layout`
- [ ] Shadow colors use `#RRGGBBAA` hex (not rgba)
- [ ] Text with `width: "fill_container"` also has `textGrowth: "fixed-width"`
- [ ] All colors are `$--` tokens (no raw hex)
- [ ] All font sizes are `$--text-*` tokens
- [ ] All font weights are `$--weight-*` tokens
- [ ] Icons use `icon_font` type with explicit pixel dimensions (not variable tokens)

## Prerequisites (verify silently)

1. A `.pen` file is open (`get_editor_state`)
2. Design tokens exist (`get_variables` returns ~89 tokens)
3. Foundation frames exist (10 frames in 5×2 grid)

## Step-by-Step Sequence

### Step 1: Create Components Section Frame

Position at `x: 0, y: 1200` (below foundation grid).

```javascript
componentsSection=I("document", { type: "frame", name: "Components", width: 1440, height: "fit_content", x: 0, y: 1200, layout: "vertical", padding: [60, 80, 60, 80], gap: 48, fill: "#FFFFFF" })
```

See `references/component-specs.md` → Pre-requisite.

### Step 2: Buttons (5 components)

Create `buttonsCategory` (vertical) → `buttonsRow` (horizontal) → 5 buttons.

Each button: `reusable: true`, `layout: "horizontal"`, `cornerRadius: "$--radius-md"`.

See `references/component-specs.md` → Batch 1. **Validate.**

### Step 3: Inputs (4 components)

Create `inputsCategory` (vertical) → `inputsRow` (horizontal) → 4 inputs.

Each: `reusable: true`, `layout: "vertical"`, border, placeholder.

See `references/component-specs.md` → Batch 2. **Validate.**

### Step 4: Typography (6 components)

Create `typographyCategory` (vertical) → 6 text components stacked.

Each: `reusable: true`, `$--text-*` and `$--font-*` tokens.

See `references/component-specs.md` → Batch 3. **Validate.**

### Step 5: Badges (4 components)

Create `badgesCategory` (vertical) → `badgesRow` (horizontal) → 4 badges.

Each: `reusable: true`, `layout: "horizontal"`, `justifyContent: "center"`.

See `references/component-specs.md` → Batch 4a. **Validate.**

### Step 6: Alerts (4 components)

Create `alertsRow` (vertical) inside badges category → 4 alerts stacked.

Each: `reusable: true`, icons use `icon_font` type.

See `references/component-specs.md` → Batch 4b. **Validate.**

### Step 7: Card + Navigation (5 components)

Create `cardsCategory` (vertical) → `cardsRow` (horizontal).

Card: `layout: "vertical"` with header/content/actions slots. Sidebar: `layout: "vertical"`.

See `references/component-specs.md` → Batch 5. **Validate.**

### Step 8: Table (3 components)

Create `tableCategory` (vertical) → Table Wrapper, HeaderRow, DataRow.

Each container: `layout: "vertical"` or `"horizontal"`.

See `references/component-specs.md` → Batch 6a. **Validate.**

### Step 9: Tabs + Breadcrumbs (6 components)

Create tabs and breadcrumb components in the table category.

See `references/component-specs.md` → Batch 6b. **Validate.**

### Step 10: Pagination (4 components)

Create `miscCategory` (vertical) → pagination components.

Each item: `layout: "horizontal"`, `justifyContent: "center"`, `alignItems: "center"`.

See `references/component-specs.md` → Batch 7a. **Validate.**

### Step 11: Modal + Dropdown (5 components)

Modal dialog + dropdown components.

See `references/component-specs.md` → Batch 7b. **Validate.**

### Step 12: Misc (5 components)

Avatar, Divider, Switch, Checkbox, Radio.

See `references/component-specs.md` → Batch 7c. **Validate.**

### Step 13: Final Component Audit

```
batch_get({ patterns: [{ reusable: true }] })
```

Verify ~25+ components exist. Screenshot the full Components section.

## After Every Step

1. Check `batch_design` response for "unknown properties" warnings — fix immediately
2. `get_screenshot` on the category just built
3. If elements overlap, the parent frame is missing `layout` — fix immediately
4. `snapshot_layout({ problemsOnly: true })` on the category

## Completion

Log component count and screenshot summary. Continue automatically to next skill.
