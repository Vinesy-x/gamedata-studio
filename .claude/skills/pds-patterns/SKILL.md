---
name: pds-patterns
description: >
  Build 4 composition patterns for a Pencil Design System. Creates Form, Data
  Display, Navigation, and Card Layout patterns using component refs. Adds
  domain-relevant images. Part of the PDS workflow — run after components.
version: 1.5.0
license: MIT
compatibility: Requires Pencil MCP server, existing tokens and components in .pen file.
metadata:
  author: jsstech
  tags: patterns, design-system, pencil, composition
---

# PDS Patterns — Composition Showcases

Build 4 composition patterns that demonstrate how components work together. Each pattern uses only `ref` instances of existing reusable components.

## ⛔ Critical Rules

1. **Every frame MUST have `layout: "vertical"` or `layout: "horizontal"`** — no exceptions.
2. **After every `batch_design`, screenshot and check for overlap** — fix immediately.
3. **Copy exact code from reference files** — do NOT improvise layout code.

## Prerequisites (verify silently)

1. A `.pen` file is open (`get_editor_state`)
2. Design tokens exist (`get_variables` returns ~89 tokens)
3. Reusable components exist (`batch_get({ patterns: [{ reusable: true }] })` returns ~25+)

## Step 0: Load MCP Guidelines

Call `get_guidelines("design-system")` — use Section 4 (Sidebar), Section 5 (Card), Section 6 (Tab), Section 8 (Table), Section 11 (Common Compositions) as composition reference.

## Step 1: Create Patterns Section Frame

Position at `x: 1540, y: 1200` (to the right of Components).

```javascript
patternsSection=I("document", { type: "frame", name: "Patterns", width: 1440, height: "fit_content", x: 1540, y: 1200, layout: "vertical", padding: [60, 80, 60, 80], gap: 48, fill: "#FFFFFF" })
patternsSectionTitle=I(patternsSection, { type: "text", content: "Patterns", fontFamily: "$--font-primary", fontSize: 48, fontWeight: "700", fill: "$--foreground" })
patternsSectionSubtitle=I(patternsSection, { type: "text", content: "Composition showcases demonstrating component usage", fontFamily: "$--font-secondary", fontSize: 18, fill: "$--muted-foreground", width: "fill_container" })
```

## Step 2: Build Form Pattern

Vertical stack of InputGroup refs + Submit button. Typical for contact forms, login, settings.

See `references/screen-patterns.md` → Pattern 1 — Form Pattern.

**Validate:** screenshot, check for overlap.

## Step 3: Build Data Display Pattern

Table ref + Pagination ref, stacked vertically. Typical for admin dashboards, CRM.

See `references/screen-patterns.md` → Pattern 2 — Data Display Pattern.

**Validate:** screenshot, check for overlap.

## Step 4: Build Navigation Pattern

Horizontal layout: sidebar (`layout: "vertical"`, width: 240) + content area (`layout: "vertical"`, `width: "fill_container"`).

**The sidebar frame MUST have `layout: "vertical"`** so nav items stack.

See `references/screen-patterns.md` → Pattern 3 — Navigation Pattern.

**Validate:** screenshot, check for overlap.

## Step 5: Build Card Layout Pattern

Horizontal row of Card refs (`layout: "horizontal"`, `gap: 24`). Use `width: "fill_container"` on cards.

**Add domain-relevant stock images** to each card:
```javascript
// Insert frame inside card, then apply image
cardImg=I(card+"/imageSlot", { type: "frame", width: "fill_container", height: 200 })
G(cardImg, "stock", "[domain keyword]")
```

See `references/screen-patterns.md` → Pattern 4 — Card Layout Pattern.

Also see `references/screen-patterns.md` → MCP Composition Recipes for Card, Sidebar, Table, Tab, and Pagination composition patterns.

**Validate:** screenshot, check for overlap.

## Image Guidelines

- Card images: `G(imageFrame, "stock", "[domain keyword]")` — e.g., "latte art", "fitness workout"
- Avatars: `G(avatarFrame, "stock", "professional portrait")`
- Insert frame FIRST, then apply `G()` — images are fills on frames, not separate nodes
- Use `"stock"` for realistic photos, `"ai"` for custom/branded visuals

## After Every Pattern

1. `get_screenshot` on the pattern just built
2. Check for overlapping elements — fix missing `layout` immediately
3. `snapshot_layout({ problemsOnly: true })` on the pattern

## Completion

Log screenshot of full Patterns section. Continue automatically to next skill.
