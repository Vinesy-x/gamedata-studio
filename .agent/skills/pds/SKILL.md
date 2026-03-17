---
name: pds
description: >
  Pencil Design System generator. Invoke with /pds followed by a business domain
  (e.g., "/pds coffee shop"). Creates a complete design system with tokens,
  foundations, components, patterns in a .pen file.
disable-model-invocation: true
version: 1.5.0
license: MIT
metadata:
  author: jsstech
  tags: design-system, pencil, ui-kit, tokens, domain-aware
---

# Pencil Design System Generator

Orchestrator — researches the domain, creates ~89 themed tokens, then chains sub-skills for foundations, components, patterns, and verification.

## ⛔ GOLDEN RULES

1. **EVERY frame MUST have `layout: "vertical"` or `layout: "horizontal"`.** No exceptions.
2. **After EVERY `batch_design`, screenshot and CHECK for overlap.** Fix immediately.
3. **Copy exact code from reference files.** Do NOT improvise layout code.
4. **NEVER call `open_document("new")`.** Check `get_editor_state` first.
5. **NEVER put `"themes"` key in `set_variables`.** Crashes with "missing type".
6. **Use `height: "fit_content"` on section frames.**

## Workflow

1. **Parse input** — extract domain, brand, colors, fonts, reference image
2. **Phase 1 — Research** — CollectUI, reference image extraction, web search. Present design brief. Wait for user input.
3. **Phase 2 — Init document** — `get_editor_state`, `get_guidelines("design-system")`, `get_style_guide`, `get_variables`
4. **Phase 3 — Create ~89 tokens** — `set_variables` with themed colors, fonts, radii, spacing, shadows, sizes. Verify with `get_variables`. Present token count. Wait for user input.
5. **Auto-chain sub-skills** — read and execute: `../pds-foundations/SKILL.md` → `../pds-components/SKILL.md` → `../pds-patterns/SKILL.md` → `../pds-verify/SKILL.md`

**Token format — CORRECT:**
```json
{ "--primary": { "type": "color", "value": [
  { "value": "#3E2723", "theme": { "mode": "light" } },
  { "value": "#D7CCC8", "theme": { "mode": "dark" } }
]}}
```

**Semantic colors MUST be derived from primary palette** — match temperature, saturation, lightness.

See `references/design-tokens-reference.md`, `references/domain-research-guide.md`, `references/pencil-mcp-guide.md`.
