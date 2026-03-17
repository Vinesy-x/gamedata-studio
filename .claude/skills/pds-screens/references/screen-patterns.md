# Screen Patterns

Layout patterns, composition showcases, and domain-specific screen templates. Load this file during Phases 7 and 8.

## CRITICAL — Mandatory Property Rules

> **These rules address the #1 cause of visual bugs. Violating them produces broken layouts and invisible effects.**

1. **EVERY frame with `gap`, `alignItems`, or `justifyContent` MUST have an explicit `layout: "horizontal"` or `layout: "vertical"`.** This includes: navbars, button rows, CTA rows, feature grids, card grids, form button rows, breadcrumb bars, tab bars — ALL horizontal arrangements.

2. **Shadow `effect` colors MUST use 8-digit hex (`#RRGGBBAA`), NOT `rgba()`.** The `rgba()` format produces NO visible shadow.

3. **Text nodes with `width: "fill_container"` MUST also have `textGrowth: "fixed-width"`.** Without it, the text sizes itself to content and ignores the width entirely. Critical for table cells and form labels.

## Important Rules

- Every element on a screen must be a `ref` instance of a reusable component, or a simple layout frame.
- Never recreate component internals — always use `{ type: "ref", ref: "ComponentId" }`.
- Find component IDs first: `batch_get({ filePath, patterns: [{ reusable: true }] })`.
- **Documentation sections** (Foundations, Components, Patterns) use `fill: "#FFFFFF"` — neutral white so all component variants remain visible regardless of theme.
- **Application screens** (Landing Page, Dashboard, etc.) use `fill: "$--background"` or `fill: "$--card"` — themed fills.
- For centered form/auth screens, set both `alignItems: "center"` (horizontal) AND `justifyContent: "center"` (vertical) on the screen frame.
- **Every horizontal row of elements MUST have `layout: "horizontal"`** — setting `gap` alone does NOT enable auto-layout. Without explicit layout, children are absolutely positioned and overflow their container.
- **Use `width: "fill_container"` for grid items** — hardcoded pixel widths (e.g., `width: 380`) break when container padding varies. `"fill_container"` distributes evenly.
- Call `get_screenshot` after completing each screen or pattern. Check for overflow — elements extending beyond frame boundaries.

---

## Patterns Section

Create the Patterns section frame to the right of Components at `x: 1540, y: 1200`. This section showcases 4 composition patterns demonstrating how components work together.

### Pre-requisite: Create Patterns Section Frame

```javascript
patternsSection=I("document", { type: "frame", name: "Patterns", width: 1440, height: "fit_content", x: 1540, y: 1200, layout: "vertical", padding: [60, 80, 60, 80], gap: 48, fill: "#FFFFFF" })
patternsSectionTitle=I(patternsSection, { type: "text", content: "Patterns", fontFamily: "$--font-primary", fontSize: 48, fontWeight: "700", fill: "$--foreground" })
patternsSectionSubtitle=I(patternsSection, { type: "text", content: "Composition showcases demonstrating component usage", fontFamily: "$--font-secondary", fontSize: 18, fill: "$--muted-foreground", width: "fill_container" })
```

**3 operations**

---

### Pattern 1 — Form Pattern

Demonstrates InputGroup refs stacked vertically with a submit button. Typical for contact forms, login pages, and settings.

```javascript
formPatternFrame=I(patternsSection, { type: "frame", name: "Form Pattern", layout: "vertical", gap: 16, width: "fill_container" })
formPatternTitle=I(formPatternFrame, { type: "text", content: "Form Pattern", fontFamily: "$--font-primary", fontSize: 24, fontWeight: "600", fill: "$--foreground" })
formPatternDesc=I(formPatternFrame, { type: "text", content: "Vertical stack of InputGroup components with submit action.", fontFamily: "$--font-secondary", fontSize: 14, fill: "$--muted-foreground", width: "fill_container" })

formDemo=I(formPatternFrame, { type: "frame", name: "Form Demo", layout: "vertical", gap: 20, width: 480, padding: [32, 32, 32, 32], fill: "$--card", cornerRadius: "$--radius-lg", stroke: "$--border", strokeThickness: 1 })
formDemoTitle=I(formDemo, { type: "text", content: "Contact Us", fontFamily: "$--font-primary", fontSize: 24, fontWeight: "600", fill: "$--card-foreground" })
nameField=I(formDemo, { type: "ref", ref: "InputGroupId", width: "fill_container" })
U(nameField+"/Label", { content: "Full Name" })
U(nameField+"/Placeholder", { content: "Enter your name" })
emailField=I(formDemo, { type: "ref", ref: "InputGroupId", width: "fill_container" })
U(emailField+"/Label", { content: "Email" })
U(emailField+"/Placeholder", { content: "you@example.com" })
messageField=I(formDemo, { type: "ref", ref: "InputTextareaId", width: "fill_container" })
formBtnRow=I(formDemo, { type: "frame", layout: "horizontal", gap: 8, width: "fill_container", justifyContent: "end" })
formCancelBtn=I(formBtnRow, { type: "ref", ref: "ButtonOutlineId" })
U(formCancelBtn+"/Label", { content: "Cancel" })
formSubmitBtn=I(formBtnRow, { type: "ref", ref: "ButtonPrimaryId" })
U(formSubmitBtn+"/Label", { content: "Send Message" })
```

**~18 operations** — replace `InputGroupId`, `InputTextareaId`, `ButtonOutlineId`, `ButtonPrimaryId` with actual component IDs from `batch_get`.

---

### Pattern 2 — Data Display Pattern

Demonstrates Table + Pagination working together. Typical for admin dashboards, CRM views, and user management.

```javascript
dataPatternFrame=I(patternsSection, { type: "frame", name: "Data Display Pattern", layout: "vertical", gap: 16, width: "fill_container" })
dataPatternTitle=I(dataPatternFrame, { type: "text", content: "Data Display Pattern", fontFamily: "$--font-primary", fontSize: 24, fontWeight: "600", fill: "$--foreground" })
dataPatternDesc=I(dataPatternFrame, { type: "text", content: "Table with header, data rows, and pagination controls.", fontFamily: "$--font-secondary", fontSize: 14, fill: "$--muted-foreground", width: "fill_container" })

dataHeader=I(dataPatternFrame, { type: "frame", layout: "horizontal", width: "fill_container", justifyContent: "space_between", alignItems: "center" })
dataHeaderTitle=I(dataHeader, { type: "text", content: "Users", fontFamily: "$--font-primary", fontSize: 20, fontWeight: "600", fill: "$--foreground" })
dataAddBtn=I(dataHeader, { type: "ref", ref: "ButtonPrimaryId" })
U(dataAddBtn+"/Label", { content: "Add User" })

dataTable=I(dataPatternFrame, { type: "ref", ref: "TableWrapperId", width: "fill_container" })
dataPageRow=I(dataPatternFrame, { type: "frame", layout: "horizontal", width: "fill_container", justifyContent: "center" })
dataPagination=I(dataPageRow, { type: "ref", ref: "PaginationContainerId" })
```

**~12 operations** — replace IDs with actuals.

---

### Pattern 3 — Navigation Pattern

Demonstrates Sidebar + Breadcrumbs + Tabs working together. Typical for app shells and dashboard layouts.

```javascript
navPatternFrame=I(patternsSection, { type: "frame", name: "Navigation Pattern", layout: "vertical", gap: 16, width: "fill_container" })
navPatternTitle=I(navPatternFrame, { type: "text", content: "Navigation Pattern", fontFamily: "$--font-primary", fontSize: 24, fontWeight: "600", fill: "$--foreground" })
navPatternDesc=I(navPatternFrame, { type: "text", content: "Sidebar navigation with breadcrumbs and tab bar.", fontFamily: "$--font-secondary", fontSize: 14, fill: "$--muted-foreground", width: "fill_container" })

navDemo=I(navPatternFrame, { type: "frame", name: "Nav Demo", layout: "horizontal", width: "fill_container", height: 400, fill: "$--background", cornerRadius: "$--radius-lg", stroke: "$--border", strokeThickness: 1, clip: true })

navSidebarRef=I(navDemo, { type: "ref", ref: "NavSidebarContainerId", height: "fill_container" })

navMainArea=I(navDemo, { type: "frame", layout: "vertical", width: "fill_container", height: "fill_container" })
navBreadcrumbBar=I(navMainArea, { type: "frame", layout: "horizontal", padding: [12, 24, 12, 24], gap: 4, width: "fill_container", alignItems: "center", stroke: "$--border", strokeSides: ["bottom"], strokeThickness: 1 })
navBcHome=I(navBreadcrumbBar, { type: "ref", ref: "BreadcrumbItemId" })
U(navBcHome+"/Label", { content: "Home" })
navBcSep=I(navBreadcrumbBar, { type: "ref", ref: "BreadcrumbSeparatorId" })
navBcCurrent=I(navBreadcrumbBar, { type: "ref", ref: "BreadcrumbActiveId" })
U(navBcCurrent+"/Label", { content: "Dashboard" })

navTabBar=I(navMainArea, { type: "frame", layout: "horizontal", padding: [0, 24, 0, 24], width: "fill_container" })
navActiveTab=I(navTabBar, { type: "ref", ref: "TabsActiveTabId" })
U(navActiveTab+"/Label", { content: "Overview" })
navTab2=I(navTabBar, { type: "ref", ref: "TabsInactiveTabId" })
U(navTab2+"/Label", { content: "Analytics" })
navTab3=I(navTabBar, { type: "ref", ref: "TabsInactiveTabId" })
U(navTab3+"/Label", { content: "Settings" })
```

**~22 operations** — replace IDs with actuals. May need to split into 2 calls if over 25.

---

### Pattern 4 — Card Layout Pattern

Demonstrates a grid of populated Card refs with domain content. Typical for product listings, feature grids, and portfolios.

```javascript
cardPatternFrame=I(patternsSection, { type: "frame", name: "Card Layout Pattern", layout: "vertical", gap: 16, width: "fill_container" })
cardPatternTitle=I(cardPatternFrame, { type: "text", content: "Card Layout Pattern", fontFamily: "$--font-primary", fontSize: 24, fontWeight: "600", fill: "$--foreground" })
cardPatternDesc=I(cardPatternFrame, { type: "text", content: "Responsive card grid for product listings and features.", fontFamily: "$--font-secondary", fontSize: 14, fill: "$--muted-foreground", width: "fill_container" })

cardGrid=I(cardPatternFrame, { type: "frame", name: "Card Grid", layout: "horizontal", gap: 24, width: "fill_container" })

card1=I(cardGrid, { type: "ref", ref: "CardId", width: "fill_container" })
U(card1+"/Title", { content: "Feature One" })
U(card1+"/Description", { content: "A brief description of the first feature or product." })

card2=I(cardGrid, { type: "ref", ref: "CardId", width: "fill_container" })
U(card2+"/Title", { content: "Feature Two" })
U(card2+"/Description", { content: "A brief description of the second feature or product." })

card3=I(cardGrid, { type: "ref", ref: "CardId", width: "fill_container" })
U(card3+"/Title", { content: "Feature Three" })
U(card3+"/Description", { content: "A brief description of the third feature or product." })
```

**~13 operations** — replace `CardId` with actual component ID.

---

## MCP Composition Recipes

These recipes show how to compose design system components for common UI patterns. Load `get_guidelines("design-system")` for the full MCP composition reference, then use these recipes.

### Spacing Reference

| Context | Gap | Padding |
|---------|-----|---------|
| Screen sections | 24-32 | — |
| Card grid | 16-24 | — |
| Form fields | 16 | — |
| Button groups | 12 | — |
| Inside cards | — | 24 |
| Page content area | — | 32 |

### Card Composition

Use `R()` to replace slot content inside card instances:

```javascript
card=I(parent, { type: "ref", ref: "CardId", width: "fill_container" })
// Replace header slot with metric display
metricHeader=R(card+"/headerSlot", { type: "frame", layout: "vertical", gap: 4, padding: [16, 16, 16, 16] })
metricValue=I(metricHeader, { type: "text", content: "$12,450", fontFamily: "$--font-primary", fontSize: "$--text-3xl", fontWeight: "$--weight-bold", fill: "$--card-foreground" })
metricLabel=I(metricHeader, { type: "text", content: "Monthly Revenue", fontFamily: "$--font-secondary", fontSize: "$--text-sm", fill: "$--muted-foreground" })
// Disable unused slots
U(card+"/footerSlot", { visible: false })
```

### Sidebar Composition

Insert nav items into sidebar slot frames with `descendants` overrides:

```javascript
sidebar=I(screen, { type: "ref", ref: "NavSidebarContainerId", height: "fill_container" })
// Override nav item labels via descendants
activeItem=I(sidebar+"/navSlot", { type: "ref", ref: "NavActiveItemId" })
U(activeItem+"/Label", { content: "Dashboard" })
defaultItem1=I(sidebar+"/navSlot", { type: "ref", ref: "NavDefaultItemId" })
U(defaultItem1+"/Label", { content: "Users" })
defaultItem2=I(sidebar+"/navSlot", { type: "ref", ref: "NavDefaultItemId" })
U(defaultItem2+"/Label", { content: "Settings" })
```

### Table Composition

Row → Cell → Content hierarchy. Cells are frame wrappers:

```javascript
table=I(parent, { type: "ref", ref: "TableWrapperId", width: "fill_container" })
// Add header row
headerRow=I(table+"/bodySlot", { type: "ref", ref: "TableHeaderRowId", width: "fill_container" })
U(headerRow+"/Cell1", { content: "Name" })
U(headerRow+"/Cell2", { content: "Email" })
U(headerRow+"/Cell3", { content: "Status" })
// Add data rows
dataRow1=I(table+"/bodySlot", { type: "ref", ref: "TableDataRowId", width: "fill_container" })
U(dataRow1+"/Cell1", { content: "Alice Johnson" })
U(dataRow1+"/Cell2", { content: "alice@example.com" })
```

### Tab Composition

Active/inactive tab refs inserted into container:

```javascript
tabContainer=I(parent, { type: "ref", ref: "TabsContainerId", width: "fill_container" })
activeTab=I(tabContainer+"/tabSlot", { type: "ref", ref: "TabsActiveTabId" })
U(activeTab+"/Label", { content: "Overview" })
inactiveTab1=I(tabContainer+"/tabSlot", { type: "ref", ref: "TabsInactiveTabId" })
U(inactiveTab1+"/Label", { content: "Analytics" })
inactiveTab2=I(tabContainer+"/tabSlot", { type: "ref", ref: "TabsInactiveTabId" })
U(inactiveTab2+"/Label", { content: "Settings" })
```

### Pagination Composition

Page items inserted into container slot:

```javascript
pagination=I(parent, { type: "ref", ref: "PaginationContainerId" })
prevBtn=I(pagination+"/pageSlot", { type: "ref", ref: "PaginationPrevNextId" })
U(prevBtn+"/Label", { content: "Previous" })
page1=I(pagination+"/pageSlot", { type: "ref", ref: "PaginationActiveItemId" })
U(page1+"/Label", { content: "1" })
page2=I(pagination+"/pageSlot", { type: "ref", ref: "PaginationPageItemId" })
U(page2+"/Label", { content: "2" })
nextBtn=I(pagination+"/pageSlot", { type: "ref", ref: "PaginationPrevNextId" })
U(nextBtn+"/Label", { content: "Next" })
```

### Metric Cards Recipe

Replace card header slot with value + label:

```javascript
metricCard=I(parent, { type: "ref", ref: "CardId", width: "fill_container", height: 120 })
metricContent=R(metricCard+"/headerSlot", { type: "frame", layout: "vertical", gap: 4, padding: [20, 20, 20, 20] })
metricLabel=I(metricContent, { type: "text", content: "Total Users", fontFamily: "$--font-secondary", fontSize: "$--text-sm", fill: "$--muted-foreground" })
metricValue=I(metricContent, { type: "text", content: "2,450", fontFamily: "$--font-primary", fontSize: "$--text-3xl", fontWeight: "$--weight-bold", fill: "$--card-foreground" })
metricBadge=I(metricContent, { type: "ref", ref: "BadgeSuccessId" })
U(metricBadge+"/Label", { content: "+12.5%" })
```

### Page Header Recipe

Breadcrumbs left + action buttons right:

```javascript
pageHeader=I(parent, { type: "frame", layout: "horizontal", width: "fill_container", padding: [16, 24, 16, 24], justifyContent: "space_between", alignItems: "center" })
bcContainer=I(pageHeader, { type: "frame", layout: "horizontal", gap: 4, alignItems: "center" })
bcHome=I(bcContainer, { type: "ref", ref: "BreadcrumbItemId" })
U(bcHome+"/Label", { content: "Home" })
bcSep=I(bcContainer, { type: "ref", ref: "BreadcrumbSeparatorId" })
bcCurrent=I(bcContainer, { type: "ref", ref: "BreadcrumbActiveId" })
U(bcCurrent+"/Label", { content: "Dashboard" })
actionBtns=I(pageHeader, { type: "frame", layout: "horizontal", gap: 8 })
exportBtn=I(actionBtns, { type: "ref", ref: "ButtonOutlineId" })
U(exportBtn+"/Label", { content: "Export" })
createBtn=I(actionBtns, { type: "ref", ref: "ButtonPrimaryId" })
U(createBtn+"/Label", { content: "Create New" })
```

### Form Layout Recipe

Two fields per row, then full-width fields:

```javascript
formContainer=I(parent, { type: "frame", layout: "vertical", gap: 16, width: "fill_container", padding: [24, 24, 24, 24] })
// Two fields side by side
fieldRow=I(formContainer, { type: "frame", layout: "horizontal", gap: 16, width: "fill_container" })
firstNameField=I(fieldRow, { type: "ref", ref: "InputGroupId", width: "fill_container" })
U(firstNameField+"/Label", { content: "First Name" })
lastNameField=I(fieldRow, { type: "ref", ref: "InputGroupId", width: "fill_container" })
U(lastNameField+"/Label", { content: "Last Name" })
// Full-width field
emailField=I(formContainer, { type: "ref", ref: "InputGroupId", width: "fill_container" })
U(emailField+"/Label", { content: "Email" })
// Full-width textarea
messageField=I(formContainer, { type: "ref", ref: "InputTextareaId", width: "fill_container" })
```

---

## Layout Patterns

### Pattern A — Sidebar + Content

Classic dashboard/admin layout with fixed sidebar and scrollable main area.

```
Screen (1440 x 900, horizontal)
├── Sidebar (240px fixed, vertical)
│   ├── Logo/Brand text
│   ├── Nav/SectionTitle ref
│   ├── Nav/ActiveItem ref
│   ├── Nav/DefaultItem refs (3-5)
│   ├── Nav/SectionTitle ref
│   └── Nav/DefaultItem refs (2-3)
└── Main Content (fill, vertical)
    ├── Header bar (64px, horizontal)
    │   ├── Breadcrumb refs
    │   └── Avatar ref (right-aligned)
    ├── Content area (fill, vertical, padding 24-32)
    │   ├── Title section
    │   ├── Metric cards (horizontal row)
    │   └── Data table or content
    └── (optional) Footer
```

**Screen frame setup:**
```javascript
screen=I("document", { type: "frame", name: "Dashboard", width: 1440, height: 900, x: X, y: Y, layout: "horizontal", fill: "$--background", clip: true })
```

**Sidebar:**
```javascript
sidebar=I(screen, { type: "ref", ref: "NavSidebarContainerId", height: "fill_container" })
U(sidebar+"/NavItemId", { content: "Dashboard" })
```

**Main content area:**
```javascript
main=I(screen, { type: "frame", name: "Main", layout: "vertical", width: "fill_container", height: "fill_container" })
header=I(main, { type: "frame", name: "Header", layout: "horizontal", padding: [16, 24, 16, 24], width: "fill_container", height: 64, alignItems: "center", justifyContent: "space_between", stroke: "$--border", strokeSides: ["bottom"], strokeThickness: 1 })
content=I(main, { type: "frame", name: "Content", layout: "vertical", padding: [24, 32, 24, 32], gap: 24, width: "fill_container", height: "fill_container" })
```

---

### Pattern B — Hero + Sections (Landing Page)

Marketing/landing page with full-width hero and stacked sections.

```
Screen (1440 x auto, vertical)
├── Navigation bar (full width, 64px)
│   ├── Logo
│   ├── Nav links (horizontal)
│   └── CTA button
├── Hero section (full width, 500-600px)
│   ├── Headline (H1)
│   ├── Subheadline (Body)
│   ├── CTA buttons (horizontal)
│   └── Hero image
├── Features section (full width)
│   ├── Section title (H2)
│   └── Feature cards (3-column grid)
├── About/Story section
│   ├── Image
│   └── Text content
└── Footer
    ├── Links columns
    └── Copyright
```

**Screen frame setup:**
```javascript
screen=I("document", { type: "frame", name: "Landing Page", width: 1440, height: 2400, x: X, y: Y, layout: "vertical", fill: "$--background", clip: true })
```

**Navigation bar:**
```javascript
nav=I(screen, { type: "frame", name: "Navbar", layout: "horizontal", padding: [0, 80, 0, 80], width: "fill_container", height: 64, alignItems: "center", justifyContent: "space_between" })
logo=I(nav, { type: "text", content: "Brand", fontFamily: "$--font-primary", fontSize: 24, fontWeight: "700", fill: "$--foreground" })
navLinks=I(nav, { type: "frame", layout: "horizontal", gap: 32, alignItems: "center" })
```

**Hero section:**
```javascript
hero=I(screen, { type: "frame", name: "Hero", layout: "vertical", padding: [80, 80, 80, 80], gap: 24, width: "fill_container", height: 560, justifyContent: "center", alignItems: "center" })
headline=I(hero, { type: "text", content: "Domain Headline Here", fontFamily: "$--font-primary", fontSize: 56, fontWeight: "700", fill: "$--foreground", textAlignHorizontal: "center", width: 800 })
subline=I(hero, { type: "text", content: "Supporting description text that explains the value.", fontFamily: "$--font-secondary", fontSize: 20, fill: "$--muted-foreground", textAlignHorizontal: "center", width: 600 })
ctaRow=I(hero, { type: "frame", layout: "horizontal", gap: 12, justifyContent: "center" })
ctaPrimary=I(ctaRow, { type: "ref", ref: "ButtonPrimaryId" })
ctaSecondary=I(ctaRow, { type: "ref", ref: "ButtonOutlineId" })
```

---

### Pattern C — Card Grid

Product listing, menu, or feature showcase in a responsive grid.

```
Section (vertical, padded)
├── Header row (title + optional filter/tabs)
└── Grid container (horizontal, wrap)
    ├── Card ref (fixed width or fill)
    ├── Card ref
    └── ...more cards
```

**Grid implementation:**
```javascript
section=I(parent, { type: "frame", name: "Products", layout: "vertical", padding: [40, 80, 40, 80], gap: 24, width: "fill_container" })
sectionHeader=I(section, { type: "frame", layout: "horizontal", width: "fill_container", justifyContent: "space_between", alignItems: "center" })
sectionTitle=I(sectionHeader, { type: "text", content: "Our Products", fontFamily: "$--font-primary", fontSize: 32, fontWeight: "700", fill: "$--foreground" })
grid=I(section, { type: "frame", name: "Grid", layout: "horizontal", gap: 24, width: "fill_container" })
```

**For each card in the grid:**
```javascript
card1=I(grid, { type: "ref", ref: "CardId", width: 380 })
U(card1+"/Title", { content: "Product Name" })
U(card1+"/Description", { content: "Product description." })
```

---

### Pattern D — Form Layout

Settings, contact, login/signup, checkout forms.

```
Form container (vertical, centered or left-aligned)
├── Form title (H2)
├── Form description (Body)
├── InputGroup refs (stacked vertically, gap 16)
│   ├── InputGroup (Name)
│   ├── InputGroup (Email)
│   └── InputGroup (Message / textarea)
├── (optional) Checkbox/radio group
└── Button row (horizontal)
    ├── Submit button ref
    └── (optional) Cancel button ref
```

**Form implementation:**
```javascript
form=I(parent, { type: "frame", name: "Contact Form", layout: "vertical", gap: 20, width: 480, padding: [32, 32, 32, 32], fill: "$--card", cornerRadius: "$--radius-lg", stroke: "$--border", strokeThickness: 1 })
formTitle=I(form, { type: "text", content: "Get in Touch", fontFamily: "$--font-primary", fontSize: 24, fontWeight: "600", fill: "$--card-foreground" })
nameField=I(form, { type: "ref", ref: "InputGroupId", width: "fill_container" })
U(nameField+"/Label", { content: "Full Name" })
U(nameField+"/Placeholder", { content: "Enter your name" })
emailField=I(form, { type: "ref", ref: "InputGroupId", width: "fill_container" })
U(emailField+"/Label", { content: "Email" })
U(emailField+"/Placeholder", { content: "you@example.com" })
btnRow=I(form, { type: "frame", layout: "horizontal", gap: 8, width: "fill_container", justifyContent: "end" })
submitBtn=I(btnRow, { type: "ref", ref: "ButtonPrimaryId" })
U(submitBtn+"/Label", { content: "Send Message" })
```

---

### Pattern E — Data Table Screen

For dashboards, admin panels, CRM views.

```
Content area (vertical)
├── Header row (title + actions)
│   ├── Title (H2)
│   └── Action buttons (horizontal)
├── Filter/tabs bar
│   ├── Tabs refs
│   └── Search input
├── Table/Wrapper ref
│   ├── Table/HeaderRow ref
│   └── Table/DataRow refs (5-8 rows)
└── Pagination/Container ref
```

**Implementation:**
```javascript
tableSection=I(contentArea, { type: "frame", layout: "vertical", gap: 16, width: "fill_container" })
tableHeader=I(tableSection, { type: "frame", layout: "horizontal", width: "fill_container", justifyContent: "space_between", alignItems: "center" })
tableTitle=I(tableHeader, { type: "text", content: "Users", fontFamily: "$--font-primary", fontSize: 24, fontWeight: "600", fill: "$--foreground" })
addBtn=I(tableHeader, { type: "ref", ref: "ButtonPrimaryId" })
U(addBtn+"/Label", { content: "Add User" })
table=I(tableSection, { type: "ref", ref: "TableWrapperId", width: "fill_container" })
```

---

## Domain Screen Templates

### Screen Placement

Screens are placed to the right of the Patterns section at y: 1200. Starting x position: `1540 + 1440 + 100 = 3080`. Use `find_empty_space_on_canvas({ direction: "right", width: 1440, height: 900, padding: 100 })` to get exact coordinates.

### Bakery Screens

**Screen 1 — Landing Hero**
- Pattern: B (Hero + Sections)
- Hero: Large artisan bread image background, headline "Baked Fresh Every Morning", CTA "View Our Menu"
- Features: 3 cards — "Artisan Breads", "Pastries & Cakes", "Catering"
- Image: `G(heroImg, "stock", "artisan sourdough bread bakery warm lighting")`

**Screen 2 — Menu/Products Grid**
- Pattern: C (Card Grid)
- Tabs for categories: "Breads", "Pastries", "Cakes", "Drinks"
- Cards with product image, name, price, "Add to Order" button
- Image per card: `G(cardImg, "stock", "croissant pastry bakery close up")`

**Screen 3 — Order/Cart**
- Pattern: A variant (cart summary sidebar on right)
- Left: order items with quantity controls
- Right: order summary card with total and "Place Order" button

**Screen 4 — About/Story**
- Pattern: B variant (alternating image-text sections)
- Story of the bakery, team photos, values
- Image: `G(storyImg, "stock", "baker kneading dough artisan bakery")`

**Screen 5 — Contact**
- Pattern: D (Form Layout) + side info
- Contact form with name, email, message
- Side panel with address, hours, map placeholder

### SaaS Dashboard Screens

**Screen 1 — Dashboard**
- Pattern: A (Sidebar + Content)
- Sidebar: nav with Dashboard (active), Users, Analytics, Settings
- Content: 4 metric cards (Revenue, Users, Growth, Churn) + data table
- Metric cards use Card component with large number + badge

**Screen 2 — Settings**
- Pattern: A with Tabs
- Tabs: General, Billing, Team, Notifications
- Form layout under each tab with InputGroup refs

**Screen 3 — Login**
- Pattern: Centered Form
- Card centered on page with logo, email/password inputs, "Sign In" button
- "Forgot password?" and "Create account" links below

**Screen 4 — Pricing**
- Pattern: C (Card Grid, 3-column)
- Three pricing tiers: Free, Pro, Enterprise
- Each card: name, price, feature list, CTA button
- Middle card highlighted with primary fill

### Fitness App Screens

**Screen 1 — Home/Hero**
- Pattern: B (Hero + Sections)
- Bold headline "Transform Your Body", energetic imagery
- Feature cards: "Workouts", "Nutrition", "Community"
- Image: `G(heroImg, "stock", "fitness gym workout person exercising")`

**Screen 2 — Workout Tracker**
- Pattern: A (Sidebar + Content)
- Left: exercise list with checkboxes
- Right: current workout details, timer, progress bars

**Screen 3 — Profile**
- Pattern: Centered with stats
- Avatar, name, stats grid (workouts/week, calories, streak)
- Achievement badges in a horizontal row

**Screen 4 — Schedule**
- Pattern: E (Data Table variant)
- Calendar-like grid showing class times
- Badge refs for class types (Yoga, HIIT, Strength)

### E-commerce Screens

**Screen 1 — Product Listing**
- Pattern: A sidebar (filters) + C (Card Grid)
- Sidebar: category filters, price range, ratings
- Grid: product cards with image, name, price, rating badge

**Screen 2 — Product Detail**
- Pattern: Two-column (image + info)
- Left: large product image
- Right: title, price, description, size selector, "Add to Cart" button

**Screen 3 — Cart**
- Pattern: Two-column (items + summary)
- Left: cart items with quantity and remove
- Right: order summary card with subtotal, shipping, total, checkout button

**Screen 4 — Checkout**
- Pattern: Two-column (form + summary)
- Left: shipping address form, payment method
- Right: order summary, "Place Order" button

---

## Screen Creation Checklist

Before creating each screen, verify:

- [ ] Found empty canvas space via `find_empty_space_on_canvas`
- [ ] Listed all available components via `batch_get({ patterns: [{ reusable: true }] })`
- [ ] Mapped which components are needed for this screen
- [ ] All content text is domain-relevant (not lorem ipsum)
- [ ] All images use domain-appropriate search terms in `G()`

After creating each screen:

- [ ] Called `get_screenshot` and analyzed the result
- [ ] No hardcoded hex colors (all using `$--` tokens)
- [ ] No recreated components (all using `ref` instances)
- [ ] Text fits within containers (no overflow)
- [ ] Layout is balanced and aligned
- [ ] Content reflects the domain accurately
