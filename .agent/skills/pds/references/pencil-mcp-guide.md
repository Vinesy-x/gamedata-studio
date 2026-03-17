# Pencil MCP Tool Reference

Complete reference for every Pencil MCP tool used in design system generation. Load this file at the start of any Pencil workflow.

## Important Rules

- `.pen` files are encrypted — never use `Read`, `Grep`, or `cat` on them. Only use Pencil MCP tools.
- Always follow tool definitions and formats exactly.
- Call `get_editor_state` first to understand current context.
- Max 25 operations per `batch_design` call.
- Every `I()`, `C()`, `R()` operation must have a binding name.

---

## State & Navigation

### get_editor_state

Check the current editor state, active file, user selection, and schema.

```
get_editor_state({ include_schema: true })
```

**When to use:** At the start of every workflow. Returns the active `.pen` file path, selected nodes, and (optionally) the full `.pen` schema.

**Key return values:**
- `filePath` — the active `.pen` file path (use this in all subsequent calls)
- `selection` — currently selected node IDs
- `schema` — the `.pen` file schema (when `include_schema: true`)

### open_document

Open an existing `.pen` file or create a new one.

```
open_document("new")                     // Create fresh document
open_document("path/to/design.pen")      // Open existing file
```

**When to use:** When no document is active, or when the user specifies a file path.

---

## Design Intelligence

### get_guidelines

Load design composition rules for a specific topic.

```
get_guidelines({ topic: "design-system" })
```

**Available topics:** `code`, `table`, `tailwind`, `landing-page`, `design-system`

**When to use:** Before building components or screens. The `design-system` topic provides composition rules for reusable components. The `landing-page` topic provides layout patterns for marketing pages.

### get_style_guide_tags

Retrieve all available style tags for inspiration.

```
get_style_guide_tags()
```

**When to use:** Before calling `get_style_guide`. Returns an array of tags you can select from.

### get_style_guide

Get visual direction and inspiration matching domain tags.

```
get_style_guide({ tags: ["warm", "organic", "earthy", "website", "bakery"] })
get_style_guide({ name: "Specific Style Guide Name" })
```

**When to use:** After researching the domain. Select 5–10 tags that match the aesthetic. The returned guide provides color palettes, font pairings, and layout inspiration. Use this to complement (not replace) domain research.

**Tag selection tips:**
- Always include a format tag: `website`, `mobile`, `webapp`
- Include mood tags: `warm`, `cool`, `playful`, `professional`, `minimal`
- Include industry tags when available: `bakery`, `tech`, `fitness`
- Include style tags: `organic`, `geometric`, `flat`, `gradient`

---

## Reading & Discovery

### batch_get

Discover components, read node structure, search for patterns.

```
// List all reusable components
batch_get({ filePath, patterns: [{ reusable: true }], readDepth: 2 })

// Read specific nodes by ID
batch_get({ filePath, nodeIds: ["nodeId1", "nodeId2"], readDepth: 3 })

// Search for text nodes
batch_get({ filePath, patterns: [{ type: "text" }], searchDepth: 2 })

// Search within a specific parent
batch_get({ filePath, parentId: "screenId", patterns: [{ type: "frame" }] })

// List top-level document children (no patterns or nodeIds)
batch_get({ filePath })
```

**When to use:**
- Before creating components: check if similar ones already exist
- After creating components: verify structure and properties
- When building screens: find component IDs for `ref` instances
- To understand document structure: list top-level children

**Key parameters:**
- `patterns` — search filters (combine `type`, `name`, `reusable`)
- `nodeIds` — read specific nodes by ID
- `readDepth` — how deep to descend (default 1). Use 2–3 for components. Be careful with >3 (large data).
- `searchDepth` — how deep to search for pattern matches (default unlimited)
- `resolveInstances` — set `true` to expand `ref` nodes into full structure
- `resolveVariables` — set `true` to see computed values instead of variable references

### get_variables

Read existing design tokens and themes.

```
get_variables({ filePath })
```

**When to use:** Before creating tokens (to avoid overwriting). After creating tokens (to verify). Returns all variable definitions and theme axes.

### snapshot_layout

Check computed layout rectangles and detect problems.

```
// Check for layout problems only
snapshot_layout({ filePath, parentId: "screenId", problemsOnly: true })

// Get full layout for a specific node (depth 2)
snapshot_layout({ filePath, parentId: "cardId", maxDepth: 2 })

// Top-level canvas layout
snapshot_layout({ filePath, maxDepth: 0 })
```

**When to use:**
- After building complex layouts: detect clipping, overflow, overlapping
- When positioning new screens: understand canvas layout
- Debugging: when a screenshot shows unexpected layout

**Key parameters:**
- `parentId` — scope to a subtree (omit for whole document)
- `maxDepth` — limit depth (default 1). Use 0 for top-level only. Be careful with unlimited depth.
- `problemsOnly` — only return nodes with issues (clipping, overflow, etc.)

### find_empty_space_on_canvas

Find available space for new screens or component groups.

```
find_empty_space_on_canvas({
  filePath,
  direction: "right",
  width: 1440,
  height: 900,
  padding: 100
})
```

**When to use:** Before inserting a new screen. Returns `{ x, y }` coordinates where a frame of the requested size can be placed.

**Parameters:**
- `direction` — which direction to search: `"top"`, `"right"`, `"bottom"`, `"left"`
- `width`, `height` — the size of space needed
- `padding` — minimum distance from other elements
- `nodeId` — optional starting reference node

---

## Creating & Modifying

### set_variables

Create or update design tokens with optional theme support.

```
set_variables({
  filePath,
  variables: {
    "--primary": {
      type: "color",
      value: [
        { value: "#8B4513", theme: { mode: "light" } },
        { value: "#D4A574", theme: { mode: "dark" } }
      ]
    },
    "--background": {
      type: "color",
      value: [
        { value: "#FFF8DC", theme: { mode: "light" } },
        { value: "#1A1410", theme: { mode: "dark" } }
      ]
    },
    "--font-primary": {
      type: "string",
      value: "Playfair Display"
    },
    "--radius-md": {
      type: "number",
      value: 8
    }
  }
})
```

**When to use:** Phase 3 — create the full token system. Also when updating tokens later.

**Key rules:**
- Variable names are arbitrary strings — they don't need `$` prefix in definitions
- Theme axes (like `mode: light/dark`) are auto-registered when referenced in `values`
- Use `type: "color"` for colors, `type: "font"` for fonts, `type: "number"` for numbers
- For themed values, use `values: { "axis:value": "..." }` format
- For unthemed values, use `value: "..."` format
- Set `replace: true` to overwrite all existing variables (usually omit this)

### batch_design

Execute multiple design operations in a single call. This is the primary tool for building components and screens.

**Operation syntax:**

```javascript
// INSERT — Add a new node under a parent
foo=I("parentId", { type: "frame", name: "Card", layout: "vertical", fill: "$--card", cornerRadius: "$--radius-lg", padding: 16, reusable: true })

// INSERT a component instance (ref)
btn=I("parentId", { type: "ref", ref: "ButtonPrimaryId" })

// INSERT with children override
item=I("parentId", { type: "ref", ref: "CardId", children: [{ type: "text", content: "Custom", fontSize: 14 }] })

// COPY — Duplicate an existing node
copy=C("sourceId", "targetParent", { positionDirection: "right", positionPadding: 100 })

// COPY with descendant customization
card2=C("cardId", "parentId", { descendants: { "titleTextId": { content: "New Title" } } })

// UPDATE — Modify properties of an existing node (NOT children)
U("nodeId", { fill: "$--primary", padding: 16 })

// UPDATE descendant inside a component instance
U("instanceId/descendantId", { content: "Updated Text" })

// REPLACE — Swap a node entirely (good for slot content)
newNode=R("instanceId/slotId", { type: "text", content: "Custom slot content" })

// DELETE — Remove a node
D("nodeId")

// MOVE — Move a node to a different parent (optional index)
M("nodeId", "newParentId", 0)

// GENERATE IMAGE — Apply image fill to a frame/rectangle
G("frameId", "stock", "artisan bread bakery warm lighting")
G("frameId", "ai", "minimalist bakery logo warm brown tones flat design")
```

**Critical rules:**
- Max 25 operations per call
- Every `I()`, `C()`, `R()` MUST have a binding name (e.g., `foo=I(...)`)
- Use bindings as parent references: `child=I(parent, { ... })`
- Operations execute sequentially; on error, all operations roll back
- No `id` property on new nodes — IDs are auto-generated
- Use `$--variable` tokens for all colors, fonts, and radii
- Set `reusable: true` on component root frames
- Set `placeholder: true` on frames intended as content slots
- Do NOT use `U()` on descendants of a `C()` node — use `descendants` in the `C()` call instead
- `"document"` is a predefined binding for the root node — only use it for top-level screens

**Using bindings:**
```javascript
// Create a parent, then insert children into it
container=I("document", { type: "frame", name: "MyScreen", layout: "vertical" })
header=I(container, { type: "frame", layout: "horizontal", height: 64 })
content=I(container, { type: "frame", layout: "vertical", padding: 24 })
title=I(content, { type: "text", content: "Hello", fontFamily: "$--font-primary" })
```

**Path syntax for nested updates:**
```javascript
// Update a deeply nested descendant
U("instanceId/childId", { content: "New text" })

// Works for any nesting depth
U("instanceId/containerChildId/labelId", { content: "Updated" })
```

### replace_all_matching_properties

Bulk replace colors, fonts, or other properties across an entire subtree.

```
replace_all_matching_properties({
  filePath,
  parents: ["screenId1", "screenId2"],
  properties: {
    fillColor: [{ from: "#FF0000", to: "#00FF00" }],
    textColor: [{ from: "#333333", to: "#111111" }],
    fontFamily: [{ from: "Arial", to: "Inter" }],
    fontSize: [{ from: 14, to: 16 }],
    cornerRadius: [{ from: [4, 4, 4, 4], to: [8, 8, 8, 8] }]
  }
})
```

**When to use:** To fix hardcoded colors that leaked through, or to bulk-update fonts/sizes after a design direction change.

**Available properties:** `fillColor`, `textColor`, `strokeColor`, `strokeThickness`, `cornerRadius`, `padding`, `gap`, `fontSize`, `fontFamily`, `fontWeight`

---

## Verification

### get_screenshot

Capture a visual screenshot of any node.

```
get_screenshot({ filePath, nodeId: "screenId" })
```

**When to use:** After every major batch of operations. After building each screen. During final verification. The returned image should be carefully analyzed for:
- Alignment and spacing consistency
- Typography hierarchy (H1 > H2 > H3 > Body)
- Color contrast and readability
- Overflow or clipping
- Overall domain coherence

### search_all_unique_properties

Find all unique values for specific properties across a subtree.

```
search_all_unique_properties({
  filePath,
  parents: ["screenId1", "screenId2"],
  properties: ["fillColor", "textColor", "fontFamily"]
})
```

**When to use:** During final verification (Phase 7) to audit for hardcoded values. If the result shows hex colors that are not variable tokens, those need to be replaced.

---

## Common Patterns

### Creating a reusable component

```javascript
// Create the component master
btn=I("document", { type: "frame", name: "Button/Primary", layout: "horizontal", reusable: true, fill: "$--primary", cornerRadius: "$--radius-md", padding: [10, 20, 10, 20], gap: 8, justifyContent: "center", alignItems: "center" })
label=I(btn, { type: "text", name: "Label", content: "Button", fontFamily: "$--font-secondary", fontSize: 14, fontWeight: "600", fill: "$--primary-foreground" })
```

### Using a component instance on a screen

```javascript
// First, find the component ID via batch_get
// Then insert as a ref
submitBtn=I(formContainer, { type: "ref", ref: "ButtonPrimaryId" })
U(submitBtn+"/Label", { content: "Submit Order" })
```

### Creating a screen

```javascript
// Find empty space
// Call find_empty_space_on_canvas first to get x, y

screen=I("document", { type: "frame", name: "Landing Page", width: 1440, height: 900, x: 1600, y: 0, layout: "vertical", fill: "$--background", clip: true })
hero=I(screen, { type: "frame", name: "Hero Section", layout: "vertical", width: "fill_container", height: 500, padding: [80, 120, 80, 120], gap: 24, justifyContent: "center" })
heading=I(hero, { type: "text", content: "Fresh Baked Daily", fontFamily: "$--font-primary", fontSize: 56, fontWeight: "700", fill: "$--foreground", width: "fill_container" })
```
