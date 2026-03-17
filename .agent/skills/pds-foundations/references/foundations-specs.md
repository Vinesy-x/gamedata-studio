# Foundations Specs

Exact `batch_design` operation code for the visual foundation documentation frames. Load this file during Phase 4.

These frames are **documentation, not components** — they do NOT have `reusable: true`. They visually showcase the design system's tokens so anyone opening the `.pen` file sees the token system at a glance.

## Important Notes

- Foundation frames are NOT reusable — they're visual documentation only.
- **Each foundation category is a SEPARATE top-level frame** on the canvas, arranged in a 5-column grid.
- All swatch fills use `$--` variable tokens. Frames use `$--background` for a themed look.
- **Add `stroke: "$--border"` on swatch boxes** so light-colored swatches are visible against light backgrounds.
- Max 25 operations per `batch_design` call — foundations are split across multiple batches.
- After each batch, call `get_screenshot` to verify rendering.

---

## Canvas Grid Layout

Foundation frames are arranged in a **5-column × 2-row grid**:

```
Column width: 380px    Gap: 40px

     Col 0 (x=0)    Col 1 (x=420)    Col 2 (x=840)    Col 3 (x=1260)    Col 4 (x=1680)
Row 0 (y=0):    Colors         Typography       Font Sizes       Font Weights     Spacing
Row 1 (y=550):  Semantic Clrs  Radii            Shadows+Borders  Sizing           Letter Spacing
```

Below the grid (y=1200): Components (x=0, 1440px wide), Patterns (x=1540, 1440px wide).

---

## Pre-requisite: Create Foundation Grid Frames

Create all 10 empty foundation frames in a single batch. This establishes the grid skeleton — subsequent batches populate each frame by referencing its binding name.

```javascript
fColors=I("document", { type: "frame", name: "Foundations / Colors", width: 380, height: "fit_content", x: 0, y: 0, layout: "vertical", padding: [32, 24, 32, 24], gap: 16, fill: "$--background", stroke: "$--border", strokeThickness: 1, cornerRadius: "$--radius-lg" })
fTypo=I("document", { type: "frame", name: "Foundations / Typography", width: 380, height: "fit_content", x: 420, y: 0, layout: "vertical", padding: [32, 24, 32, 24], gap: 16, fill: "$--background", stroke: "$--border", strokeThickness: 1, cornerRadius: "$--radius-lg" })
fFontSizes=I("document", { type: "frame", name: "Foundations / Font Sizes", width: 380, height: "fit_content", x: 840, y: 0, layout: "vertical", padding: [32, 24, 32, 24], gap: 16, fill: "$--background", stroke: "$--border", strokeThickness: 1, cornerRadius: "$--radius-lg" })
fFontWeights=I("document", { type: "frame", name: "Foundations / Font Weights", width: 380, height: "fit_content", x: 1260, y: 0, layout: "vertical", padding: [32, 24, 32, 24], gap: 16, fill: "$--background", stroke: "$--border", strokeThickness: 1, cornerRadius: "$--radius-lg" })
fSpacing=I("document", { type: "frame", name: "Foundations / Spacing", width: 380, height: "fit_content", x: 1680, y: 0, layout: "vertical", padding: [32, 24, 32, 24], gap: 16, fill: "$--background", stroke: "$--border", strokeThickness: 1, cornerRadius: "$--radius-lg" })
fSemantic=I("document", { type: "frame", name: "Foundations / Semantic Colors", width: 380, height: "fit_content", x: 0, y: 550, layout: "vertical", padding: [32, 24, 32, 24], gap: 16, fill: "$--background", stroke: "$--border", strokeThickness: 1, cornerRadius: "$--radius-lg" })
fRadii=I("document", { type: "frame", name: "Foundations / Radii", width: 380, height: "fit_content", x: 420, y: 550, layout: "vertical", padding: [32, 24, 32, 24], gap: 16, fill: "$--background", stroke: "$--border", strokeThickness: 1, cornerRadius: "$--radius-lg" })
fShadows=I("document", { type: "frame", name: "Foundations / Shadows & Borders", width: 380, height: "fit_content", x: 840, y: 550, layout: "vertical", padding: [32, 24, 32, 24], gap: 16, fill: "$--background", stroke: "$--border", strokeThickness: 1, cornerRadius: "$--radius-lg" })
fSizing=I("document", { type: "frame", name: "Foundations / Sizing", width: 380, height: "fit_content", x: 1260, y: 550, layout: "vertical", padding: [32, 24, 32, 24], gap: 16, fill: "$--background", stroke: "$--border", strokeThickness: 1, cornerRadius: "$--radius-lg" })
fLetterSpacing=I("document", { type: "frame", name: "Foundations / Letter Spacing", width: 380, height: "fit_content", x: 1680, y: 550, layout: "vertical", padding: [32, 24, 32, 24], gap: 16, fill: "$--background", stroke: "$--border", strokeThickness: 1, cornerRadius: "$--radius-lg" })
```

**10 operations.** Save the frame IDs from the response — use them as parents in subsequent batches.

---

## Batch A — Colors: Title + Core Row 1 (24 ops)

Populate the Colors frame with a title and the first row of core color swatches.

```javascript
colTitle=I(fColors, { type: "text", content: "Color Palette", fontFamily: "$--font-primary", fontSize: 24, fontWeight: "700", fill: "$--foreground" })
colDesc=I(fColors, { type: "text", content: "Core and semantic color tokens", fontFamily: "$--font-secondary", fontSize: 12, fill: "$--muted-foreground", width: "fill_container" })

coreRow1=I(fColors, { type: "frame", layout: "horizontal", gap: 8, width: "fill_container" })

swBg=I(coreRow1, { type: "frame", layout: "vertical", gap: 4, width: 72 })
swBgBox=I(swBg, { type: "frame", fill: "$--background", stroke: "$--border", strokeThickness: 1, cornerRadius: "$--radius-sm", width: 72, height: 48 })
swBgLabel=I(swBg, { type: "text", content: "background", fontFamily: "$--font-mono", fontSize: 9, fill: "$--muted-foreground" })

swFg=I(coreRow1, { type: "frame", layout: "vertical", gap: 4, width: 72 })
swFgBox=I(swFg, { type: "frame", fill: "$--foreground", cornerRadius: "$--radius-sm", width: 72, height: 48 })
swFgLabel=I(swFg, { type: "text", content: "foreground", fontFamily: "$--font-mono", fontSize: 9, fill: "$--muted-foreground" })

swPri=I(coreRow1, { type: "frame", layout: "vertical", gap: 4, width: 72 })
swPriBox=I(swPri, { type: "frame", fill: "$--primary", cornerRadius: "$--radius-sm", width: 72, height: 48 })
swPriLabel=I(swPri, { type: "text", content: "primary", fontFamily: "$--font-mono", fontSize: 9, fill: "$--muted-foreground" })

swSec=I(coreRow1, { type: "frame", layout: "vertical", gap: 4, width: 72 })
swSecBox=I(swSec, { type: "frame", fill: "$--secondary", cornerRadius: "$--radius-sm", width: 72, height: 48 })
swSecLabel=I(swSec, { type: "text", content: "secondary", fontFamily: "$--font-mono", fontSize: 9, fill: "$--muted-foreground" })

coreRow2=I(fColors, { type: "frame", layout: "horizontal", gap: 8, width: "fill_container" })

swMuted=I(coreRow2, { type: "frame", layout: "vertical", gap: 4, width: 72 })
swMutedBox=I(swMuted, { type: "frame", fill: "$--muted", cornerRadius: "$--radius-sm", width: 72, height: 48 })
swMutedLabel=I(swMuted, { type: "text", content: "muted", fontFamily: "$--font-mono", fontSize: 9, fill: "$--muted-foreground" })

swAccent=I(coreRow2, { type: "frame", layout: "vertical", gap: 4, width: 72 })
swAccentBox=I(swAccent, { type: "frame", fill: "$--accent", cornerRadius: "$--radius-sm", width: 72, height: 48 })
swAccentLabel=I(swAccent, { type: "text", content: "accent", fontFamily: "$--font-mono", fontSize: 9, fill: "$--muted-foreground" })
```

**24 operations** (2 title/desc + 1 row + 4 swatches×3 + 1 row + 2 swatches×3 = 24).

---

## Batch B — Colors: Core Rows 3-4 (24 ops)

Continue with remaining core color swatches.

```javascript
swDest=I(coreRow2, { type: "frame", layout: "vertical", gap: 4, width: 72 })
swDestBox=I(swDest, { type: "frame", fill: "$--destructive", cornerRadius: "$--radius-sm", width: 72, height: 48 })
swDestLabel=I(swDest, { type: "text", content: "destructive", fontFamily: "$--font-mono", fontSize: 9, fill: "$--muted-foreground" })

swBorder=I(coreRow2, { type: "frame", layout: "vertical", gap: 4, width: 72 })
swBorderBox=I(swBorder, { type: "frame", fill: "$--border", cornerRadius: "$--radius-sm", width: 72, height: 48 })
swBorderLabel=I(swBorder, { type: "text", content: "border", fontFamily: "$--font-mono", fontSize: 9, fill: "$--muted-foreground" })

coreRow3=I(fColors, { type: "frame", layout: "horizontal", gap: 8, width: "fill_container" })

swCard=I(coreRow3, { type: "frame", layout: "vertical", gap: 4, width: 72 })
swCardBox=I(swCard, { type: "frame", fill: "$--card", stroke: "$--border", strokeThickness: 1, cornerRadius: "$--radius-sm", width: 72, height: 48 })
swCardLabel=I(swCard, { type: "text", content: "card", fontFamily: "$--font-mono", fontSize: 9, fill: "$--muted-foreground" })

swInput=I(coreRow3, { type: "frame", layout: "vertical", gap: 4, width: 72 })
swInputBox=I(swInput, { type: "frame", fill: "$--input", cornerRadius: "$--radius-sm", width: 72, height: 48 })
swInputLabel=I(swInput, { type: "text", content: "input", fontFamily: "$--font-mono", fontSize: 9, fill: "$--muted-foreground" })

swRing=I(coreRow3, { type: "frame", layout: "vertical", gap: 4, width: 72 })
swRingBox=I(swRing, { type: "frame", fill: "$--ring", cornerRadius: "$--radius-sm", width: 72, height: 48 })
swRingLabel=I(swRing, { type: "text", content: "ring", fontFamily: "$--font-mono", fontSize: 9, fill: "$--muted-foreground" })

swPopover=I(coreRow3, { type: "frame", layout: "vertical", gap: 4, width: 72 })
swPopoverBox=I(swPopover, { type: "frame", fill: "$--popover", stroke: "$--border", strokeThickness: 1, cornerRadius: "$--radius-sm", width: 72, height: 48 })
swPopoverLabel=I(swPopover, { type: "text", content: "popover", fontFamily: "$--font-mono", fontSize: 9, fill: "$--muted-foreground" })
```

**24 operations** (6 swatches remaining from Batch A row2 + new row3 with 4 swatches).

> **Note:** Continue with foreground tokens (primary-fg, secondary-fg, etc.) in the same pattern. Adjust to include all 19 core tokens across 4-5 rows of 4 swatches each.

---

## Batch C — Typography (22 ops)

Populate the Typography frame with heading and body specimens.

```javascript
typoTitle=I(fTypo, { type: "text", content: "Typography Scale", fontFamily: "$--font-primary", fontSize: 24, fontWeight: "700", fill: "$--foreground" })

typoH1=I(fTypo, { type: "text", content: "Display", fontFamily: "$--font-primary", fontSize: "$--text-5xl", fontWeight: "$--weight-bold", fill: "$--foreground", width: "fill_container" })

typoH2=I(fTypo, { type: "frame", layout: "vertical", gap: 2, width: "fill_container" })
typoH2Sample=I(typoH2, { type: "text", content: "Heading 1", fontFamily: "$--font-primary", fontSize: "$--text-4xl", fontWeight: "$--weight-bold", fill: "$--foreground", width: "fill_container" })

typoH3=I(fTypo, { type: "frame", layout: "vertical", gap: 2, width: "fill_container" })
typoH3Sample=I(typoH3, { type: "text", content: "Heading 2", fontFamily: "$--font-primary", fontSize: "$--text-3xl", fontWeight: "$--weight-semibold", fill: "$--foreground", width: "fill_container" })

typoH4=I(fTypo, { type: "frame", layout: "vertical", gap: 2, width: "fill_container" })
typoH4Sample=I(typoH4, { type: "text", content: "Heading 3", fontFamily: "$--font-primary", fontSize: "$--text-2xl", fontWeight: "$--weight-semibold", fill: "$--foreground", width: "fill_container" })

typoBody=I(fTypo, { type: "frame", layout: "vertical", gap: 2, width: "fill_container" })
typoBodySample=I(typoBody, { type: "text", content: "Body — The quick brown fox jumps over the lazy dog.", fontFamily: "$--font-secondary", fontSize: "$--text-base", fontWeight: "$--weight-regular", fill: "$--foreground", width: "fill_container", lineHeight: 1.6 })

typoCaption=I(fTypo, { type: "frame", layout: "vertical", gap: 2, width: "fill_container" })
typoCaptionSample=I(typoCaption, { type: "text", content: "Caption — Secondary information and metadata.", fontFamily: "$--font-secondary", fontSize: "$--text-xs", fill: "$--muted-foreground", width: "fill_container" })

typoMono=I(fTypo, { type: "frame", layout: "vertical", gap: 2, width: "fill_container" })
typoMonoSample=I(typoMono, { type: "text", content: "12,847", fontFamily: "$--font-mono", fontSize: "$--text-2xl", fontWeight: "$--weight-semibold", fill: "$--foreground" })
typoMonoLabel=I(typoMono, { type: "text", content: "Monospace / Numbers", fontFamily: "$--font-mono", fontSize: 10, fill: "$--muted-foreground" })
```

**17 operations.** Within the 25-op limit.

---

## Batch D — Font Sizes (22 ops)

Populate the Font Sizes frame with 9 samples rendered at actual sizes.

```javascript
fsTitle=I(fFontSizes, { type: "text", content: "Font Sizes", fontFamily: "$--font-primary", fontSize: 24, fontWeight: "700", fill: "$--foreground" })

fs5xl=I(fFontSizes, { type: "frame", layout: "vertical", gap: 2, width: "fill_container" })
fs5xlText=I(fs5xl, { type: "text", content: "text-5xl", fontFamily: "$--font-primary", fontSize: "$--text-5xl", fontWeight: "$--weight-bold", fill: "$--foreground", width: "fill_container" })
fs5xlLabel=I(fs5xl, { type: "text", content: "48px", fontFamily: "$--font-mono", fontSize: 9, fill: "$--muted-foreground" })

fs4xl=I(fFontSizes, { type: "frame", layout: "vertical", gap: 2, width: "fill_container" })
fs4xlText=I(fs4xl, { type: "text", content: "text-4xl", fontFamily: "$--font-primary", fontSize: "$--text-4xl", fontWeight: "$--weight-bold", fill: "$--foreground", width: "fill_container" })
fs4xlLabel=I(fs4xl, { type: "text", content: "36px", fontFamily: "$--font-mono", fontSize: 9, fill: "$--muted-foreground" })

fs3xl=I(fFontSizes, { type: "frame", layout: "vertical", gap: 2, width: "fill_container" })
fs3xlText=I(fs3xl, { type: "text", content: "text-3xl", fontFamily: "$--font-primary", fontSize: "$--text-3xl", fill: "$--foreground", width: "fill_container" })
fs3xlLabel=I(fs3xl, { type: "text", content: "30px", fontFamily: "$--font-mono", fontSize: 9, fill: "$--muted-foreground" })

fs2xl=I(fFontSizes, { type: "frame", layout: "vertical", gap: 2, width: "fill_container" })
fs2xlText=I(fs2xl, { type: "text", content: "text-2xl", fontFamily: "$--font-primary", fontSize: "$--text-2xl", fill: "$--foreground", width: "fill_container" })
fs2xlLabel=I(fs2xl, { type: "text", content: "24px", fontFamily: "$--font-mono", fontSize: 9, fill: "$--muted-foreground" })

fsXl=I(fFontSizes, { type: "frame", layout: "vertical", gap: 2, width: "fill_container" })
fsXlText=I(fsXl, { type: "text", content: "text-xl", fontFamily: "$--font-secondary", fontSize: "$--text-xl", fill: "$--foreground", width: "fill_container" })
fsXlLabel=I(fsXl, { type: "text", content: "20px", fontFamily: "$--font-mono", fontSize: 9, fill: "$--muted-foreground" })

fsLg=I(fFontSizes, { type: "frame", layout: "vertical", gap: 2, width: "fill_container" })
fsLgText=I(fsLg, { type: "text", content: "text-lg", fontFamily: "$--font-secondary", fontSize: "$--text-lg", fill: "$--foreground", width: "fill_container" })
fsLgLabel=I(fsLg, { type: "text", content: "18px", fontFamily: "$--font-mono", fontSize: 9, fill: "$--muted-foreground" })
```

**22 operations** (1 title + 7 sizes × 3 = 22). Continue with remaining 2 sizes (text-base, text-sm, text-xs) in Batch E.

---

## Batch E — Font Sizes Remaining + Font Weights (25 ops)

```javascript
fsBase=I(fFontSizes, { type: "frame", layout: "vertical", gap: 2, width: "fill_container" })
fsBaseText=I(fsBase, { type: "text", content: "text-base — Default body size", fontFamily: "$--font-secondary", fontSize: "$--text-base", fill: "$--foreground", width: "fill_container" })
fsBaseLabel=I(fsBase, { type: "text", content: "16px", fontFamily: "$--font-mono", fontSize: 9, fill: "$--muted-foreground" })

fsSm=I(fFontSizes, { type: "frame", layout: "vertical", gap: 2, width: "fill_container" })
fsSmText=I(fsSm, { type: "text", content: "text-sm — Secondary text", fontFamily: "$--font-secondary", fontSize: "$--text-sm", fill: "$--foreground", width: "fill_container" })
fsSmLabel=I(fsSm, { type: "text", content: "14px", fontFamily: "$--font-mono", fontSize: 9, fill: "$--muted-foreground" })

fsXs=I(fFontSizes, { type: "frame", layout: "vertical", gap: 2, width: "fill_container" })
fsXsText=I(fsXs, { type: "text", content: "text-xs — Captions and metadata", fontFamily: "$--font-secondary", fontSize: "$--text-xs", fill: "$--muted-foreground", width: "fill_container" })
fsXsLabel=I(fsXs, { type: "text", content: "12px", fontFamily: "$--font-mono", fontSize: 9, fill: "$--muted-foreground" })

fwTitle=I(fFontWeights, { type: "text", content: "Font Weights", fontFamily: "$--font-primary", fontSize: 24, fontWeight: "700", fill: "$--foreground" })

fwThin=I(fFontWeights, { type: "frame", layout: "horizontal", gap: 12, alignItems: "baseline", width: "fill_container" })
fwThinText=I(fwThin, { type: "text", content: "Thin — Default heading font", fontFamily: "$--font-primary", fontSize: "$--text-lg", fontWeight: "$--weight-thin", fill: "$--foreground" })
fwThinLabel=I(fwThin, { type: "text", content: "200", fontFamily: "$--font-mono", fontSize: 9, fill: "$--muted-foreground" })

fwLight=I(fFontWeights, { type: "frame", layout: "horizontal", gap: 12, alignItems: "baseline", width: "fill_container" })
fwLightText=I(fwLight, { type: "text", content: "Light — Subtle emphasis", fontFamily: "$--font-primary", fontSize: "$--text-lg", fontWeight: "$--weight-light", fill: "$--foreground" })
fwLightLabel=I(fwLight, { type: "text", content: "300", fontFamily: "$--font-mono", fontSize: 9, fill: "$--muted-foreground" })

fwRegular=I(fFontWeights, { type: "frame", layout: "horizontal", gap: 12, alignItems: "baseline", width: "fill_container" })
fwRegText=I(fwRegular, { type: "text", content: "Regular — Body text default", fontFamily: "$--font-secondary", fontSize: "$--text-lg", fontWeight: "$--weight-regular", fill: "$--foreground" })
fwRegLabel=I(fwRegular, { type: "text", content: "400", fontFamily: "$--font-mono", fontSize: 9, fill: "$--muted-foreground" })
```

**25 operations** (3 font sizes × 3 + 1 weight title + 3 weights × 3 + 7 = 25).

---

## Batch F — Font Weights Remaining + Spacing Start (24 ops)

```javascript
fwMedium=I(fFontWeights, { type: "frame", layout: "horizontal", gap: 12, alignItems: "baseline", width: "fill_container" })
fwMedText=I(fwMedium, { type: "text", content: "Medium — Labels and UI", fontFamily: "$--font-secondary", fontSize: "$--text-lg", fontWeight: "$--weight-medium", fill: "$--foreground" })
fwMedLabel=I(fwMedium, { type: "text", content: "500", fontFamily: "$--font-mono", fontSize: 9, fill: "$--muted-foreground" })

fwSemibold=I(fFontWeights, { type: "frame", layout: "horizontal", gap: 12, alignItems: "baseline", width: "fill_container" })
fwSbText=I(fwSemibold, { type: "text", content: "Semibold — Subheadings", fontFamily: "$--font-primary", fontSize: "$--text-lg", fontWeight: "$--weight-semibold", fill: "$--foreground" })
fwSbLabel=I(fwSemibold, { type: "text", content: "600", fontFamily: "$--font-mono", fontSize: 9, fill: "$--muted-foreground" })

fwBold=I(fFontWeights, { type: "frame", layout: "horizontal", gap: 12, alignItems: "baseline", width: "fill_container" })
fwBoldText=I(fwBold, { type: "text", content: "Bold — Headings and CTAs", fontFamily: "$--font-primary", fontSize: "$--text-lg", fontWeight: "$--weight-bold", fill: "$--foreground" })
fwBoldLabel=I(fwBold, { type: "text", content: "700", fontFamily: "$--font-mono", fontSize: 9, fill: "$--muted-foreground" })

spTitle=I(fSpacing, { type: "text", content: "Spacing Scale", fontFamily: "$--font-primary", fontSize: 24, fontWeight: "700", fill: "$--foreground" })
spRow1=I(fSpacing, { type: "frame", layout: "horizontal", gap: 8, width: "fill_container", alignItems: "flex_end" })

sp4=I(spRow1, { type: "frame", layout: "vertical", gap: 4, alignItems: "center" })
sp4Box=I(sp4, { type: "frame", fill: "$--primary", width: 8, height: 4, cornerRadius: "$--radius-sm" })
sp4Label=I(sp4, { type: "text", content: "4", fontFamily: "$--font-mono", fontSize: 9, fill: "$--muted-foreground", textAlignHorizontal: "center" })

sp8=I(spRow1, { type: "frame", layout: "vertical", gap: 4, alignItems: "center" })
sp8Box=I(sp8, { type: "frame", fill: "$--primary", width: 12, height: 8, cornerRadius: "$--radius-sm" })
sp8Label=I(sp8, { type: "text", content: "8", fontFamily: "$--font-mono", fontSize: 9, fill: "$--muted-foreground", textAlignHorizontal: "center" })

sp12=I(spRow1, { type: "frame", layout: "vertical", gap: 4, alignItems: "center" })
sp12Box=I(sp12, { type: "frame", fill: "$--primary", width: 16, height: 12, cornerRadius: "$--radius-sm" })
sp12Label=I(sp12, { type: "text", content: "12", fontFamily: "$--font-mono", fontSize: 9, fill: "$--muted-foreground", textAlignHorizontal: "center" })

sp16=I(spRow1, { type: "frame", layout: "vertical", gap: 4, alignItems: "center" })
sp16Box=I(sp16, { type: "frame", fill: "$--primary", width: 20, height: 16, cornerRadius: "$--radius-sm" })
sp16Label=I(sp16, { type: "text", content: "16", fontFamily: "$--font-mono", fontSize: 9, fill: "$--muted-foreground", textAlignHorizontal: "center" })
```

**24 operations** (3 weights × 3 + 2 spacing header + 4 blocks × 3 + 3 = 24).

---

## Batch G — Spacing Remaining (24 ops)

Continue the spacing scale with remaining values.

```javascript
sp20=I(spRow1, { type: "frame", layout: "vertical", gap: 4, alignItems: "center" })
sp20Box=I(sp20, { type: "frame", fill: "$--primary", width: 24, height: 20, cornerRadius: "$--radius-sm" })
sp20Label=I(sp20, { type: "text", content: "20", fontFamily: "$--font-mono", fontSize: 9, fill: "$--muted-foreground", textAlignHorizontal: "center" })

sp24=I(spRow1, { type: "frame", layout: "vertical", gap: 4, alignItems: "center" })
sp24Box=I(sp24, { type: "frame", fill: "$--primary", width: 28, height: 24, cornerRadius: "$--radius-sm" })
sp24Label=I(sp24, { type: "text", content: "24", fontFamily: "$--font-mono", fontSize: 9, fill: "$--muted-foreground", textAlignHorizontal: "center" })

spRow2=I(fSpacing, { type: "frame", layout: "horizontal", gap: 8, width: "fill_container", alignItems: "flex_end" })

sp32=I(spRow2, { type: "frame", layout: "vertical", gap: 4, alignItems: "center" })
sp32Box=I(sp32, { type: "frame", fill: "$--primary", width: 36, height: 32, cornerRadius: "$--radius-sm" })
sp32Label=I(sp32, { type: "text", content: "32", fontFamily: "$--font-mono", fontSize: 9, fill: "$--muted-foreground", textAlignHorizontal: "center" })

sp40=I(spRow2, { type: "frame", layout: "vertical", gap: 4, alignItems: "center" })
sp40Box=I(sp40, { type: "frame", fill: "$--primary", width: 44, height: 40, cornerRadius: "$--radius-sm" })
sp40Label=I(sp40, { type: "text", content: "40", fontFamily: "$--font-mono", fontSize: 9, fill: "$--muted-foreground", textAlignHorizontal: "center" })

sp48=I(spRow2, { type: "frame", layout: "vertical", gap: 4, alignItems: "center" })
sp48Box=I(sp48, { type: "frame", fill: "$--primary", width: 52, height: 48, cornerRadius: "$--radius-sm" })
sp48Label=I(sp48, { type: "text", content: "48", fontFamily: "$--font-mono", fontSize: 9, fill: "$--muted-foreground", textAlignHorizontal: "center" })

sp64=I(spRow2, { type: "frame", layout: "vertical", gap: 4, alignItems: "center" })
sp64Box=I(sp64, { type: "frame", fill: "$--primary", width: 60, height: 60, cornerRadius: "$--radius-sm" })
sp64Label=I(sp64, { type: "text", content: "64", fontFamily: "$--font-mono", fontSize: 9, fill: "$--muted-foreground", textAlignHorizontal: "center" })

sp80=I(spRow2, { type: "frame", layout: "vertical", gap: 4, alignItems: "center" })
sp80Box=I(sp80, { type: "frame", fill: "$--primary", width: 68, height: 68, cornerRadius: "$--radius-sm" })
sp80Label=I(sp80, { type: "text", content: "80", fontFamily: "$--font-mono", fontSize: 9, fill: "$--muted-foreground", textAlignHorizontal: "center" })
```

**24 operations** (2 remaining row1 × 3 + 1 row2 + 5 blocks × 3 + 6 = 24).

> Continue the final spacing value (96) in the next batch if needed.

---

## Batch H — Semantic Colors (24 ops)

Populate the Semantic Colors frame with 4 status color cards.

```javascript
semTitle=I(fSemantic, { type: "text", content: "Semantic Colors", fontFamily: "$--font-primary", fontSize: 24, fontWeight: "700", fill: "$--foreground" })
semDesc=I(fSemantic, { type: "text", content: "Status colors derived from the primary palette.", fontFamily: "$--font-secondary", fontSize: 12, fill: "$--muted-foreground", width: "fill_container" })

semRow=I(fSemantic, { type: "frame", layout: "horizontal", gap: 8, width: "fill_container" })

semSuccess=I(semRow, { type: "frame", layout: "vertical", gap: 0, cornerRadius: "$--radius-md", width: "fill_container", overflow: "hidden" })
semSuccessBox=I(semSuccess, { type: "frame", fill: "$--color-success", width: "fill_container", height: 48 })
semSuccessInfo=I(semSuccess, { type: "frame", fill: "$--card", padding: [6, 8, 6, 8], width: "fill_container", layout: "vertical", gap: 2 })
semSuccessName=I(semSuccessInfo, { type: "text", content: "Success", fontFamily: "$--font-secondary", fontSize: 11, fontWeight: "600", fill: "$--foreground" })
semSuccessToken=I(semSuccessInfo, { type: "text", content: "--color-success", fontFamily: "$--font-mono", fontSize: 8, fill: "$--muted-foreground" })

semWarning=I(semRow, { type: "frame", layout: "vertical", gap: 0, cornerRadius: "$--radius-md", width: "fill_container", overflow: "hidden" })
semWarningBox=I(semWarning, { type: "frame", fill: "$--color-warning", width: "fill_container", height: 48 })
semWarningInfo=I(semWarning, { type: "frame", fill: "$--card", padding: [6, 8, 6, 8], width: "fill_container", layout: "vertical", gap: 2 })
semWarningName=I(semWarningInfo, { type: "text", content: "Warning", fontFamily: "$--font-secondary", fontSize: 11, fontWeight: "600", fill: "$--foreground" })
semWarningToken=I(semWarningInfo, { type: "text", content: "--color-warning", fontFamily: "$--font-mono", fontSize: 8, fill: "$--muted-foreground" })

semError=I(semRow, { type: "frame", layout: "vertical", gap: 0, cornerRadius: "$--radius-md", width: "fill_container", overflow: "hidden" })
semErrorBox=I(semError, { type: "frame", fill: "$--color-error", width: "fill_container", height: 48 })
semErrorInfo=I(semError, { type: "frame", fill: "$--card", padding: [6, 8, 6, 8], width: "fill_container", layout: "vertical", gap: 2 })
semErrorName=I(semErrorInfo, { type: "text", content: "Error", fontFamily: "$--font-secondary", fontSize: 11, fontWeight: "600", fill: "$--foreground" })
semErrorToken=I(semErrorInfo, { type: "text", content: "--color-error", fontFamily: "$--font-mono", fontSize: 8, fill: "$--muted-foreground" })

semInfo=I(semRow, { type: "frame", layout: "vertical", gap: 0, cornerRadius: "$--radius-md", width: "fill_container", overflow: "hidden" })
semInfoBox=I(semInfo, { type: "frame", fill: "$--color-info", width: "fill_container", height: 48 })
semInfoInfo=I(semInfo, { type: "frame", fill: "$--card", padding: [6, 8, 6, 8], width: "fill_container", layout: "vertical", gap: 2 })
semInfoName=I(semInfoInfo, { type: "text", content: "Info", fontFamily: "$--font-secondary", fontSize: 11, fontWeight: "600", fill: "$--foreground" })
semInfoToken=I(semInfoInfo, { type: "text", content: "--color-info", fontFamily: "$--font-mono", fontSize: 8, fill: "$--muted-foreground" })
```

**24 operations** (3 header + 1 row + 4 cards × 5 = 24).

---

## Batch I — Radii (20 ops)

Populate the Radii frame with 6 border radius shapes.

```javascript
radTitle=I(fRadii, { type: "text", content: "Border Radius", fontFamily: "$--font-primary", fontSize: 24, fontWeight: "700", fill: "$--foreground" })
radRow=I(fRadii, { type: "frame", layout: "horizontal", gap: 8, width: "fill_container" })

radNone=I(radRow, { type: "frame", layout: "vertical", gap: 4, alignItems: "center" })
radNoneBox=I(radNone, { type: "frame", fill: "$--primary", cornerRadius: "$--radius-none", width: 48, height: 48 })
radNoneLabel=I(radNone, { type: "text", content: "none", fontFamily: "$--font-mono", fontSize: 9, fill: "$--muted-foreground" })

radSm=I(radRow, { type: "frame", layout: "vertical", gap: 4, alignItems: "center" })
radSmBox=I(radSm, { type: "frame", fill: "$--primary", cornerRadius: "$--radius-sm", width: 48, height: 48 })
radSmLabel=I(radSm, { type: "text", content: "sm", fontFamily: "$--font-mono", fontSize: 9, fill: "$--muted-foreground" })

radMd=I(radRow, { type: "frame", layout: "vertical", gap: 4, alignItems: "center" })
radMdBox=I(radMd, { type: "frame", fill: "$--primary", cornerRadius: "$--radius-md", width: 48, height: 48 })
radMdLabel=I(radMd, { type: "text", content: "md", fontFamily: "$--font-mono", fontSize: 9, fill: "$--muted-foreground" })

radLg=I(radRow, { type: "frame", layout: "vertical", gap: 4, alignItems: "center" })
radLgBox=I(radLg, { type: "frame", fill: "$--primary", cornerRadius: "$--radius-lg", width: 48, height: 48 })
radLgLabel=I(radLg, { type: "text", content: "lg", fontFamily: "$--font-mono", fontSize: 9, fill: "$--muted-foreground" })

radXl=I(radRow, { type: "frame", layout: "vertical", gap: 4, alignItems: "center" })
radXlBox=I(radXl, { type: "frame", fill: "$--primary", cornerRadius: "$--radius-xl", width: 48, height: 48 })
radXlLabel=I(radXl, { type: "text", content: "xl", fontFamily: "$--font-mono", fontSize: 9, fill: "$--muted-foreground" })

radPill=I(radRow, { type: "frame", layout: "vertical", gap: 4, alignItems: "center" })
radPillBox=I(radPill, { type: "frame", fill: "$--primary", cornerRadius: "$--radius-pill", width: 48, height: 48 })
radPillLabel=I(radPill, { type: "text", content: "pill", fontFamily: "$--font-mono", fontSize: 9, fill: "$--muted-foreground" })
```

**20 operations** (2 header + 6 shapes × 3 = 20).

---

## Batch J — Shadows & Borders (24 ops)

Populate the Shadows & Borders frame with shadow examples and border width examples.

```javascript
shTitle=I(fShadows, { type: "text", content: "Shadows & Borders", fontFamily: "$--font-primary", fontSize: 24, fontWeight: "700", fill: "$--foreground" })

shLabel=I(fShadows, { type: "text", content: "Elevation", fontFamily: "$--font-secondary", fontSize: 14, fontWeight: "600", fill: "$--foreground" })
shRow=I(fShadows, { type: "frame", layout: "horizontal", gap: 8, width: "fill_container" })

shSm=I(shRow, { type: "frame", layout: "vertical", fill: "$--card", cornerRadius: "$--radius-md", width: 72, height: 56, padding: 8, effect: { type: "shadow", shadowType: "outer", color: "#0000000D", blur: 2, offset: { x: 0, y: 1 } }, justifyContent: "center", alignItems: "center" })
shSmLabel=I(shSm, { type: "text", content: "sm", fontFamily: "$--font-mono", fontSize: 9, fill: "$--muted-foreground", textAlignHorizontal: "center" })

shMd=I(shRow, { type: "frame", layout: "vertical", fill: "$--card", cornerRadius: "$--radius-md", width: 72, height: 56, padding: 8, effect: { type: "shadow", shadowType: "outer", color: "#00000012", blur: 6, offset: { x: 0, y: 4 } }, justifyContent: "center", alignItems: "center" })
shMdLabel=I(shMd, { type: "text", content: "md", fontFamily: "$--font-mono", fontSize: 9, fill: "$--muted-foreground", textAlignHorizontal: "center" })

shLg=I(shRow, { type: "frame", layout: "vertical", fill: "$--card", cornerRadius: "$--radius-md", width: 72, height: 56, padding: 8, effect: { type: "shadow", shadowType: "outer", color: "#0000001A", blur: 15, offset: { x: 0, y: 10 } }, justifyContent: "center", alignItems: "center" })
shLgLabel=I(shLg, { type: "text", content: "lg", fontFamily: "$--font-mono", fontSize: 9, fill: "$--muted-foreground", textAlignHorizontal: "center" })

shXl=I(shRow, { type: "frame", layout: "vertical", fill: "$--card", cornerRadius: "$--radius-md", width: 72, height: 56, padding: 8, effect: { type: "shadow", shadowType: "outer", color: "#00000026", blur: 25, offset: { x: 0, y: 20 } }, justifyContent: "center", alignItems: "center" })
shXlLabel=I(shXl, { type: "text", content: "xl", fontFamily: "$--font-mono", fontSize: 9, fill: "$--muted-foreground", textAlignHorizontal: "center" })

bwLabel=I(fShadows, { type: "text", content: "Border Widths", fontFamily: "$--font-secondary", fontSize: 14, fontWeight: "600", fill: "$--foreground" })
bwRow=I(fShadows, { type: "frame", layout: "horizontal", gap: 8, width: "fill_container" })

bwThin=I(bwRow, { type: "frame", layout: "vertical", gap: 4, alignItems: "center" })
bwThinBox=I(bwThin, { type: "frame", fill: "$--card", stroke: "$--border", strokeThickness: "$--border-thin", cornerRadius: "$--radius-md", width: 80, height: 48 })
bwThinLabel=I(bwThin, { type: "text", content: "thin (1px)", fontFamily: "$--font-mono", fontSize: 9, fill: "$--muted-foreground" })

bwDefault=I(bwRow, { type: "frame", layout: "vertical", gap: 4, alignItems: "center" })
bwDefaultBox=I(bwDefault, { type: "frame", fill: "$--card", stroke: "$--border", strokeThickness: "$--border-default", cornerRadius: "$--radius-md", width: 80, height: 48 })
bwDefaultLabel=I(bwDefault, { type: "text", content: "default (1.5)", fontFamily: "$--font-mono", fontSize: 9, fill: "$--muted-foreground" })

bwThick=I(bwRow, { type: "frame", layout: "vertical", gap: 4, alignItems: "center" })
bwThickBox=I(bwThick, { type: "frame", fill: "$--card", stroke: "$--border", strokeThickness: "$--border-thick", cornerRadius: "$--radius-md", width: 80, height: 48 })
bwThickLabel=I(bwThick, { type: "text", content: "thick (2px)", fontFamily: "$--font-mono", fontSize: 9, fill: "$--muted-foreground" })
```

**24 operations** (1 title + 2 shadow header/row + 4 shadow cards × 2 + 2 border header/row + 3 borders × 3 = 24).

---

## Batch K — Sizing (22 ops)

Populate the Sizing frame with icon sizes, avatar sizes, and component sizes.

```javascript
szTitle=I(fSizing, { type: "text", content: "Sizing", fontFamily: "$--font-primary", fontSize: 24, fontWeight: "700", fill: "$--foreground" })

szIconLabel=I(fSizing, { type: "text", content: "Icons", fontFamily: "$--font-secondary", fontSize: 14, fontWeight: "600", fill: "$--foreground" })
szIconRow=I(fSizing, { type: "frame", layout: "horizontal", gap: 12, alignItems: "flex_end", width: "fill_container" })

szIconSm=I(szIconRow, { type: "frame", layout: "vertical", gap: 4, alignItems: "center" })
szIconSmBox=I(szIconSm, { type: "frame", fill: "$--primary", cornerRadius: "$--radius-sm", width: 16, height: 16 })
szIconSmLabel=I(szIconSm, { type: "text", content: "16", fontFamily: "$--font-mono", fontSize: 9, fill: "$--muted-foreground" })

szIconMd=I(szIconRow, { type: "frame", layout: "vertical", gap: 4, alignItems: "center" })
szIconMdBox=I(szIconMd, { type: "frame", fill: "$--primary", cornerRadius: "$--radius-sm", width: 20, height: 20 })
szIconMdLabel=I(szIconMd, { type: "text", content: "20", fontFamily: "$--font-mono", fontSize: 9, fill: "$--muted-foreground" })

szIconLg=I(szIconRow, { type: "frame", layout: "vertical", gap: 4, alignItems: "center" })
szIconLgBox=I(szIconLg, { type: "frame", fill: "$--primary", cornerRadius: "$--radius-sm", width: 24, height: 24 })
szIconLgLabel=I(szIconLg, { type: "text", content: "24", fontFamily: "$--font-mono", fontSize: 9, fill: "$--muted-foreground" })

szAvatarLabel=I(fSizing, { type: "text", content: "Avatars", fontFamily: "$--font-secondary", fontSize: 14, fontWeight: "600", fill: "$--foreground" })
szAvatarRow=I(fSizing, { type: "frame", layout: "horizontal", gap: 12, alignItems: "flex_end", width: "fill_container" })

szAvSm=I(szAvatarRow, { type: "frame", layout: "vertical", gap: 4, alignItems: "center" })
szAvSmBox=I(szAvSm, { type: "frame", fill: "$--muted", cornerRadius: "$--radius-pill", width: 32, height: 32 })
szAvSmLabel=I(szAvSm, { type: "text", content: "32", fontFamily: "$--font-mono", fontSize: 9, fill: "$--muted-foreground" })

szAvMd=I(szAvatarRow, { type: "frame", layout: "vertical", gap: 4, alignItems: "center" })
szAvMdBox=I(szAvMd, { type: "frame", fill: "$--muted", cornerRadius: "$--radius-pill", width: 40, height: 40 })
szAvMdLabel=I(szAvMd, { type: "text", content: "40", fontFamily: "$--font-mono", fontSize: 9, fill: "$--muted-foreground" })

szAvLg=I(szAvatarRow, { type: "frame", layout: "vertical", gap: 4, alignItems: "center" })
szAvLgBox=I(szAvLg, { type: "frame", fill: "$--muted", cornerRadius: "$--radius-pill", width: 56, height: 56 })
szAvLgLabel=I(szAvLg, { type: "text", content: "56", fontFamily: "$--font-mono", fontSize: 9, fill: "$--muted-foreground" })
```

**22 operations** (1 title + 2 icon header + 3 icons × 3 + 2 avatar header + 3 avatars × 3 = 22).

---

## Batch L — Letter Spacing (14 ops)

Populate the Letter Spacing frame with 4 tracking samples.

```javascript
lsTitle=I(fLetterSpacing, { type: "text", content: "Letter Spacing", fontFamily: "$--font-primary", fontSize: 24, fontWeight: "700", fill: "$--foreground" })

lsTight=I(fLetterSpacing, { type: "frame", layout: "vertical", gap: 4, width: "fill_container" })
lsTightText=I(lsTight, { type: "text", content: "DESIGN SYSTEM", fontFamily: "$--font-primary", fontSize: "$--text-xl", fontWeight: "$--weight-bold", letterSpacing: "$--tracking-tight", fill: "$--foreground" })
lsTightLabel=I(lsTight, { type: "text", content: "tight (-0.5px)", fontFamily: "$--font-mono", fontSize: 9, fill: "$--muted-foreground" })

lsCond=I(fLetterSpacing, { type: "frame", layout: "vertical", gap: 4, width: "fill_container" })
lsCondText=I(lsCond, { type: "text", content: "DESIGN SYSTEM", fontFamily: "$--font-primary", fontSize: "$--text-xl", fontWeight: "$--weight-semibold", letterSpacing: "$--tracking-condensed", fill: "$--foreground" })
lsCondLabel=I(lsCond, { type: "text", content: "condensed (-0.25px)", fontFamily: "$--font-mono", fontSize: 9, fill: "$--muted-foreground" })

lsNormal=I(fLetterSpacing, { type: "frame", layout: "vertical", gap: 4, width: "fill_container" })
lsNormText=I(lsNormal, { type: "text", content: "Design System Tokens", fontFamily: "$--font-secondary", fontSize: "$--text-base", letterSpacing: "$--tracking-normal", fill: "$--foreground" })
lsNormLabel=I(lsNormal, { type: "text", content: "normal (0px)", fontFamily: "$--font-mono", fontSize: 9, fill: "$--muted-foreground" })

lsWide=I(fLetterSpacing, { type: "frame", layout: "vertical", gap: 4, width: "fill_container" })
lsWideText=I(lsWide, { type: "text", content: "DESIGN SYSTEM", fontFamily: "$--font-secondary", fontSize: "$--text-sm", fontWeight: "$--weight-medium", letterSpacing: "$--tracking-wide", fill: "$--foreground" })
lsWideLabel=I(lsWide, { type: "text", content: "wide (1.5px)", fontFamily: "$--font-mono", fontSize: 9, fill: "$--muted-foreground" })
```

**13 operations** (1 title + 4 samples × 3 = 13).

---

## Summary

| Batch | Target Frame | Content | Operations |
|-------|-------------|---------|------------|
| Pre | All 10 frames | Grid skeleton | 10 |
| A | Colors | Title + 6 core swatches (rows 1-2) | 24 |
| B | Colors | 6 more core swatches (rows 3-4) | 24 |
| C | Typography | Title + 7 specimens | 17 |
| D | Font Sizes | Title + 7 size samples | 22 |
| E | Font Sizes + Font Weights | 2 remaining sizes + title + 3 weights | 25 |
| F | Font Weights + Spacing | 3 remaining weights + title + 4 spacing blocks | 24 |
| G | Spacing | 7 more spacing blocks | 24 |
| H | Semantic Colors | Title + 4 status cards | 24 |
| I | Radii | Title + 6 radius shapes | 20 |
| J | Shadows & Borders | Elevation (4) + border widths (3) | 24 |
| K | Sizing | Icons (3) + Avatars (3) | 22 |
| L | Letter Spacing | Title + 4 tracking samples | 13 |
| **Total** | **10 frames** | **Full foundation documentation** | **~273** |

All batches are within the 25-operation limit. Call `get_screenshot({ filePath, nodeId: frameId })` after each batch to verify rendering.
