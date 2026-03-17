---
name: pds-export
description: >
  Export a Pencil Design System to production code. Generates Tailwind CSS tokens
  (v3 or v4), React/TSX components, and framework setup (Next.js or Vite+React).
  Use when user says "export to code", "generate Tailwind", or "convert to React".
disable-model-invocation: true
version: 1.5.0
license: MIT
compatibility: Requires Pencil MCP server and existing design system in .pen file.
metadata:
  author: jsstech
  tags: export, code, tailwind, react, design-system
---

# PDS Export — Code Generation

Convert the design system from a `.pen` file into production-ready Tailwind CSS + React components.

## Prerequisites (verify silently)

1. A `.pen` file is open with design tokens and components
2. User has explicitly requested code export

## Step 1: Collect Preferences

Ask the user for:
- **Tailwind version:** v3 or v4
- **Framework:** Next.js or Vite+React

## Step 2: Extract Tokens

Call `get_variables({ filePath })` to read all ~89 tokens. Categorize by type (color, number, string, shadow). Separate themed (light/dark) from static tokens.

## Step 3: Read Components

Call `batch_get({ patterns: [{ reusable: true }], readDepth: 3, searchDepth: 3 })` to get every reusable component with its full node tree.

## Step 4: Load Code Guidelines

Call `get_guidelines("code")` and `get_guidelines("tailwind")`. These are the **primary authority** for translating Pencil nodes to code — component instance mapping, property-to-Tailwind-class translation, font wiring, visual verification.

## Step 5: Generate globals.css

Build CSS with all tokens as custom properties:
- **v3:** `:root` with HSL values, `.dark` overrides, `@layer base` font utilities
- **v4:** `@import "tailwindcss"`, `@custom-variant dark`, `:root` with hex, `.dark` overrides

See `references/code-export-guide.md` → Sections 1-3.

## Step 6: Generate tailwind.config.js (v3 only)

Map tokens to Tailwind utility names: colors via `hsl(var(--name))`, radii, shadows, font sizes, spacing.

See `references/code-export-guide.md` → Section 4.

## Step 7: Generate Font Loading

- **Next.js:** `layout.tsx` with `next/font/google` loader
- **Vite+React:** `<link>` tags in `index.html`

See `references/code-export-guide.md` → Section 5.

## Step 8: Generate Component TSX Files

One file per component category (button.tsx, input.tsx, card.tsx, etc.). Each component:
- Uses only token-referencing Tailwind classes
- Has TypeScript interfaces with variant props
- Accepts and spreads `className` prop

See `references/code-export-guide.md` → Section 6.

## Step 9: Generate Screen/Page TSX Files (if screens exist)

For each screen:
1. Deep-read: `batch_get({ nodeIds: [screenId], readDepth: 10, resolveInstances: true })`
2. Reference screenshot: `get_screenshot({ nodeId: screenId })`
3. Follow Pencil's Component Implementation Workflow from Step 4 guidelines
4. Assemble complete page file with imports
5. Visually verify against Pencil screenshot

See `references/code-export-guide.md` → Section 7.

## Completion

Present generated file list with paths and brief descriptions.
