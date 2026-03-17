---
description: Generate a complete Pencil design system with tokens, foundations, components, and patterns for any business domain.
---

# Pencil Design System Generator

Generate a complete design system in a Pencil `.pen` file. This workflow orchestrates all PDS sub-skills automatically.

## ⛔ GOLDEN RULES

1. **EVERY frame MUST have `layout: "vertical"` or `layout: "horizontal"`.** No exceptions.
2. **After EVERY `batch_design`, screenshot and CHECK for overlap.** Fix immediately.
3. **Copy exact code from reference files.** Do NOT improvise.
4. **NEVER call `open_document("new")`.** Check `get_editor_state` first.
5. **NEVER put `"themes"` key in `set_variables`.** Crashes with "missing type".

## Input

Parse the user's message for: business domain, brand name, color preferences, font preferences, reference image. If only a domain is given, research everything else.

## Workflow

Execute phases one at a time. At each **REVIEW** point, the user types `c` (continue), `r` (redo), or `s` (skip).

### Phase 1 — Research the Domain

1. If `collectui-mcp` available: `collectui_search({ query: "[domain]", limit: 8 })`
2. If reference image exists: extract colors, typography, tone, radii, shadows
3. Web search for domain conventions, font pairings
4. Compile design brief

**Priority:** Reference image > Collect UI > User preferences > Web research.

**REVIEW** — Show design brief. Wait for user input.

### Phase 2 — Initialize Pencil Document

1. `get_editor_state({ include_schema: true })` — use existing `.pen` if open, only create if none exists
2. `get_guidelines({ topic: "design-system" })`
3. `get_style_guide_tags()` then `get_style_guide({ tags: [...] })`
4. `get_variables({ filePath })`

### Phase 3 — Create Design Tokens (~89)

Call `set_variables` with all tokens. Color format:
```json
{ "--primary": { "type": "color", "value": [
  { "value": "#hex", "theme": { "mode": "light" } },
  { "value": "#hex", "theme": { "mode": "dark" } }
]}}
```

Verify with `get_variables` — every color needs both theme modes.

**REVIEW** — Show token count. Wait for user input.

### Phase 4 — Build Foundations

Read `../pds-foundations/SKILL.md` and follow all steps. 10 frames in 5×2 grid.

**REVIEW** — Show screenshots. Wait for user input.

### Phase 5 — Build Components

Read `../pds-components/SKILL.md` and follow all steps. ~25 reusable components.

**REVIEW** — Show component count and screenshots. Wait for user input.

### Phase 6 — Build Patterns

Read `../pds-patterns/SKILL.md` and follow all steps. 4 composition showcases.

**REVIEW** — Show screenshots. Wait for user input.

### Phase 7 — Domain Screens (optional)

Only if user requests. Read `../pds-screens/SKILL.md`.

### Phase 8 — Verify + Fix

Read `../pds-verify/SKILL.md` and follow all steps. Present final summary.
