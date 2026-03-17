---
name: pds
description: >
  Pencil Design System generator — creates complete design systems in .pen files.
  Use when user says "design system", "create UI kit", "build components", or
  provides a business domain (e.g., "/pds coffee shop"). Researches the domain,
  creates ~89 themed tokens, then orchestrates foundation/component/pattern creation.
disable-model-invocation: true
version: 1.5.0
license: MIT
compatibility: Requires Pencil MCP server for .pen file editing.
metadata:
  author: jsstech
  tags: design-system, pencil, ui-kit, tokens, domain-aware
---

# Pencil Design System Generator

Orchestrator skill — researches the domain, initializes the document, creates ~89 themed tokens, then automatically chains sub-skills to build foundations, components, patterns, and verification.

## ⛔ GOLDEN RULES

1. **EVERY frame MUST have `layout: "vertical"` or `layout: "horizontal"`.** No exceptions.
2. **After EVERY `batch_design`, screenshot and CHECK for overlap.** Fix immediately.
3. **Copy exact code from reference files.** Do NOT improvise layout code.
4. **NEVER call `open_document("new")`.** Check `get_editor_state` first.
5. **NEVER put `"themes"` key in `set_variables`.** Themes auto-register from `"theme": { "mode": "light" }`.
6. **Use `height: "fit_content"` on section frames** — never fixed pixel heights.

## Getting Started

1. **Parse the user's input** — extract domain, brand name, color preferences, font preferences, reference image
2. **Greet and confirm** — show what was understood and the build plan:

```
Pencil Design System Generator

Domain: [extracted domain]
Brand:  [extracted name or "unnamed"]
Colors: [extracted preferences or "will research"]
Fonts:  [extracted preferences or "will research"]

Building:
 1. Research    → design brief
 2. Tokens      → ~89 themed variables (light + dark)
 3. Foundations  → 10 visual documentation frames
 4. Components  → ~25 reusable parts
 5. Patterns    → 4 composition showcases
 6. Verification → layout + token audit

Starting with domain research...
```

3. **Proceed to Phase 1** immediately.

## Phase 1 — Research the Domain

**If `collectui-mcp` is available:** Call `collectui_search({ query: "[domain]", limit: 8 })` first. Analyze returned screenshots — extract colors, typography, layouts.

**If a reference image exists** (on canvas, in chat, or as URL): Run 7-pass structured extraction:

| Pass | Extract | Token Mapping |
|------|---------|---------------|
| 1. Colors | Background, primary, secondary, accent, text, border, semantic | `--background`, `--primary`, `--secondary`, `--accent`, `--foreground`, `--border`, `--color-*` |
| 2. Typography | Heading font, body font, weights, letter spacing, line height | `--font-*`, `--weight-*`, `--tracking-*`, `--leading-*` |
| 3. Spacing & Sizing | Density, padding scale, component sizes, gap patterns | `--space-*`, `--size-*` |
| 4. Shape Language | Corner radius style, shadow depth, border usage | `--radius-*`, `--shadow-*`, `--border-*` |
| 5. Visual Patterns | Card-heavy/flat, icon style, opacity usage | `--opacity-*` |
| 6. Tone | Professional/playful/minimal/bold — informs semantic colors | — |
| 7. Structured Output | Compile mapping table: extracted value → token name | All tokens |

**Web research (always runs):** Use `WebSearch` for domain conventions. Run font research queries (e.g., `"bakery website fonts 2026"`). See `references/domain-research-guide.md`.

**Priority:** Reference image > Collect UI > User preferences > Web research > Fallback tables.

**Present design brief, then STOP and wait for user input.** User types `c` (continue), `r` (redo), or `s` (skip).

## Phase 2 — Initialize Pencil Document

**Step 1 — CHECK for existing document:**
Call `get_editor_state({ include_schema: true })`. Look at `filePath`.

- **If `filePath` contains a `.pen` file:** USE IT. Do NOT call `open_document`.
- **ONLY if `filePath` is empty/null:** Create: `open_document("./[domain]-design-system.pen")`.

**Step 2** — `get_guidelines({ topic: "design-system" })`
**Step 3** — `get_style_guide_tags()` then `get_style_guide({ tags: [...] })` with 5–10 domain tags.
**Step 4** — `get_variables({ filePath })` — check for existing tokens.

## Phase 3 — Create Design Tokens (~89)

Call `set_variables` with all tokens. Every color, font, radius, spacing, shadow, font size, line height, font weight, letter spacing, sizing, opacity, and border width is a variable.

**⛔ FATAL ERRORS:**
- **NEVER** `"themes": { "mode": ["light", "dark"] }` — crashes with "missing type"
- **NEVER** `"theme": {}` (empty) — breaks theming
- **NEVER** `"values"` (plural) — the key is `"value"` (singular)

**CORRECT color tokens (themed):**
```json
{
  "--primary": {
    "type": "color",
    "value": [
      { "value": "#3E2723", "theme": { "mode": "light" } },
      { "value": "#D7CCC8", "theme": { "mode": "dark" } }
    ]
  }
}
```

**CORRECT non-color tokens:** `{ "type": "number", "value": [{ "value": 6 }] }`

**Token categories:** 19 core colors, 8 semantic, 3 fonts, 6 radii, 12 spacing, 4 shadows, 9 font sizes, 3 line heights, 6 font weights, 4 letter spacing, 9 sizing, 3 opacity, 3 border widths. **Total: ~89.**

**Semantic colors MUST be derived from the primary palette** — match temperature, saturation, lightness. Do NOT use default Tailwind green/amber/red/blue. See `references/design-tokens-reference.md`.

**Post-creation verification:** Call `get_variables` — every color MUST show `"theme":{"mode":"light"}` and `"theme":{"mode":"dark"}`. If any show `"theme":{}`, redo.

**Present token count by category, then STOP and wait for user input.**

## Execution Sequence

After tokens are created and the user confirms, execute each phase by reading its skill file and following all steps. **Do NOT pause between phases. Continue automatically.**

1. Read `../pds-foundations/SKILL.md` and follow all steps
2. Read `../pds-components/SKILL.md` and follow all steps
3. Read `../pds-patterns/SKILL.md` and follow all steps
4. Read `../pds-verify/SKILL.md` and follow all steps

After all phases complete, present a final summary with screenshots of each section.

## Canvas Organization

```
Row 0 (y=0):    [Colors] [Typography] [Font Sizes] [Font Weights] [Spacing]
Row 1 (y=550):  [Semantic] [Radii]    [Shadows]    [Sizing]       [Letter Spacing]

                 380px each, 40px gaps — 5 columns × 2 rows

Below grid (y=1200):
  [Components 1440×fit]  [Patterns 1440×fit]  (optional) [Screens →]
```

## Critical Rules

1. **Always reuse components** — `batch_get({ patterns: [{ reusable: true }] })` before creating
2. **Never hardcode values** — all colors use `$--` tokens
3. **Prevent overflow** — `width: "fill_container"` and layout frames
4. **Verify visually** — `get_screenshot` after every major batch
5. **Domain coherence** — every choice connects to Phase 1 research

## References

- `references/pencil-mcp-guide.md` — Pencil MCP tool reference
- `references/domain-research-guide.md` — Research strategies, font pairings
- `references/design-tokens-reference.md` — Token architecture, ~89 definitions
