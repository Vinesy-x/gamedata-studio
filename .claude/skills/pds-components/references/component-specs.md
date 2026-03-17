# Component Specs

Exact `batch_design` operation code for all ~25 reusable components. Load this file during Phases 5 and 6.

## CRITICAL — Mandatory Property Rules

> **These rules address the #1 cause of visual bugs. Violating them produces broken layouts and invisible effects.**

1. **EVERY frame with `gap`, `alignItems`, or `justifyContent` MUST have an explicit `layout: "horizontal"` or `layout: "vertical"`.** Without `layout`, these properties are SILENTLY IGNORED and children are absolutely positioned (overlapping at 0,0). This applies to: component root frames, display rows, screen sections, nav bars, button groups, card grids, form rows — ALL frames.

2. **Shadow `effect` colors MUST use 8-digit hex (`#RRGGBBAA`), NOT `rgba()`.** The `rgba()` format is silently accepted but produces NO visible shadow. Use: 5%→`#0000000D`, 7%→`#00000012`, 10%→`#0000001A`, 15%→`#00000026`, 20%→`#00000033`.

3. **Text nodes with `width: "fill_container"` MUST also have `textGrowth: "fixed-width"`.** Without it, the default `textGrowth: "auto"` causes text to size itself to content, IGNORING the width property entirely. This is critical for table cells, form labels, and any text that should stretch to fill its parent.

4. **After EVERY `batch_design` call, verify:** scan the response for "unknown properties" warnings, then spot-check with `get_screenshot` that layouts render correctly (no overlapping, no invisible shadows).

## Important Notes

- Every component root frame must have `reusable: true`.
- All colors, fonts, radii, font sizes, font weights, and border widths must use `$--` variable tokens.
- Component names use slash notation: `"Button/Primary"`, `"Input/TextField"`.
- Max 25 operations per `batch_design` call — split components across batches.
- After each batch, call `get_screenshot` to verify rendering.
- Text nodes should use `width: "fill_container"` to prevent overflow. **When using `width: "fill_container"` on text, also set `textGrowth: "fixed-width"`** — otherwise the width is silently ignored.
- IDs are auto-generated — never set `id` in node data.
- **All components are inserted inside the Components section frame** — never at `"document"` root.
- **Use a neutral white backdrop (`fill: "#FFFFFF"`), NOT `$--background`.** The Components section is a documentation catalog — using the themed background makes light-fill variants (Ghost buttons, muted badges, secondary fills) hard to distinguish. A neutral white surface lets every component variant be evaluated accurately. Components themselves use `$--` tokens internally; only the section frame itself is neutral.
- **Category display rows MUST have explicit `layout: "horizontal"`.** Without it, child components are absolutely positioned and overlap. Pencil does NOT auto-infer layout from `gap` alone.
- **`flexWrap` and `crossAxisAlignment` are NOT supported by Pencil** and are silently ignored. `crossAxisAlignment` has been replaced with `alignItems` throughout these specs. `flexWrap` has been removed entirely.
- **Container components (Sidebar, Dropdown, Tabs/Container) must be populated with demo items.** An empty container with `slot: []` or `hug_contents` height collapses to zero/nothing. Always insert `ref` instances of the child components to show a realistic preview.
- **Use `icon_font` type with Lucide icons** for navigation and action icons — NOT unicode text characters (`\u25CB`, `\u25CF`) which render as tiny squares or wrong glyphs. Example: `{ type: "icon_font", iconFontFamily: "lucide", iconFontName: "house", width: 20, height: 20 }`.
- **All font sizes MUST use `$--text-*` tokens** — never raw pixel values. Use `"$--text-xs"` (12), `"$--text-sm"` (14), `"$--text-base"` (16), `"$--text-lg"` (18), `"$--text-xl"` (20), `"$--text-2xl"` (24), `"$--text-3xl"` (30), `"$--text-4xl"` (36), `"$--text-5xl"` (48). This ensures the entire type scale can be adjusted from one place via `set_variables`.
- **All font weights MUST use `$--weight-*` tokens** — never raw string values. Use `"$--weight-thin"` (200), `"$--weight-light"` (300), `"$--weight-regular"` (400), `"$--weight-medium"` (500), `"$--weight-semibold"` (600), `"$--weight-bold"` (700).
- **Border strokes MUST use `$--border-*` tokens** — use `"$--border-thin"` (1), `"$--border-default"` (1.5), `"$--border-thick"` (2) for `strokeThickness`.
- **Use `icon_font` width/height with explicit pixel values** (e.g., `width: 20, height: 20`) — variable references like `$--size-icon-md` may resolve to 0 for `icon_font` nodes. Use the sizing tokens for frame-based elements only.

---

## Pre-requisite: Create the Components Section Frame

Before building any components, create the Components master frame and category sub-frames. This frame is positioned below the foundation grid (x: 0, y: 1200).

```javascript
componentsSection=I("document", { type: "frame", name: "Components", width: 1440, height: "fit_content", x: 0, y: 1200, layout: "vertical", padding: [60, 80, 60, 80], gap: 48, fill: "#FFFFFF" })
componentsSectionTitle=I(componentsSection, { type: "text", content: "Components", fontFamily: "$--font-primary", fontSize: "$--text-5xl", fontWeight: "$--weight-bold", fill: "$--foreground" })
componentsSectionSubtitle=I(componentsSection, { type: "text", content: "Reusable UI building blocks", fontFamily: "$--font-secondary", fontSize: "$--text-lg", fill: "$--muted-foreground", width: "fill_container" })
```

**3 operations** — run this before Batch 1.

---

## Batch 1 — Buttons (5 components)

First, create the Buttons category frame inside the Components section.

```javascript
buttonsCategory=I(componentsSection, { type: "frame", name: "Buttons", layout: "vertical", gap: 16, width: "fill_container" })
buttonsCatTitle=I(buttonsCategory, { type: "text", content: "Buttons", fontFamily: "$--font-primary", fontSize: "$--text-2xl", fontWeight: "$--weight-semibold", fill: "$--foreground" })
buttonsRow=I(buttonsCategory, { type: "frame", layout: "horizontal", gap: 16, width: "fill_container", alignItems: "center" })
```

### Button/Primary

```javascript
btnPrimary=I(buttonsRow, { type: "frame", name: "Button/Primary", reusable: true, layout: "horizontal", fill: "$--primary", cornerRadius: "$--radius-md", padding: [10, 20, 10, 20], gap: 8, justifyContent: "center", alignItems: "center", width: "hug_contents", height: "hug_contents" })
btnPrimaryLabel=I(btnPrimary, { type: "text", name: "Label", content: "Button", fontFamily: "$--font-secondary", fontSize: "$--text-sm", fontWeight: "$--weight-semibold", fill: "$--primary-foreground", textAlignHorizontal: "center" })
```

### Button/Secondary

```javascript
btnSecondary=I(buttonsRow, { type: "frame", name: "Button/Secondary", reusable: true, layout: "horizontal", fill: "$--secondary", cornerRadius: "$--radius-md", padding: [10, 20, 10, 20], gap: 8, justifyContent: "center", alignItems: "center", width: "hug_contents", height: "hug_contents" })
btnSecLabel=I(btnSecondary, { type: "text", name: "Label", content: "Button", fontFamily: "$--font-secondary", fontSize: "$--text-sm", fontWeight: "$--weight-semibold", fill: "$--secondary-foreground", textAlignHorizontal: "center" })
```

### Button/Outline

```javascript
btnOutline=I(buttonsRow, { type: "frame", name: "Button/Outline", reusable: true, layout: "horizontal", fill: "transparent", stroke: "$--border", strokeThickness: "$--border-thin", cornerRadius: "$--radius-md", padding: [10, 20, 10, 20], gap: 8, justifyContent: "center", alignItems: "center", width: "hug_contents", height: "hug_contents" })
btnOutLabel=I(btnOutline, { type: "text", name: "Label", content: "Button", fontFamily: "$--font-secondary", fontSize: "$--text-sm", fontWeight: "$--weight-semibold", fill: "$--foreground", textAlignHorizontal: "center" })
```

### Button/Ghost

```javascript
btnGhost=I(buttonsRow, { type: "frame", name: "Button/Ghost", reusable: true, layout: "horizontal", fill: "transparent", cornerRadius: "$--radius-md", padding: [10, 20, 10, 20], gap: 8, justifyContent: "center", alignItems: "center", width: "hug_contents", height: "hug_contents" })
btnGhostLabel=I(btnGhost, { type: "text", name: "Label", content: "Button", fontFamily: "$--font-secondary", fontSize: "$--text-sm", fontWeight: "$--weight-semibold", fill: "$--foreground", textAlignHorizontal: "center" })
```

### Button/Destructive

```javascript
btnDestructive=I(buttonsRow, { type: "frame", name: "Button/Destructive", reusable: true, layout: "horizontal", fill: "$--destructive", cornerRadius: "$--radius-md", padding: [10, 20, 10, 20], gap: 8, justifyContent: "center", alignItems: "center", width: "hug_contents", height: "hug_contents" })
btnDestLabel=I(btnDestructive, { type: "text", name: "Label", content: "Delete", fontFamily: "$--font-secondary", fontSize: "$--text-sm", fontWeight: "$--weight-semibold", fill: "$--destructive-foreground", textAlignHorizontal: "center" })
```

**Batch 1 total: 3 category + 10 component = 13 operations** — within the 25-op limit.

---

## Batch 2 — Inputs (4 components)

```javascript
inputsCategory=I(componentsSection, { type: "frame", name: "Inputs", layout: "vertical", gap: 16, width: "fill_container" })
inputsCatTitle=I(inputsCategory, { type: "text", content: "Inputs", fontFamily: "$--font-primary", fontSize: "$--text-2xl", fontWeight: "$--weight-semibold", fill: "$--foreground" })
inputsRow=I(inputsCategory, { type: "frame", layout: "horizontal", gap: 16, width: "fill_container", alignItems: "flex_start" })
```

### Input/TextField

```javascript
inputText=I(inputsRow, { type: "frame", name: "Input/TextField", reusable: true, layout: "horizontal", fill: "$--background", stroke: "$--input", strokeThickness: "$--border-thin", cornerRadius: "$--radius-md", padding: [10, 14, 10, 14], width: 280, height: "hug_contents", alignItems: "center" })
inputTextPlaceholder=I(inputText, { type: "text", name: "Placeholder", content: "Enter text...", fontFamily: "$--font-secondary", fontSize: "$--text-sm", fill: "$--muted-foreground", width: "fill_container" })
```

### Input/Textarea

```javascript
inputTextarea=I(inputsRow, { type: "frame", name: "Input/Textarea", reusable: true, layout: "vertical", fill: "$--background", stroke: "$--input", strokeThickness: "$--border-thin", cornerRadius: "$--radius-md", padding: [10, 14, 10, 14], width: 280, height: 100 })
textareaPlaceholder=I(inputTextarea, { type: "text", name: "Placeholder", content: "Enter text...", fontFamily: "$--font-secondary", fontSize: "$--text-sm", fill: "$--muted-foreground", width: "fill_container" })
```

### Input/Select

```javascript
inputSelect=I(inputsRow, { type: "frame", name: "Input/Select", reusable: true, layout: "horizontal", fill: "$--background", stroke: "$--input", strokeThickness: "$--border-thin", cornerRadius: "$--radius-md", padding: [10, 14, 10, 14], width: 280, height: "hug_contents", alignItems: "center", justifyContent: "space_between" })
selectValue=I(inputSelect, { type: "text", name: "Value", content: "Select option...", fontFamily: "$--font-secondary", fontSize: "$--text-sm", fill: "$--muted-foreground", width: "fill_container" })
selectChevron=I(inputSelect, { type: "text", name: "Chevron", content: "\u25BC", fontSize: 10, fill: "$--muted-foreground" })
```

### Input/InputGroup

```javascript
inputGroup=I(inputsRow, { type: "frame", name: "Input/InputGroup", reusable: true, layout: "vertical", gap: 6, width: 280, height: "hug_contents" })
inputGroupLabel=I(inputGroup, { type: "text", name: "Label", content: "Label", fontFamily: "$--font-secondary", fontSize: "$--text-sm", fontWeight: "$--weight-medium", fill: "$--foreground" })
inputGroupField=I(inputGroup, { type: "frame", name: "Field", layout: "horizontal", fill: "$--background", stroke: "$--input", strokeThickness: "$--border-thin", cornerRadius: "$--radius-md", padding: [10, 14, 10, 14], width: "fill_container", height: "hug_contents", alignItems: "center" })
inputGroupPlaceholder=I(inputGroupField, { type: "text", name: "Placeholder", content: "Enter text...", fontFamily: "$--font-secondary", fontSize: "$--text-sm", fill: "$--muted-foreground", width: "fill_container" })
```

**Batch 2 total: 3 category + 11 component = 14 operations**

---

## Batch 3 — Typography (6 components)

```javascript
typoCategory=I(componentsSection, { type: "frame", name: "Typography", layout: "vertical", gap: 16, width: "fill_container" })
typoCatTitle=I(typoCategory, { type: "text", content: "Typography", fontFamily: "$--font-primary", fontSize: "$--text-2xl", fontWeight: "$--weight-semibold", fill: "$--foreground" })
typoCol=I(typoCategory, { type: "frame", layout: "vertical", gap: 12, width: "fill_container" })
```

### Typography/H1

```javascript
typoH1=I(typoCol, { type: "frame", name: "Typography/H1", reusable: true, layout: "vertical", width: "hug_contents", height: "hug_contents" })
typoH1Text=I(typoH1, { type: "text", name: "Text", content: "Heading 1", fontFamily: "$--font-primary", fontSize: "$--text-5xl", fontWeight: "$--weight-bold", fill: "$--foreground", lineHeight: 1.1 })
```

### Typography/H2

```javascript
typoH2=I(typoCol, { type: "frame", name: "Typography/H2", reusable: true, layout: "vertical", width: "hug_contents", height: "hug_contents" })
typoH2Text=I(typoH2, { type: "text", name: "Text", content: "Heading 2", fontFamily: "$--font-primary", fontSize: "$--text-4xl", fontWeight: "$--weight-bold", fill: "$--foreground", lineHeight: 1.2 })
```

### Typography/H3

```javascript
typoH3=I(typoCol, { type: "frame", name: "Typography/H3", reusable: true, layout: "vertical", width: "hug_contents", height: "hug_contents" })
typoH3Text=I(typoH3, { type: "text", name: "Text", content: "Heading 3", fontFamily: "$--font-primary", fontSize: "$--text-2xl", fontWeight: "$--weight-semibold", fill: "$--foreground", lineHeight: 1.3 })
```

### Typography/Body

```javascript
typoBody=I(typoCol, { type: "frame", name: "Typography/Body", reusable: true, layout: "vertical", width: "hug_contents", height: "hug_contents" })
typoBodyText=I(typoBody, { type: "text", name: "Text", content: "Body text goes here. This is the default paragraph style used throughout the design system.", fontFamily: "$--font-secondary", fontSize: "$--text-base", fontWeight: "$--weight-regular", fill: "$--foreground", lineHeight: 1.6 })
```

### Typography/Caption

```javascript
typoCaption=I(typoCol, { type: "frame", name: "Typography/Caption", reusable: true, layout: "vertical", width: "hug_contents", height: "hug_contents" })
typoCaptionText=I(typoCaption, { type: "text", name: "Text", content: "Caption text", fontFamily: "$--font-secondary", fontSize: "$--text-xs", fontWeight: "$--weight-regular", fill: "$--muted-foreground", lineHeight: 1.4 })
```

### Typography/Label

```javascript
typoLabel=I(typoCol, { type: "frame", name: "Typography/Label", reusable: true, layout: "vertical", width: "hug_contents", height: "hug_contents" })
typoLabelText=I(typoLabel, { type: "text", name: "Text", content: "Label", fontFamily: "$--font-secondary", fontSize: "$--text-sm", fontWeight: "$--weight-medium", fill: "$--foreground", lineHeight: 1.4 })
```

**Batch 3 total: 3 category + 12 component = 15 operations**

---

## Batch 4 — Badges (4 components)

```javascript
badgesCategory=I(componentsSection, { type: "frame", name: "Badges", layout: "vertical", gap: 16, width: "fill_container" })
badgesCatTitle=I(badgesCategory, { type: "text", content: "Badges", fontFamily: "$--font-primary", fontSize: "$--text-2xl", fontWeight: "$--weight-semibold", fill: "$--foreground" })
badgesRow=I(badgesCategory, { type: "frame", layout: "horizontal", gap: 12, width: "fill_container", alignItems: "center" })
```

### Badge/Default

```javascript
badgeDefault=I(badgesRow, { type: "frame", name: "Badge/Default", reusable: true, layout: "horizontal", fill: "$--secondary", cornerRadius: "$--radius-pill", padding: [4, 12, 4, 12], width: "hug_contents", height: "hug_contents", justifyContent: "center" })
badgeDefaultText=I(badgeDefault, { type: "text", name: "Label", content: "Badge", fontFamily: "$--font-secondary", fontSize: "$--text-xs", fontWeight: "$--weight-medium", fill: "$--secondary-foreground" })
```

### Badge/Success

```javascript
badgeSuccess=I(badgesRow, { type: "frame", name: "Badge/Success", reusable: true, layout: "horizontal", fill: "$--color-success", cornerRadius: "$--radius-pill", padding: [4, 12, 4, 12], width: "hug_contents", height: "hug_contents", justifyContent: "center" })
badgeSuccessText=I(badgeSuccess, { type: "text", name: "Label", content: "Success", fontFamily: "$--font-secondary", fontSize: "$--text-xs", fontWeight: "$--weight-medium", fill: "$--color-success-foreground" })
```

### Badge/Warning

```javascript
badgeWarning=I(badgesRow, { type: "frame", name: "Badge/Warning", reusable: true, layout: "horizontal", fill: "$--color-warning", cornerRadius: "$--radius-pill", padding: [4, 12, 4, 12], width: "hug_contents", height: "hug_contents", justifyContent: "center" })
badgeWarningText=I(badgeWarning, { type: "text", name: "Label", content: "Warning", fontFamily: "$--font-secondary", fontSize: "$--text-xs", fontWeight: "$--weight-medium", fill: "$--color-warning-foreground" })
```

### Badge/Error

```javascript
badgeError=I(badgesRow, { type: "frame", name: "Badge/Error", reusable: true, layout: "horizontal", fill: "$--color-error", cornerRadius: "$--radius-pill", padding: [4, 12, 4, 12], width: "hug_contents", height: "hug_contents", justifyContent: "center" })
badgeErrorText=I(badgeError, { type: "text", name: "Label", content: "Error", fontFamily: "$--font-secondary", fontSize: "$--text-xs", fontWeight: "$--weight-medium", fill: "$--color-error-foreground" })
```

**Batch 4 total: 3 category + 8 component = 11 operations**

---

## Batch 5 — Alerts (4 components)

```javascript
alertsCategory=I(componentsSection, { type: "frame", name: "Alerts", layout: "vertical", gap: 16, width: "fill_container" })
alertsCatTitle=I(alertsCategory, { type: "text", content: "Alerts", fontFamily: "$--font-primary", fontSize: "$--text-2xl", fontWeight: "$--weight-semibold", fill: "$--foreground" })
alertsCol=I(alertsCategory, { type: "frame", layout: "vertical", gap: 12, width: "fill_container" })
```

### Alert/Info

```javascript
alertInfo=I(alertsCol, { type: "frame", name: "Alert/Info", reusable: true, layout: "horizontal", fill: "$--color-info", cornerRadius: "$--radius-md", padding: [12, 16, 12, 16], gap: 12, width: 400, height: "hug_contents", alignItems: "center" })
alertInfoIcon=I(alertInfo, { type: "icon_font", name: "Icon", iconFontFamily: "lucide", iconFontName: "info", width: 20, height: 20, fill: "$--color-info-foreground" })
alertInfoText=I(alertInfo, { type: "text", name: "Message", content: "This is an informational message.", fontFamily: "$--font-secondary", fontSize: "$--text-sm", fill: "$--color-info-foreground", width: "fill_container" })
```

### Alert/Success

```javascript
alertSuccess=I(alertsCol, { type: "frame", name: "Alert/Success", reusable: true, layout: "horizontal", fill: "$--color-success", cornerRadius: "$--radius-md", padding: [12, 16, 12, 16], gap: 12, width: 400, height: "hug_contents", alignItems: "center" })
alertSuccessIcon=I(alertSuccess, { type: "icon_font", name: "Icon", iconFontFamily: "lucide", iconFontName: "circle-check", width: 20, height: 20, fill: "$--color-success-foreground" })
alertSuccessText=I(alertSuccess, { type: "text", name: "Message", content: "Operation completed successfully.", fontFamily: "$--font-secondary", fontSize: "$--text-sm", fill: "$--color-success-foreground", width: "fill_container" })
```

### Alert/Warning

```javascript
alertWarning=I(alertsCol, { type: "frame", name: "Alert/Warning", reusable: true, layout: "horizontal", fill: "$--color-warning", cornerRadius: "$--radius-md", padding: [12, 16, 12, 16], gap: 12, width: 400, height: "hug_contents", alignItems: "center" })
alertWarningIcon=I(alertWarning, { type: "icon_font", name: "Icon", iconFontFamily: "lucide", iconFontName: "triangle-alert", width: 20, height: 20, fill: "$--color-warning-foreground" })
alertWarningText=I(alertWarning, { type: "text", name: "Message", content: "Please review before proceeding.", fontFamily: "$--font-secondary", fontSize: "$--text-sm", fill: "$--color-warning-foreground", width: "fill_container" })
```

### Alert/Error

```javascript
alertError=I(alertsCol, { type: "frame", name: "Alert/Error", reusable: true, layout: "horizontal", fill: "$--color-error", cornerRadius: "$--radius-md", padding: [12, 16, 12, 16], gap: 12, width: 400, height: "hug_contents", alignItems: "center" })
alertErrorIcon=I(alertError, { type: "icon_font", name: "Icon", iconFontFamily: "lucide", iconFontName: "circle-x", width: 20, height: 20, fill: "$--color-error-foreground" })
alertErrorText=I(alertError, { type: "text", name: "Message", content: "Something went wrong. Please try again.", fontFamily: "$--font-secondary", fontSize: "$--text-sm", fill: "$--color-error-foreground", width: "fill_container" })
```

**Batch 5 total: 3 category + 12 component = 15 operations**

---

## Batch 6 — Card (1 composite component)

```javascript
cardsCategory=I(componentsSection, { type: "frame", name: "Cards", layout: "vertical", gap: 16, width: "fill_container" })
cardsCatTitle=I(cardsCategory, { type: "text", content: "Cards", fontFamily: "$--font-primary", fontSize: "$--text-2xl", fontWeight: "$--weight-semibold", fill: "$--foreground" })
cardsRow=I(cardsCategory, { type: "frame", layout: "horizontal", gap: 16, width: "fill_container" })
```

### Card

```javascript
card=I(cardsRow, { type: "frame", name: "Card", reusable: true, layout: "vertical", fill: "$--card", stroke: "$--border", strokeThickness: "$--border-thin", cornerRadius: "$--radius-lg", width: 360, height: "hug_contents", clip: true })
cardHeader=I(card, { type: "frame", name: "Header", layout: "vertical", padding: [16, 20, 12, 20], gap: 4, width: "fill_container", placeholder: true })
cardTitle=I(cardHeader, { type: "text", name: "Title", content: "Card Title", fontFamily: "$--font-primary", fontSize: "$--text-lg", fontWeight: "$--weight-semibold", fill: "$--card-foreground", width: "fill_container" })
cardDesc=I(cardHeader, { type: "text", name: "Description", content: "Card description text goes here.", fontFamily: "$--font-secondary", fontSize: "$--text-sm", fill: "$--muted-foreground", width: "fill_container" })
cardContent=I(card, { type: "frame", name: "Content", layout: "vertical", padding: [0, 20, 16, 20], gap: 12, width: "fill_container", placeholder: true })
cardActions=I(card, { type: "frame", name: "Actions", layout: "horizontal", padding: [12, 20, 16, 20], gap: 8, width: "fill_container", justifyContent: "end", alignItems: "center" })
```

**Batch 6 total: 3 category + 6 component = 9 operations**

---

## Batch 7 — Sidebar Navigation (4 components + populated demo)

> **Critical fixes applied:**
> - Display row MUST have `layout: "horizontal"` — without it, the sidebar and item variants overlap as absolutely-positioned elements instead of flowing side by side.
> - Nav icons use `icon_font` type with Lucide icon names — NOT unicode text characters (`\u25CB` etc.), which render as tiny squares.
> - The Sidebar component has a `slot: []` child that MUST be populated with demo nav item refs — an empty slot renders as a large blank area.
> - `flexWrap` and `crossAxisAlignment` are NOT supported by Pencil and were silently ignored. `crossAxisAlignment` has been replaced with `alignItems`; `flexWrap` has been removed.

```javascript
navCategory=I(componentsSection, { type: "frame", name: "Navigation", layout: "vertical", gap: 16, width: "fill_container" })
navCatTitle=I(navCategory, { type: "text", content: "Sidebar Navigation", fontFamily: "$--font-primary", fontSize: "$--text-2xl", fontWeight: "$--weight-semibold", fill: "$--foreground" })
navRow=I(navCategory, { type: "frame", layout: "horizontal", gap: 24, width: "fill_container" })
```

### Nav/Sidebar (Container with slot)

The sidebar is a container with a `slot` child. Set height to 280px — large enough to show demo items without wasting space.

```javascript
navSidebar=I(navRow, { type: "frame", name: "Nav/Sidebar", reusable: true, layout: "vertical", fill: "$--card", stroke: { fill: "$--border", thickness: { right: 1 } }, width: "$--size-sidebar-width", height: 280, padding: [16, 12, 16, 12] })
navSidebarContent=I(navSidebar, { type: "frame", name: "Content", layout: "vertical", gap: 2, width: "fill_container", height: "fit_content(0)", slot: [] })
```

### Nav/SectionTitle

```javascript
navSectionTitle=I(navRow, { type: "frame", name: "Nav/SectionTitle", reusable: true, layout: "horizontal", padding: [16, 12, 6, 12], width: 216, height: "hug_contents" })
navSTLabel=I(navSectionTitle, { type: "text", name: "Label", content: "SECTION", fontFamily: "$--font-secondary", fontSize: "$--text-xs", fontWeight: "$--weight-semibold", fill: "$--muted-foreground", letterSpacing: 1 })
```

### Nav/ActiveItem

```javascript
navActiveItem=I(navRow, { type: "frame", name: "Nav/ActiveItem", reusable: true, layout: "horizontal", fill: "$--secondary", cornerRadius: "$--radius-md", padding: [10, 12, 10, 12], gap: 10, width: 216, height: "hug_contents", alignItems: "center" })
navAIIcon=I(navActiveItem, { type: "icon_font", name: "Icon", iconFontFamily: "lucide", iconFontName: "house", width: 20, height: 20, fill: "$--primary" })
navAILabel=I(navActiveItem, { type: "text", name: "Label", content: "Dashboard", fontFamily: "$--font-secondary", fontSize: "$--text-sm", fontWeight: "$--weight-semibold", fill: "$--foreground" })
```

### Nav/DefaultItem

```javascript
navDefaultItem=I(navRow, { type: "frame", name: "Nav/DefaultItem", reusable: true, layout: "horizontal", cornerRadius: "$--radius-md", padding: [10, 12, 10, 12], gap: 10, width: 216, height: "hug_contents", alignItems: "center" })
navDIIcon=I(navDefaultItem, { type: "icon_font", name: "Icon", iconFontFamily: "lucide", iconFontName: "settings", width: 20, height: 20, fill: "$--muted-foreground" })
navDILabel=I(navDefaultItem, { type: "text", name: "Label", content: "Settings", fontFamily: "$--font-secondary", fontSize: "$--text-sm", fontWeight: "normal", fill: "$--muted-foreground" })
```

### Populate Sidebar Demo

After creating the 4 nav components, populate the sidebar's slot with demo items. Use bindings from earlier in the same batch to reference the reusable components.

```javascript
st1=I(navSidebarContent, { type: "ref", ref: navSectionTitle, width: "fill_container" })
U(st1+"/navSTLabel", { content: "MAIN" })
ai=I(navSidebarContent, { type: "ref", ref: navActiveItem, width: "fill_container" })
di1=I(navSidebarContent, { type: "ref", ref: navDefaultItem, width: "fill_container" })
U(di1+"/navDIIcon", { iconFontName: "shopping-bag" })
U(di1+"/navDILabel", { content: "Orders" })
di2=I(navSidebarContent, { type: "ref", ref: navDefaultItem, width: "fill_container" })
U(di2+"/navDIIcon", { iconFontName: "package" })
U(di2+"/navDILabel", { content: "Products" })
st2=I(navSidebarContent, { type: "ref", ref: navSectionTitle, width: "fill_container" })
U(st2+"/navSTLabel", { content: "SETTINGS" })
di3=I(navSidebarContent, { type: "ref", ref: navDefaultItem, width: "fill_container" })
```

**Batch 7 total: 3 category + 13 component + 12 population = 25 operations** (exactly at the limit — run as a single `batch_design` call)

---

## Batch 8 — Table (3 components)

```javascript
tableCategory=I(componentsSection, { type: "frame", name: "Tables", layout: "vertical", gap: 16, width: "fill_container" })
tableCatTitle=I(tableCategory, { type: "text", content: "Tables", fontFamily: "$--font-primary", fontSize: "$--text-2xl", fontWeight: "$--weight-semibold", fill: "$--foreground" })
tableCol=I(tableCategory, { type: "frame", layout: "vertical", gap: 12, width: "fill_container" })
```

### Table/Wrapper

```javascript
tableWrapper=I(tableCol, { type: "frame", name: "Table/Wrapper", reusable: true, layout: "vertical", fill: "$--card", stroke: "$--border", strokeThickness: "$--border-thin", cornerRadius: "$--radius-lg", width: 700, height: "hug_contents", clip: true })
```

### Table/HeaderRow

```javascript
tableHeaderRow=I(tableCol, { type: "frame", name: "Table/HeaderRow", reusable: true, layout: "horizontal", fill: "$--muted", padding: [10, 16, 10, 16], gap: 16, width: "fill_container", height: "hug_contents" })
tableHeaderCell1=I(tableHeaderRow, { type: "text", name: "Cell1", content: "Column", fontFamily: "$--font-secondary", fontSize: "$--text-xs", fontWeight: "$--weight-semibold", fill: "$--muted-foreground", width: "fill_container", textGrowth: "fixed-width", textTransform: "uppercase", letterSpacing: 0.5 })
tableHeaderCell2=I(tableHeaderRow, { type: "text", name: "Cell2", content: "Column", fontFamily: "$--font-secondary", fontSize: "$--text-xs", fontWeight: "$--weight-semibold", fill: "$--muted-foreground", width: "fill_container", textGrowth: "fixed-width", textTransform: "uppercase", letterSpacing: 0.5 })
tableHeaderCell3=I(tableHeaderRow, { type: "text", name: "Cell3", content: "Column", fontFamily: "$--font-secondary", fontSize: "$--text-xs", fontWeight: "$--weight-semibold", fill: "$--muted-foreground", width: "fill_container", textGrowth: "fixed-width", textTransform: "uppercase", letterSpacing: 0.5 })
```

### Table/DataRow

```javascript
tableDataRow=I(tableCol, { type: "frame", name: "Table/DataRow", reusable: true, layout: "horizontal", padding: [12, 16, 12, 16], gap: 16, width: "fill_container", height: "hug_contents", stroke: "$--border", strokeSides: ["bottom"], strokeThickness: "$--border-thin" })
tableDataCell1=I(tableDataRow, { type: "text", name: "Cell1", content: "Data", fontFamily: "$--font-secondary", fontSize: "$--text-sm", fill: "$--foreground", width: "fill_container", textGrowth: "fixed-width" })
tableDataCell2=I(tableDataRow, { type: "text", name: "Cell2", content: "Data", fontFamily: "$--font-secondary", fontSize: "$--text-sm", fill: "$--foreground", width: "fill_container", textGrowth: "fixed-width" })
tableDataCell3=I(tableDataRow, { type: "text", name: "Cell3", content: "Data", fontFamily: "$--font-secondary", fontSize: "$--text-sm", fill: "$--muted-foreground", width: "fill_container", textGrowth: "fixed-width" })
```

**Batch 8 total: 3 category + 10 component = 13 operations**

---

## Batch 9 — Tabs (3 components)

```javascript
tabsCategory=I(componentsSection, { type: "frame", name: "Tabs", layout: "vertical", gap: 16, width: "fill_container" })
tabsCatTitle=I(tabsCategory, { type: "text", content: "Tabs", fontFamily: "$--font-primary", fontSize: "$--text-2xl", fontWeight: "$--weight-semibold", fill: "$--foreground" })
tabsRow=I(tabsCategory, { type: "frame", layout: "horizontal", gap: 16, width: "fill_container" })
```

### Tabs/ActiveTab & Tabs/InactiveTab (hidden building blocks)

Create the child components inside a hidden `_defs` frame — they serve as reusable definitions referenced by the Container but don't clutter the display row.

```javascript
tabsDefs=I(tabsCategory, { type: "frame", name: "_defs", width: 0, height: 0, clip: true })
tabActive=I(tabsDefs, { type: "frame", name: "Tabs/ActiveTab", reusable: true, layout: "horizontal", padding: [10, 16, 10, 16], stroke: "$--primary", strokeSides: ["bottom"], strokeThickness: "$--border-thick", justifyContent: "center" })
tabActiveText=I(tabActive, { type: "text", name: "Label", content: "Active Tab", fontFamily: "$--font-secondary", fontSize: "$--text-sm", fontWeight: "$--weight-semibold", fill: "$--foreground" })
tabInactive=I(tabsDefs, { type: "frame", name: "Tabs/InactiveTab", reusable: true, layout: "horizontal", padding: [10, 16, 10, 16], justifyContent: "center" })
tabInactiveText=I(tabInactive, { type: "text", name: "Label", content: "Tab", fontFamily: "$--font-secondary", fontSize: "$--text-sm", fontWeight: "$--weight-regular", fill: "$--muted-foreground" })
```

### Tabs/Container (populated with demo tabs — in the display row)

```javascript
tabsContainer=I(tabsRow, { type: "frame", name: "Tabs/Container", reusable: true, layout: "horizontal", stroke: "$--border", strokeSides: ["bottom"], strokeThickness: "$--border-thin", gap: 0, width: "fill_container", height: "hug_contents" })
tc1=I(tabsContainer, { type: "ref", ref: tabActive })
U(tc1+"/Label", { content: "Overview" })
tc2=I(tabsContainer, { type: "ref", ref: tabInactive })
U(tc2+"/Label", { content: "Details" })
tc3=I(tabsContainer, { type: "ref", ref: tabInactive })
U(tc3+"/Label", { content: "Settings" })
```

**Note:** Child components go in a hidden `_defs` frame (`width: 0, height: 0, clip: true`) so only the assembled Container is visible. The Container must be created AFTER its children so it can reference them. Container components with `hug_contents` height collapse to zero when empty — always populate with demo refs.

**Batch 9 total: 3 category + 12 component = 15 operations**

---

## Batch 10 — Breadcrumbs (3 components)

```javascript
bcCategory=I(componentsSection, { type: "frame", name: "Breadcrumbs", layout: "vertical", gap: 16, width: "fill_container" })
bcCatTitle=I(bcCategory, { type: "text", content: "Breadcrumbs", fontFamily: "$--font-primary", fontSize: "$--text-2xl", fontWeight: "$--weight-semibold", fill: "$--foreground" })
bcRow=I(bcCategory, { type: "frame", layout: "horizontal", gap: 8, width: "fill_container" })
```

```javascript
bcItem=I(bcRow, { type: "frame", name: "Breadcrumb/Item", reusable: true, layout: "horizontal", padding: [4, 0, 4, 0] })
bcItemText=I(bcItem, { type: "text", name: "Label", content: "Page", fontFamily: "$--font-secondary", fontSize: "$--text-sm", fill: "$--muted-foreground" })
bcSeparator=I(bcRow, { type: "frame", name: "Breadcrumb/Separator", reusable: true, layout: "horizontal", padding: [4, 4, 4, 4] })
bcSepText=I(bcSeparator, { type: "text", name: "Sep", content: "/", fontFamily: "$--font-secondary", fontSize: "$--text-sm", fill: "$--muted-foreground" })
bcActive=I(bcRow, { type: "frame", name: "Breadcrumb/Active", reusable: true, layout: "horizontal", padding: [4, 0, 4, 0] })
bcActiveText=I(bcActive, { type: "text", name: "Label", content: "Current", fontFamily: "$--font-secondary", fontSize: "$--text-sm", fontWeight: "$--weight-semibold", fill: "$--foreground" })
```

**Batch 10 total: 3 category + 6 component = 9 operations**

---

## Batch 11 — Pagination (4 components)

```javascript
pageCategory=I(componentsSection, { type: "frame", name: "Pagination", layout: "vertical", gap: 16, width: "fill_container" })
pageCatTitle=I(pageCategory, { type: "text", content: "Pagination", fontFamily: "$--font-primary", fontSize: "$--text-2xl", fontWeight: "$--weight-semibold", fill: "$--foreground" })
pageRow=I(pageCategory, { type: "frame", layout: "horizontal", gap: 8, width: "fill_container", alignItems: "center" })
```

Create the child components inside a hidden `_defs` frame — they serve as reusable definitions referenced by the Container but don't clutter the display row.

```javascript
pageDefs=I(pageCategory, { type: "frame", name: "_defs", width: 0, height: 0, clip: true })
pageItem=I(pageDefs, { type: "frame", name: "Pagination/Item", reusable: true, layout: "horizontal", fill: "$--background", stroke: "$--border", strokeThickness: "$--border-thin", cornerRadius: "$--radius-md", width: 36, height: 36, justifyContent: "center", alignItems: "center" })
pageItemText=I(pageItem, { type: "text", name: "Number", content: "1", fontFamily: "$--font-secondary", fontSize: "$--text-sm", fill: "$--foreground", textAlignHorizontal: "center" })
pageActive=I(pageDefs, { type: "frame", name: "Pagination/ActiveItem", reusable: true, layout: "horizontal", fill: "$--primary", cornerRadius: "$--radius-md", width: 36, height: 36, justifyContent: "center", alignItems: "center" })
pageActiveText=I(pageActive, { type: "text", name: "Number", content: "1", fontFamily: "$--font-secondary", fontSize: "$--text-sm", fontWeight: "$--weight-semibold", fill: "$--primary-foreground", textAlignHorizontal: "center" })
pagePrevNext=I(pageDefs, { type: "frame", name: "Pagination/PrevNext", reusable: true, layout: "horizontal", fill: "$--background", stroke: "$--border", strokeThickness: "$--border-thin", cornerRadius: "$--radius-md", padding: [8, 12, 8, 12], justifyContent: "center", alignItems: "center" })
pagePrevNextText=I(pagePrevNext, { type: "text", name: "Label", content: "Next", fontFamily: "$--font-secondary", fontSize: "$--text-sm", fill: "$--foreground" })
```

Then create the Container in the display row, populated with refs:

```javascript
pageContainer=I(pageRow, { type: "frame", name: "Pagination/Container", reusable: true, layout: "horizontal", gap: 4, justifyContent: "center", alignItems: "center", width: "hug_contents", height: "hug_contents" })
pp1=I(pageContainer, { type: "ref", ref: pagePrevNext })
U(pp1+"/Label", { content: "Prev" })
pi1=I(pageContainer, { type: "ref", ref: pageItem })
U(pi1+"/Number", { content: "1" })
pa1=I(pageContainer, { type: "ref", ref: pageActive })
U(pa1+"/Number", { content: "2" })
pi2=I(pageContainer, { type: "ref", ref: pageItem })
U(pi2+"/Number", { content: "3" })
pp2=I(pageContainer, { type: "ref", ref: pagePrevNext })
U(pp2+"/Label", { content: "Next" })
```

**Note:** Child components go in a hidden `_defs` frame (`width: 0, height: 0, clip: true`) so only the assembled Container is visible. The Container must be created AFTER its children so it can reference them. Container components with `hug_contents` height collapse to zero when empty — always populate with demo refs showing a realistic pagination: Prev, 1, **2**, 3, Next.

**Batch 11 total: 3 category + 18 component = 21 operations**

---

## Batch 12 — Modal/Dialog (1 component)

```javascript
modalCategory=I(componentsSection, { type: "frame", name: "Modals", layout: "vertical", gap: 16, width: "fill_container" })
modalCatTitle=I(modalCategory, { type: "text", content: "Modals", fontFamily: "$--font-primary", fontSize: "$--text-2xl", fontWeight: "$--weight-semibold", fill: "$--foreground" })
modalRow=I(modalCategory, { type: "frame", layout: "horizontal", gap: 16, width: "fill_container" })
```

```javascript
modal=I(modalRow, { type: "frame", name: "Modal/Dialog", reusable: true, layout: "vertical", fill: "$--card", cornerRadius: "$--radius-lg", width: 480, height: "hug_contents", clip: true })
modalHeader=I(modal, { type: "frame", name: "Header", layout: "horizontal", padding: [20, 24, 12, 24], width: "fill_container", justifyContent: "space_between", alignItems: "center" })
modalTitle=I(modalHeader, { type: "text", name: "Title", content: "Dialog Title", fontFamily: "$--font-primary", fontSize: "$--text-lg", fontWeight: "$--weight-semibold", fill: "$--card-foreground" })
modalClose=I(modalHeader, { type: "text", name: "CloseIcon", content: "\u2715", fontSize: "$--text-base", fill: "$--muted-foreground" })
modalBody=I(modal, { type: "frame", name: "Body", layout: "vertical", padding: [0, 24, 16, 24], gap: 12, width: "fill_container", placeholder: true })
modalBodyText=I(modalBody, { type: "text", name: "Description", content: "Dialog content goes here. Add any content or form elements.", fontFamily: "$--font-secondary", fontSize: "$--text-sm", fill: "$--muted-foreground", width: "fill_container", lineHeight: 1.5 })
modalFooter=I(modal, { type: "frame", name: "Footer", layout: "horizontal", padding: [12, 24, 20, 24], gap: 8, width: "fill_container", justifyContent: "end" })
```

**Batch 12 total: 3 category + 7 component = 10 operations**

---

## Batch 13 — Dropdown (4 components + populated demo)

> **Same pattern as Sidebar Navigation:** The display row MUST have `layout: "horizontal"`. The Dropdown/Container MUST be populated with demo menu items — an empty container collapses to nothing. Unsupported `flexWrap` has been removed; `crossAxisAlignment` has been replaced with `alignItems`.

```javascript
ddCategory=I(componentsSection, { type: "frame", name: "Dropdown", layout: "vertical", gap: 16, width: "fill_container" })
ddCatTitle=I(ddCategory, { type: "text", content: "Dropdown", fontFamily: "$--font-primary", fontSize: "$--text-2xl", fontWeight: "$--weight-semibold", fill: "$--foreground" })
ddRow=I(ddCategory, { type: "frame", layout: "horizontal", gap: 24, width: "fill_container" })
```

### Dropdown/Container

The container uses `hug_contents` height — it auto-sizes based on its children. Populated with demo items below.

```javascript
dropdown=I(ddRow, { type: "frame", name: "Dropdown/Container", reusable: true, layout: "vertical", fill: "$--card", stroke: { fill: "$--border", thickness: 1 }, cornerRadius: "$--radius-md", padding: [4, 0, 4, 0], width: 220, height: "hug_contents", effect: { type: "shadow", shadowType: "outer", color: "#1A191812", blur: 8, offset: { x: 0, y: 4 } } })
```

### Dropdown/SectionTitle

```javascript
ddSectionTitle=I(ddRow, { type: "frame", name: "Dropdown/SectionTitle", reusable: true, layout: "horizontal", padding: [8, 12, 4, 12], width: 220 })
ddSTLabel=I(ddSectionTitle, { type: "text", name: "Label", content: "Section", fontFamily: "$--font-secondary", fontSize: "$--text-xs", fontWeight: "$--weight-semibold", fill: "$--muted-foreground" })
```

### Dropdown/Item

```javascript
ddItem=I(ddRow, { type: "frame", name: "Dropdown/Item", reusable: true, layout: "horizontal", padding: [8, 12, 8, 12], gap: 10, width: 220, height: "hug_contents", alignItems: "center" })
ddItemLabel=I(ddItem, { type: "text", name: "Label", content: "Menu Item", fontFamily: "$--font-secondary", fontSize: "$--text-sm", fill: "$--foreground" })
```

### Dropdown/Divider

```javascript
ddDivider=I(ddRow, { type: "frame", name: "Dropdown/Divider", reusable: true, fill: "$--border", width: 220, height: 1 })
```

### Populate Dropdown Demo

Populate the container so it renders as a realistic dropdown menu.

```javascript
ds1=I(dropdown, { type: "ref", ref: ddSectionTitle, width: "fill_container" })
U(ds1+"/ddSTLabel", { content: "Actions" })
di1=I(dropdown, { type: "ref", ref: ddItem, width: "fill_container" })
U(di1+"/ddItemLabel", { content: "Edit" })
di2=I(dropdown, { type: "ref", ref: ddItem, width: "fill_container" })
U(di2+"/ddItemLabel", { content: "Duplicate" })
dv1=I(dropdown, { type: "ref", ref: ddDivider, width: "fill_container" })
ds2=I(dropdown, { type: "ref", ref: ddSectionTitle, width: "fill_container" })
U(ds2+"/ddSTLabel", { content: "Danger" })
di3=I(dropdown, { type: "ref", ref: ddItem, width: "fill_container" })
U(di3+"/ddItemLabel", { content: "Delete", fill: "$--destructive" })
```

**Batch 13 total: 3 category + 8 component + 11 population = 22 operations**

---

## Batch 14 — Miscellaneous (5 components)

```javascript
miscCategory=I(componentsSection, { type: "frame", name: "Miscellaneous", layout: "vertical", gap: 16, width: "fill_container" })
miscCatTitle=I(miscCategory, { type: "text", content: "Miscellaneous", fontFamily: "$--font-primary", fontSize: "$--text-2xl", fontWeight: "$--weight-semibold", fill: "$--foreground" })
miscRow=I(miscCategory, { type: "frame", layout: "horizontal", gap: 16, width: "fill_container", alignItems: "center" })
```

### Avatar

```javascript
avatar=I(miscRow, { type: "frame", name: "Avatar", reusable: true, layout: "horizontal", fill: "$--muted", cornerRadius: "$--radius-pill", width: "$--size-avatar-md", height: "$--size-avatar-md", justifyContent: "center", alignItems: "center", clip: true })
avatarInitials=I(avatar, { type: "text", name: "Initials", content: "AB", fontFamily: "$--font-secondary", fontSize: "$--text-sm", fontWeight: "$--weight-semibold", fill: "$--muted-foreground", textAlignHorizontal: "center" })
```

### Divider

```javascript
divider=I(miscRow, { type: "frame", name: "Divider", reusable: true, fill: "$--border", width: "fill_container", height: 1 })
```

### Switch

```javascript
switchComp=I(miscRow, { type: "frame", name: "Switch", reusable: true, layout: "horizontal", fill: "$--primary", cornerRadius: "$--radius-pill", width: 44, height: 24, padding: [2, 2, 2, 2], justifyContent: "end", alignItems: "center" })
switchKnob=I(switchComp, { type: "ellipse", name: "Knob", fill: "#FFFFFF", width: 20, height: 20 })
```

### Checkbox

```javascript
checkbox=I(miscRow, { type: "frame", name: "Checkbox", reusable: true, layout: "horizontal", fill: "$--primary", stroke: "$--primary", strokeThickness: "$--border-thin", cornerRadius: "$--radius-sm", width: 20, height: 20, justifyContent: "center", alignItems: "center" })
checkboxMark=I(checkbox, { type: "text", name: "Check", content: "\u2713", fontSize: "$--text-xs", fill: "$--primary-foreground", textAlignHorizontal: "center" })
```

### Radio

```javascript
radio=I(miscRow, { type: "frame", name: "Radio", reusable: true, layout: "horizontal", fill: "$--background", stroke: "$--primary", strokeThickness: "$--border-thick", cornerRadius: "$--radius-pill", width: 20, height: 20, justifyContent: "center", alignItems: "center" })
radioDot=I(radio, { type: "ellipse", name: "Dot", fill: "$--primary", width: 10, height: 10 })
```

**Batch 14 total: 3 category + 10 component = 13 operations**

---

## Summary

| Batch | Components | Category Ops | Component Ops | Total |
|-------|-----------|-------------|---------------|-------|
| Pre | Components section frame | — | 3 | 3 |
| 1 | 5 Buttons | 3 | 10 | 13 |
| 2 | 4 Inputs | 3 | 11 | 14 |
| 3 | 6 Typography | 3 | 12 | 15 |
| 4 | 4 Badges | 3 | 8 | 11 |
| 5 | 4 Alerts | 3 | 12 | 15 |
| 6 | 1 Card | 3 | 6 | 9 |
| 7 | 4 Sidebar Nav | 3 | 10 | 13 |
| 8 | 3 Table | 3 | 10 | 13 |
| 9 | 3 Tabs | 3 | 5 | 8 |
| 10 | 3 Breadcrumbs | 3 | 6 | 9 |
| 11 | 4 Pagination | 3 | 7 | 10 |
| 12 | 1 Modal | 3 | 7 | 10 |
| 13 | 4 Dropdown | 3 | 6 | 9 |
| 14 | 5 Misc | 3 | 10 | 13 |
| **Total** | **~51 variants** | **42** | **123** | **165** |

All batches are within the 25-operation limit. Call `get_screenshot` after each batch to verify rendering.
