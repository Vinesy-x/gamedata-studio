---
name: pds-foundations
description: >
  Build visual foundation documentation for a Pencil Design System. Creates 10
  separate frames in a 5×2 grid: Colors, Typography, Font Sizes, Font Weights,
  Spacing, Semantic Colors, Radii, Shadows & Borders, Sizing, Letter Spacing.
  Part of the PDS workflow — run after tokens are created.
version: 1.5.0
license: MIT
compatibility: Requires Pencil MCP server and existing design tokens in .pen file.
metadata:
  author: jsstech
  tags: foundations, design-system, pencil, documentation
---

# PDS Foundations — Visual Documentation

Build 10 foundation frames documenting the design system's tokens visually. Each frame is an independent top-level frame arranged in a 5×2 grid.

## ⛔ Critical Rules

1. **Every frame MUST have `layout: "vertical"` or `layout: "horizontal"`** — no exceptions.
2. **After every `batch_design`, screenshot and check for overlap** — fix immediately.
3. **Copy exact code from reference files** — do NOT improvise layout code.

## Property Checklist (verify after every batch_design)

- [ ] Every frame with children has `layout: "vertical"` or `layout: "horizontal"`
- [ ] Shadow colors use `#RRGGBBAA` hex (not rgba)
- [ ] Text with `width: "fill_container"` also has `textGrowth: "fixed-width"`
- [ ] All colors are `$--` tokens (no raw hex)
- [ ] All font sizes are `$--text-*` tokens (no raw pixel values)

## Prerequisites (verify silently)

1. A `.pen` file is open (`get_editor_state`)
2. Design tokens exist (`get_variables` returns ~89 tokens)
3. If missing, warn and skip

## Canvas Grid Layout

| | Col 0 (x=0) | Col 1 (x=420) | Col 2 (x=840) | Col 3 (x=1260) | Col 4 (x=1680) |
|---|---|---|---|---|---|
| **Row 0** (y=0) | Colors | Typography | Font Sizes | Font Weights | Spacing |
| **Row 1** (y=550) | Semantic Colors | Radii | Shadows & Borders | Sizing | Letter Spacing |

**Shared frame properties (all 10 frames):**
```javascript
{ type: "frame", width: 380, height: "fit_content", layout: "vertical",
  padding: [32, 24, 32, 24], gap: 16, fill: "$--background",
  stroke: "$--border", strokeThickness: 1, cornerRadius: "$--radius-lg" }
```

## Step-by-Step Sequence

### Step 1: Create All 10 Grid Frames (1 batch)

Create all 10 empty frames at their grid positions. Each is `I("document", ...)` — NOT nested inside a parent.

See `references/foundations-specs.md` → Pre-requisite batch.

Screenshot and verify grid layout — 5 frames per row, no overlap.

### Step 2: Populate Colors (2 batches)

Fill the "Foundations / Colors" frame with swatches (72×48px each, 4 per row).

See `references/foundations-specs.md` → Batches A–B.

Screenshot after each batch. Verify swatches are visible and use `$--` token fills.

### Step 3: Populate Typography (1 batch)

Fill the "Foundations / Typography" frame with font family specimens.

See `references/foundations-specs.md` → Batch C.

### Step 4: Populate Font Sizes (1-2 batches)

Fill with 9 text samples at actual `$--text-xs` through `$--text-5xl` sizes.

See `references/foundations-specs.md` → Batches D–E.

### Step 5: Populate Font Weights (1 batch)

Fill with sample text rendered in each of the 6 weight tokens.

See `references/foundations-specs.md` → Batch F.

### Step 6: Populate Spacing (1 batch)

Fill with 12 visual blocks showing each spacing value.

See `references/foundations-specs.md` → Batch G.

### Step 7: Populate Semantic Colors (1 batch)

Fill with 4 card-like swatches for success/warning/error/info.

See `references/foundations-specs.md` → Batch H.

### Step 8: Populate Radii (1 batch)

Fill with 6 shapes showcasing each radius token.

See `references/foundations-specs.md` → Batch I.

### Step 9: Populate Shadows & Borders (1 batch)

Fill with 4 shadow levels + 3 border widths + 3 opacity examples.

See `references/foundations-specs.md` → Batch J.

### Step 10: Populate Sizing (1 batch)

Fill with visual rectangles showing icon, avatar, button, and input sizes.

See `references/foundations-specs.md` → Batch K.

### Step 11: Populate Letter Spacing (1 batch)

Fill with text rendered at each `$--tracking-*` value.

See `references/foundations-specs.md` → Batch L.

## After Every Step

1. `get_screenshot` on the frame just populated
2. Check for overlapping elements — fix missing `layout` immediately
3. `snapshot_layout({ problemsOnly: true })` on the frame
4. Fix ALL issues BEFORE continuing to the next step

## Completion

Log screenshot summary. Continue automatically to next skill.
