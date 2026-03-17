---
name: pds-verify
description: >
  Verify and fix a Pencil Design System. Enforces layout properties, fixes shadow
  hex colors, audits token usage, and validates component count. Part of the PDS
  workflow — run as the final phase.
version: 1.5.0
license: MIT
compatibility: Requires Pencil MCP server and existing design system in .pen file.
metadata:
  author: jsstech
  tags: verification, qa, design-system, pencil
---

# PDS Verify — Quality Assurance

Run comprehensive QA on the design system. Fix every issue found.

## ⛔ Critical Rules

1. **Every frame MUST have `layout: "vertical"` or `layout: "horizontal"`** — no exceptions.
2. **Shadow colors MUST use `#RRGGBBAA` hex** — `rgba()` produces invisible shadows.
3. **All colors must be `$--` tokens** — no raw hex values in components or screens.

## Prerequisites (verify silently)

1. A `.pen` file is open with foundations, components, and patterns

## Step 1: Layout Enforcement

**Collect all frames with flex properties:**
```
batch_get({ filePath, patterns: [{ type: "frame" }], searchDepth: 10, readDepth: 0 })
```

Search within EACH top-level section (Foundations, Components, Patterns, screens).

**Identify frames needing layout:** Find every frame with `gap`, `alignItems`, or `justifyContent`.

**Classify and apply:**
- Names containing "Row", "Grid", "Bar", "Header", "Footer", "Actions" → `layout: "horizontal"`
- Names containing "Col", "Section", "Form", "Pattern", "Content" → `layout: "vertical"`
- When unsure → `layout: "horizontal"` (safer default)

```javascript
U("frameId1", { layout: "horizontal" })
U("frameId2", { layout: "vertical" })
```

See `references/verification-checklist.md` → Check 5b.

## Step 2: Shadow Fix

Check frames with `effect` property. Replace `rgba()` with 8-digit hex:

| Opacity | Hex |
|---------|-----|
| 5% | `#0000000D` |
| 7% | `#00000012` |
| 10% | `#0000001A` |
| 15% | `#00000026` |
| 20% | `#00000033` |

See `references/verification-checklist.md` → Check 5c.

## Step 3: TextGrowth Fix

Find text nodes with `width: "fill_container"` but missing `textGrowth: "fixed-width"`. Fix:

```javascript
U("textNodeId", { textGrowth: "fixed-width", width: "fill_container" })
```

See `references/verification-checklist.md` → Check 5d.

## Step 4: Token Audit

```
search_all_unique_properties({
  filePath,
  parents: [sectionId1, sectionId2, ...],
  properties: ["fillColor", "textColor", "fontFamily", "fontSize"]
})
```

Replace leaked hex values with `$--` tokens using `replace_all_matching_properties`.

See `references/verification-checklist.md` → Check 4.

## Step 5: Component Audit

```
batch_get({ patterns: [{ reusable: true }] })
```

Verify ~25+ components exist. Check naming follows `Category/Variant` pattern.

See `references/verification-checklist.md` → Check 5.

## Step 6: Visual Verification

Screenshot all sections:
1. `get_screenshot` on each foundation frame
2. `get_screenshot` on Components section
3. `get_screenshot` on Patterns section
4. `get_screenshot` on any screens

Check: alignment, spacing, typography hierarchy, color contrast, overflow.

## Step 7: Organization Audit

Verify no orphan components at document root. All reusable components should be under the Components section frame.

## Completion

Present final summary:

```
Design System Complete

Domain:     [business type]
File:       [.pen file path]
Tokens:     [count] variables (light + dark themes)
Components: [count] reusable
Patterns:   4 composition showcases
Screens:    [count or "none"]

Issues Fixed: [count] layout, [count] shadow, [count] token leaks

[Key screenshots]
```
