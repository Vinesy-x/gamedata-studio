---
name: pds-foundations
description: >
  Build visual foundation documentation for a Pencil Design System. Creates 10
  frames in a 5×2 grid documenting tokens visually. Run after tokens are created.
version: 1.5.0
license: MIT
metadata:
  author: jsstech
  tags: foundations, design-system, pencil, documentation
---

# PDS Foundations

Build 10 foundation frames in a 5×2 grid. Each is `I("document", ...)` with `width: 380, height: "fit_content", layout: "vertical"`.

**Grid:** Row 0 (y=0): Colors, Typography, Font Sizes, Font Weights, Spacing. Row 1 (y=550): Semantic Colors, Radii, Shadows & Borders, Sizing, Letter Spacing. Columns at x=0/420/840/1260/1680.

**Steps:** Create 10 empty frames (1 batch) → populate each frame using `references/foundations-specs.md` batches A–L → screenshot and validate after every batch.

**Rules:** Every frame needs `layout`. Screenshot after every `batch_design`. Fix overlap immediately.
