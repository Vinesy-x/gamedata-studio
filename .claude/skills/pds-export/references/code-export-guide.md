# Code Export Guide — Tailwind CSS

Convert a Pencil design system into production-ready Tailwind CSS code. Supports both Tailwind v3 and v4, with Next.js and Vite+React frameworks. Load this file when the user requests code export.

---

## Overview

The export converts the three layers of a Pencil design system into code:

1. **Tokens** → CSS custom properties (`globals.css`) + Tailwind config (v3 only)
2. **Components** → React TSX files with Tailwind classes
3. **Font loading** → Framework-specific font setup

The user chooses Tailwind version (v3 or v4) and framework (Next.js or Vite+React) before export begins.

---

## Section 1 — Token Extraction

### Reading Tokens

Call `get_variables({ filePath })` to retrieve all ~64 tokens. The response contains each token's name, type, and value(s).

### Categorizing Tokens

Sort tokens by type for output:

| Type | Tokens | CSS Output |
|------|--------|-----------|
| `color` (themed) | `--background`, `--primary`, etc. | `:root` + `.dark` blocks |
| `color` (static) | Rarely used — most colors are themed | Single `:root` value |
| `string` | `--font-primary`, `--font-secondary`, `--font-mono` | `@layer base` font utilities |
| `number` | `--radius-*`, `--space-*`, `--text-*`, `--leading-*` | `:root` as `px` or unitless |
| `shadow` | `--shadow-sm` through `--shadow-xl` | `:root` as box-shadow values |

### Separating Themed vs Static Tokens

Themed tokens have `values` with `"mode:light"` and `"mode:dark"` keys. Static tokens have a single `value`. In the CSS output:

- **Themed tokens** → value in `:root` (light) and overridden in `.dark` selector
- **Static tokens** → value in `:root` only

### Hex to HSL Conversion (Tailwind v3 Only)

Tailwind v3's `hsl(var(--primary))` pattern requires HSL values without the `hsl()` wrapper. Convert hex to HSL components:

```
#8B4513 → 25 75% 31%      (stored as "25 75% 31%" in CSS variable)
#2563EB → 217 91% 53%
```

**Algorithm:**
1. Parse hex to RGB (0–255)
2. Normalize to 0–1 range
3. Calculate H, S, L
4. Format as `"H S% L%"` (space-separated, no commas, no `hsl()` wrapper)

**Tailwind v4 uses hex directly** — no conversion needed.

---

## Section 2 — Tailwind v3 Output

### globals.css (v3)

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* Core colors (HSL components) */
    --background: 45 100% 93%;
    --foreground: 0 0% 4%;
    --card: 0 0% 100%;
    --card-foreground: 0 0% 4%;
    --popover: 0 0% 100%;
    --popover-foreground: 0 0% 4%;
    --primary: 25 75% 31%;
    --primary-foreground: 0 0% 100%;
    --secondary: 30 58% 89%;
    --secondary-foreground: 0 0% 10%;
    --muted: 33 42% 88%;
    --muted-foreground: 0 0% 45%;
    --accent: 0 53% 64%;
    --accent-foreground: 0 0% 10%;
    --destructive: 0 84% 60%;
    --destructive-foreground: 0 0% 100%;
    --border: 0 0% 90%;
    --input: 0 0% 90%;
    --ring: 25 75% 31%;

    /* Semantic colors */
    --color-success: 142 71% 45%;
    --color-success-foreground: 0 0% 100%;
    --color-warning: 38 92% 50%;
    --color-warning-foreground: 0 0% 100%;
    --color-error: 0 84% 60%;
    --color-error-foreground: 0 0% 100%;
    --color-info: 217 91% 60%;
    --color-info-foreground: 0 0% 100%;

    /* Border radius */
    --radius-none: 0px;
    --radius-sm: 4px;
    --radius-md: 8px;
    --radius-lg: 12px;
    --radius-xl: 16px;
    --radius-pill: 9999px;

    /* Spacing */
    --space-1: 4px;
    --space-2: 8px;
    --space-3: 12px;
    --space-4: 16px;
    --space-5: 20px;
    --space-6: 24px;
    --space-8: 32px;
    --space-10: 40px;
    --space-12: 48px;
    --space-16: 64px;
    --space-20: 80px;
    --space-24: 96px;

    /* Font sizes */
    --text-xs: 12px;
    --text-sm: 14px;
    --text-base: 16px;
    --text-lg: 18px;
    --text-xl: 20px;
    --text-2xl: 24px;
    --text-3xl: 30px;
    --text-4xl: 36px;
    --text-5xl: 48px;

    /* Line heights */
    --leading-tight: 1.25;
    --leading-normal: 1.5;
    --leading-relaxed: 1.75;

    /* Shadows */
    --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
    --shadow-md: 0 4px 6px rgba(0,0,0,0.07);
    --shadow-lg: 0 10px 15px rgba(0,0,0,0.1);
    --shadow-xl: 0 20px 25px rgba(0,0,0,0.15);
  }

  .dark {
    --background: 20 17% 8%;
    --foreground: 0 0% 98%;
    --card: 20 18% 14%;
    --card-foreground: 0 0% 98%;
    --popover: 20 18% 14%;
    --popover-foreground: 0 0% 98%;
    --primary: 25 46% 64%;
    --primary-foreground: 0 0% 100%;
    --secondary: 20 32% 18%;
    --secondary-foreground: 0 0% 98%;
    --muted: 20 26% 11%;
    --muted-foreground: 0 0% 64%;
    --accent: 0 67% 73%;
    --accent-foreground: 0 0% 98%;
    --destructive: 0 72% 51%;
    --destructive-foreground: 0 0% 100%;
    --border: 0 0% 16%;
    --input: 0 0% 16%;
    --ring: 25 46% 64%;

    --color-success: 142 69% 58%;
    --color-success-foreground: 150 80% 10%;
    --color-warning: 45 93% 56%;
    --color-warning-foreground: 30 89% 14%;
    --color-error: 0 91% 71%;
    --color-error-foreground: 0 63% 16%;
    --color-info: 217 92% 68%;
    --color-info-foreground: 224 64% 21%;
  }

  /* Font utility classes */
  .font-primary {
    font-family: var(--font-primary), serif;
  }
  .font-secondary {
    font-family: var(--font-secondary), sans-serif;
  }
  .font-mono {
    font-family: var(--font-mono), monospace;
  }
}
```

### tailwind.config.js (v3)

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",     // Next.js
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",      // Vite
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        success: {
          DEFAULT: "hsl(var(--color-success))",
          foreground: "hsl(var(--color-success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--color-warning))",
          foreground: "hsl(var(--color-warning-foreground))",
        },
        error: {
          DEFAULT: "hsl(var(--color-error))",
          foreground: "hsl(var(--color-error-foreground))",
        },
        info: {
          DEFAULT: "hsl(var(--color-info))",
          foreground: "hsl(var(--color-info-foreground))",
        },
      },
      borderRadius: {
        none: "var(--radius-none)",
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
        pill: "var(--radius-pill)",
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        xl: "var(--shadow-xl)",
      },
      fontSize: {
        xs: "var(--text-xs)",
        sm: "var(--text-sm)",
        base: "var(--text-base)",
        lg: "var(--text-lg)",
        xl: "var(--text-xl)",
        "2xl": "var(--text-2xl)",
        "3xl": "var(--text-3xl)",
        "4xl": "var(--text-4xl)",
        "5xl": "var(--text-5xl)",
      },
      lineHeight: {
        tight: "var(--leading-tight)",
        normal: "var(--leading-normal)",
        relaxed: "var(--leading-relaxed)",
      },
      spacing: {
        1: "var(--space-1)",
        2: "var(--space-2)",
        3: "var(--space-3)",
        4: "var(--space-4)",
        5: "var(--space-5)",
        6: "var(--space-6)",
        8: "var(--space-8)",
        10: "var(--space-10)",
        12: "var(--space-12)",
        16: "var(--space-16)",
        20: "var(--space-20)",
        24: "var(--space-24)",
      },
    },
  },
  plugins: [],
};
```

**shadcn/ui compatibility:** This config is drop-in compatible with shadcn/ui. The color naming, HSL pattern, and dark mode strategy are identical. Users can install shadcn/ui components alongside the exported ones.

---

## Section 3 — Tailwind v4 Output

### globals.css (v4)

```css
@import "tailwindcss";

@custom-variant dark (&:where(.dark, .dark *));

@layer base {
  :root {
    /* Core colors (hex values) */
    --background: #FFF8DC;
    --foreground: #0A0A0A;
    --card: #FFFFFF;
    --card-foreground: #0A0A0A;
    --popover: #FFFFFF;
    --popover-foreground: #0A0A0A;
    --primary: #8B4513;
    --primary-foreground: #FFFFFF;
    --secondary: #F5E6D3;
    --secondary-foreground: #1A1A1A;
    --muted: #F0E4D4;
    --muted-foreground: #737373;
    --accent: #CD5C5C;
    --accent-foreground: #1A1A1A;
    --destructive: #EF4444;
    --destructive-foreground: #FFFFFF;
    --border: #E5E5E5;
    --input: #E5E5E5;
    --ring: #8B4513;

    /* Semantic colors */
    --color-success: #22C55E;
    --color-success-foreground: #FFFFFF;
    --color-warning: #F59E0B;
    --color-warning-foreground: #FFFFFF;
    --color-error: #EF4444;
    --color-error-foreground: #FFFFFF;
    --color-info: #3B82F6;
    --color-info-foreground: #FFFFFF;

    /* Border radius */
    --radius-none: 0px;
    --radius-sm: 4px;
    --radius-md: 8px;
    --radius-lg: 12px;
    --radius-xl: 16px;
    --radius-pill: 9999px;

    /* Spacing */
    --space-1: 4px;
    --space-2: 8px;
    --space-3: 12px;
    --space-4: 16px;
    --space-5: 20px;
    --space-6: 24px;
    --space-8: 32px;
    --space-10: 40px;
    --space-12: 48px;
    --space-16: 64px;
    --space-20: 80px;
    --space-24: 96px;

    /* Font sizes */
    --text-xs: 12px;
    --text-sm: 14px;
    --text-base: 16px;
    --text-lg: 18px;
    --text-xl: 20px;
    --text-2xl: 24px;
    --text-3xl: 30px;
    --text-4xl: 36px;
    --text-5xl: 48px;

    /* Line heights */
    --leading-tight: 1.25;
    --leading-normal: 1.5;
    --leading-relaxed: 1.75;

    /* Shadows */
    --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
    --shadow-md: 0 4px 6px rgba(0,0,0,0.07);
    --shadow-lg: 0 10px 15px rgba(0,0,0,0.1);
    --shadow-xl: 0 20px 25px rgba(0,0,0,0.15);
  }

  .dark {
    --background: #1A1410;
    --foreground: #FAFAFA;
    --card: #2D2218;
    --card-foreground: #FAFAFA;
    --popover: #2D2218;
    --popover-foreground: #FAFAFA;
    --primary: #D4A574;
    --primary-foreground: #FFFFFF;
    --secondary: #3D2E1E;
    --secondary-foreground: #FAFAFA;
    --muted: #261E14;
    --muted-foreground: #A3A3A3;
    --accent: #E88E8E;
    --accent-foreground: #FAFAFA;
    --destructive: #DC2626;
    --destructive-foreground: #FFFFFF;
    --border: #2A2A2A;
    --input: #2A2A2A;
    --ring: #D4A574;

    --color-success: #4ADE80;
    --color-success-foreground: #052E16;
    --color-warning: #FBBF24;
    --color-warning-foreground: #451A03;
    --color-error: #F87171;
    --color-error-foreground: #450A0A;
    --color-info: #60A5FA;
    --color-info-foreground: #172554;
  }

  /* Font utility classes */
  .font-primary {
    font-family: var(--font-primary), serif;
  }
  .font-secondary {
    font-family: var(--font-secondary), sans-serif;
  }
  .font-mono {
    font-family: var(--font-mono), monospace;
  }
}
```

**Key v4 differences:**
- `@import "tailwindcss"` replaces three `@tailwind` directives
- `@custom-variant dark` replaces `darkMode: "class"` in config
- Hex values used directly (no HSL conversion)
- No `tailwind.config.js` — use arbitrary value syntax: `bg-[var(--primary)]`

---

## Section 4 — Pencil Property to Tailwind Class Cheatsheet

Use this table when translating Pencil component nodes to Tailwind classes. The "v3 Class" column shows the mapped utility name (requires the config above). The "v4 Class" column shows the arbitrary value syntax.

### Layout

| Pencil Property | v3 Class | v4 Class |
|----------------|----------|----------|
| `layout: "vertical"` | `flex flex-col` | `flex flex-col` |
| `layout: "horizontal"` | `flex flex-row` | `flex flex-row` |
| `justifyContent: "center"` | `justify-center` | `justify-center` |
| `justifyContent: "space_between"` | `justify-between` | `justify-between` |
| `justifyContent: "flex_end"` | `justify-end` | `justify-end` |
| `alignItems: "center"` | `items-center` | `items-center` |
| `alignItems: "flex_start"` | `items-start` | `items-start` |
| `alignItems: "flex_end"` | `items-end` | `items-end` |
| `width: "fill_container"` | `w-full` or `flex-1` | `w-full` or `flex-1` |
| `height: "hug_contents"` | `h-fit` | `h-fit` |
| `clip: true` | `overflow-hidden` | `overflow-hidden` |

### Spacing

| Pencil Property | v3 Class | v4 Class |
|----------------|----------|----------|
| `padding: 16` | `p-4` | `p-[var(--space-4)]` |
| `padding: [10, 20]` | `py-2.5 px-5` | `py-[var(--space-3)] px-[var(--space-5)]` |
| `padding: [10, 20, 10, 20]` | `py-2.5 px-5` | `py-[10px] px-[20px]` |
| `gap: 8` | `gap-2` | `gap-[var(--space-2)]` |
| `gap: 16` | `gap-4` | `gap-[var(--space-4)]` |
| `gap: 24` | `gap-6` | `gap-[var(--space-6)]` |

### Colors

| Pencil Property | v3 Class | v4 Class |
|----------------|----------|----------|
| `fill: "$--primary"` | `bg-primary` | `bg-[var(--primary)]` |
| `fill: "$--secondary"` | `bg-secondary` | `bg-[var(--secondary)]` |
| `fill: "$--muted"` | `bg-muted` | `bg-[var(--muted)]` |
| `fill: "$--card"` | `bg-card` | `bg-[var(--card)]` |
| `fill: "$--background"` | `bg-background` | `bg-[var(--background)]` |
| `fill: "$--destructive"` | `bg-destructive` | `bg-[var(--destructive)]` |
| `fill: "$--accent"` | `bg-accent` | `bg-[var(--accent)]` |
| `fill (text): "$--foreground"` | `text-foreground` | `text-[var(--foreground)]` |
| `fill (text): "$--primary-foreground"` | `text-primary-foreground` | `text-[var(--primary-foreground)]` |
| `fill (text): "$--muted-foreground"` | `text-muted-foreground` | `text-[var(--muted-foreground)]` |

### Typography

| Pencil Property | v3 Class | v4 Class |
|----------------|----------|----------|
| `fontFamily: "$--font-primary"` | `font-primary` | `font-primary` |
| `fontFamily: "$--font-secondary"` | `font-secondary` | `font-secondary` |
| `fontFamily: "$--font-mono"` | `font-mono` | `font-mono` |
| `fontSize: "$--text-xs"` | `text-xs` | `text-[length:var(--text-xs)]` |
| `fontSize: "$--text-sm"` | `text-sm` | `text-[length:var(--text-sm)]` |
| `fontSize: "$--text-base"` | `text-base` | `text-[length:var(--text-base)]` |
| `fontSize: "$--text-lg"` | `text-lg` | `text-[length:var(--text-lg)]` |
| `fontSize: "$--text-xl"` | `text-xl` | `text-[length:var(--text-xl)]` |
| `fontSize: "$--text-2xl"` | `text-2xl` | `text-[length:var(--text-2xl)]` |
| `fontSize: "$--text-3xl"` | `text-3xl` | `text-[length:var(--text-3xl)]` |
| `fontSize: "$--text-4xl"` | `text-4xl` | `text-[length:var(--text-4xl)]` |
| `fontSize: "$--text-5xl"` | `text-5xl` | `text-[length:var(--text-5xl)]` |
| `fontWeight: "400"` | `font-normal` | `font-normal` |
| `fontWeight: "500"` | `font-medium` | `font-medium` |
| `fontWeight: "600"` | `font-semibold` | `font-semibold` |
| `fontWeight: "700"` | `font-bold` | `font-bold` |
| `lineHeight: "$--leading-tight"` | `leading-tight` | `leading-[var(--leading-tight)]` |
| `lineHeight: "$--leading-normal"` | `leading-normal` | `leading-[var(--leading-normal)]` |

### Borders & Radius

| Pencil Property | v3 Class | v4 Class |
|----------------|----------|----------|
| `cornerRadius: "$--radius-sm"` | `rounded-sm` | `rounded-[var(--radius-sm)]` |
| `cornerRadius: "$--radius-md"` | `rounded-md` | `rounded-[var(--radius-md)]` |
| `cornerRadius: "$--radius-lg"` | `rounded-lg` | `rounded-[var(--radius-lg)]` |
| `cornerRadius: "$--radius-xl"` | `rounded-xl` | `rounded-[var(--radius-xl)]` |
| `cornerRadius: "$--radius-pill"` | `rounded-pill` | `rounded-[var(--radius-pill)]` |
| `stroke: { fill: "$--border", thickness: 1 }` | `border border-border` | `border border-[var(--border)]` |
| `stroke: { fill: "$--input", thickness: 1 }` | `border border-input` | `border border-[var(--input)]` |

### Shadows

| Pencil Property | v3 Class | v4 Class |
|----------------|----------|----------|
| `effect: "$--shadow-sm"` | `shadow-sm` | `shadow-[var(--shadow-sm)]` |
| `effect: "$--shadow-md"` | `shadow-md` | `shadow-[var(--shadow-md)]` |
| `effect: "$--shadow-lg"` | `shadow-lg` | `shadow-[var(--shadow-lg)]` |
| `effect: "$--shadow-xl"` | `shadow-xl` | `shadow-[var(--shadow-xl)]` |

### Component Mapping

| Pencil Node | React Element |
|------------|--------------|
| `reusable: true` frame | Exported React component |
| `type: "text"` | `<span>`, `<p>`, `<h1>`–`<h6>` (based on fontSize) |
| `type: "frame"` with layout | `<div>` with flex classes |
| `type: "frame"` with image fill | `<img>` / `next/image` |
| `type: "icon_font"` | Lucide React icon |
| `type: "ref"` | Component instance (import + render) |

---

## Section 5 — Component Export Workflow

### Step 1: Read All Components

```
batch_get({
  filePath: "...",
  patterns: [{ reusable: true }],
  readDepth: 3,
  searchDepth: 3
})
```

This returns every reusable component with its children (up to 3 levels deep).

### Step 2: Group by Category

Components follow the `"Category/Variant"` naming convention. Group by the prefix before `/`:

```
Buttons/Primary    → button.tsx
Buttons/Secondary  → button.tsx
Buttons/Outline    → button.tsx
Inputs/TextField   → input.tsx
Inputs/InputGroup  → input.tsx
Cards/Card         → card.tsx
Typography/H1      → typography.tsx (optional — often just utility classes)
```

### Step 3: Translate Node Tree to JSX

For each component, walk its node tree and convert:

1. **Frame nodes** → `<div>` with layout/spacing/color classes
2. **Text nodes** → `<span>` or semantic element with typography classes
3. **Icon nodes** → Lucide React icon import
4. **Ref nodes** → Import and render the referenced component

Apply the cheatsheet from Section 4 to convert every Pencil property to its Tailwind class.

### Step 4: Add Variant Support

Components with multiple variants (e.g., Button has Primary, Secondary, Outline, Ghost, Destructive) become a single component with a `variant` prop:

**Button (v3 output):**

```tsx
import { type ButtonHTMLAttributes } from "react";

const variants = {
  primary: "bg-primary text-primary-foreground hover:bg-primary/90",
  secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
  outline: "border border-border bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground",
  ghost: "bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground",
  destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
} as const;

type Variant = keyof typeof variants;

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export function Button({ variant = "primary", className = "", children, ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-md px-5 py-2.5 text-sm font-semibold font-secondary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
```

**Button (v4 output):**

```tsx
import { type ButtonHTMLAttributes } from "react";

const variants = {
  primary: "bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[var(--primary)]/90",
  secondary: "bg-[var(--secondary)] text-[var(--secondary-foreground)] hover:bg-[var(--secondary)]/80",
  outline: "border border-[var(--border)] bg-transparent text-[var(--foreground)] hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]",
  ghost: "bg-transparent text-[var(--foreground)] hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]",
  destructive: "bg-[var(--destructive)] text-[var(--destructive-foreground)] hover:bg-[var(--destructive)]/90",
} as const;

type Variant = keyof typeof variants;

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export function Button({ variant = "primary", className = "", children, ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] px-[var(--space-5)] py-[10px] text-[length:var(--text-sm)] font-semibold font-secondary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] disabled:pointer-events-none disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
```

### Component Export Examples

**InputGroup (v3):**

```tsx
interface InputGroupProps {
  label: string;
  placeholder?: string;
  type?: string;
}

export function InputGroup({ label, placeholder = "", type = "text" }: InputGroupProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium font-secondary text-foreground">{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-secondary text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
    </div>
  );
}
```

**Badge (v3):**

```tsx
const variants = {
  default: "bg-primary text-primary-foreground",
  success: "bg-success text-success-foreground",
  warning: "bg-warning text-warning-foreground",
  error: "bg-error text-error-foreground",
} as const;

type Variant = keyof typeof variants;

interface BadgeProps {
  variant?: Variant;
  children: React.ReactNode;
}

export function Badge({ variant = "default", children }: BadgeProps) {
  return (
    <span className={`inline-flex items-center rounded-pill px-2.5 py-0.5 text-xs font-semibold font-secondary ${variants[variant]}`}>
      {children}
    </span>
  );
}
```

**Card (v3):**

```tsx
interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className = "" }: CardProps) {
  return (
    <div className={`rounded-lg border border-border bg-card text-card-foreground shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className = "" }: CardProps) {
  return <div className={`flex flex-col gap-1.5 p-6 ${className}`}>{children}</div>;
}

export function CardContent({ children, className = "" }: CardProps) {
  return <div className={`p-6 pt-0 ${className}`}>{children}</div>;
}

export function CardFooter({ children, className = "" }: CardProps) {
  return <div className={`flex items-center p-6 pt-0 ${className}`}>{children}</div>;
}
```

**Alert (v3):**

```tsx
import { Info, CircleCheck, TriangleAlert, CircleX } from "lucide-react";

const variants = {
  info: { bg: "bg-info/10 border-info/20", text: "text-info", icon: Info },
  success: { bg: "bg-success/10 border-success/20", text: "text-success", icon: CircleCheck },
  warning: { bg: "bg-warning/10 border-warning/20", text: "text-warning", icon: TriangleAlert },
  error: { bg: "bg-error/10 border-error/20", text: "text-error", icon: CircleX },
} as const;

type Variant = keyof typeof variants;

interface AlertProps {
  variant?: Variant;
  title: string;
  children: React.ReactNode;
}

export function Alert({ variant = "info", title, children }: AlertProps) {
  const { bg, text, icon: Icon } = variants[variant];
  return (
    <div className={`flex gap-3 rounded-lg border p-4 ${bg}`}>
      <Icon className={`h-5 w-5 shrink-0 ${text}`} />
      <div className="flex flex-col gap-1">
        <p className={`text-sm font-semibold font-secondary ${text}`}>{title}</p>
        <p className="text-sm font-secondary text-foreground">{children}</p>
      </div>
    </div>
  );
}
```

---

## Section 6 — Framework-Specific Setup

### Next.js (App Router)

**File structure:**

```
app/
  globals.css          ← Generated globals.css
  layout.tsx           ← Font loading + globals import
components/
  ui/
    button.tsx         ← Generated components
    input.tsx
    card.tsx
    badge.tsx
    alert.tsx
    ...
tailwind.config.js     ← Generated (v3 only)
```

**layout.tsx with next/font/google:**

```tsx
import type { Metadata } from "next";
import { Playfair_Display, Nunito, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const fontPrimary = Playfair_Display({
  variable: "--font-primary",
  subsets: ["latin"],
  display: "swap",
});

const fontSecondary = Nunito({
  variable: "--font-secondary",
  subsets: ["latin"],
  display: "swap",
});

const fontMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "My App",
  description: "Built with a custom design system",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${fontPrimary.variable} ${fontSecondary.variable} ${fontMono.variable} font-secondary antialiased`}>
        {children}
      </body>
    </html>
  );
}
```

**Font CSS variable wiring:** See `get_guidelines("tailwind")` → "Font Implementation" and "Next.js Font Loaders" sections for the authoritative rules on how `next/font` CSS variables must be wired to `@layer base` utility classes.

**Font name mapping for next/font:** Google Font names use underscores in the import:
- `Playfair Display` → `Playfair_Display`
- `JetBrains Mono` → `JetBrains_Mono`
- `DM Serif Display` → `DM_Serif_Display`
- `Open Sans` → `Open_Sans`
- `Space Grotesk` → `Space_Grotesk`
- Single-word fonts (Inter, Nunito, Lato, Roboto, etc.) stay as-is

### Vite + React

**File structure:**

```
src/
  index.css            ← Generated globals.css
  main.tsx             ← Imports index.css
  components/
    ui/
      button.tsx       ← Generated components
      input.tsx
      card.tsx
      ...
index.html             ← Font loading via <link>
tailwind.config.js     ← Generated (v3 only)
```

**index.html with Google Fonts `<link>`:**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>My App</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=Nunito:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
      rel="stylesheet"
    />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

**Font URL format:** Replace spaces with `+`, list weights with `wght@`, separate families with `&family=`.

### Image Handling

| Framework | Component | Import |
|-----------|-----------|--------|
| Next.js | `<Image>` from `next/image` | `import Image from "next/image"` |
| Vite+React | `<img>` native element | None |

When a Pencil component contains an image fill (applied via `G()`), export it as:

- **Next.js:** `<Image src="/images/..." alt="..." width={W} height={H} />`
- **Vite+React:** `<img src="/images/..." alt="..." className="w-full h-auto" />`

---

## Section 7 — Screen / Page Export (Design-Faithful Code Generation)

This section covers how to read actual screen designs from the .pen file and generate page-level code that **exactly reproduces** the design — every element, layout, spacing value, text label, icon, and color.

### Why This Matters

Sections 1–6 cover exporting **tokens** and **reusable component primitives**. But a design system also contains **screens** (login page, dashboard, settings, etc.) and **patterns** (form layouts, navigation, card grids). The user expects the exported code to match these designs pixel-for-pixel — not a generic interpretation.

### Step 0: Load Pencil's Code Generation Guidelines

Before translating any screen to code, load Pencil's authoritative guidelines:

```
get_guidelines({ topic: "code" })
get_guidelines({ topic: "tailwind" })
```

These provide the canonical rules for:
- Mapping component instances and their overrides (code guide Step 1C)
- Translating every Pencil property to Tailwind classes (tailwind guide)
- Font loading and CSS variable wiring (tailwind guide "Font Implementation")
- Visual verification workflow (code guide Step 3)

**The Pencil guidelines are the primary authority for node-to-code translation. The rules below handle screen-level concerns that Pencil's guidelines don't cover (screen identification, page assembly, framework file structure).**

### Step 1: Identify Screens to Export

Screens in the .pen file live under the **Screens** section frame (Phase 8 output) or as standalone top-level frames. Identify them:

```
batch_get({
  filePath: "...",
  patterns: [{ type: "frame" }],
  searchDepth: 1,
  readDepth: 1
})
```

Look for frames named like "Login", "Dashboard", "Settings", "Menu", etc. — these are screen designs. Patterns section frames ("Form Pattern", "Data Display Pattern") may also be exported as page sections.

### Step 2: Deep-Read the Screen Node Tree

Read the entire screen frame with high depth to capture every nested element:

```
batch_get({
  filePath: "...",
  nodeIds: ["<screenFrameId>"],
  readDepth: 10,
  resolveInstances: true
})
```

**Critical flags:**
- `readDepth: 10` — captures deeply nested layouts (e.g., Card > CardContent > Form > InputGroup > Label)
- `resolveInstances: true` — expands `ref` component instances so you see their actual content, overrides, and descendant structure

If the tree is truncated (children show `"..."`), make follow-up `batch_get` calls on the truncated node IDs with higher depth.

### Step 3: Take a Reference Screenshot

```
get_screenshot({ filePath: "...", nodeId: "<screenFrameId>" })
```

Save this as the visual reference. After generating code, you'll compare against it to verify fidelity.

### Step 4: Map All Component Instances

Walk the node tree and identify every `ref` node (component instance). For each:

1. **Note the ref target** — which reusable component it references (e.g., `"Button/Primary"`, `"Inputs/InputGroup"`)
2. **Note property overrides** — text content, colors, dimensions that differ from the base component
3. **Note descendant overrides** — nested text/icon changes inside the component instance

Create a mapping:

```
Screen "Login":
├── ref → "Inputs/InputGroup" (label: "Email", placeholder: "jane@goldencrust.com")
├── ref → "Inputs/InputGroup" (label: "Password", placeholder: "Enter your password")
├── ref → "Buttons/Primary" (text: "Sign In", icon: "log-in")
├── ref → "Misc/Checkbox" (label: "Remember me")
└── raw text → "Don't have an account? Sign up"
```

### Step 4b: Build Font Property Table

Before writing any code, extract an explicit font property table from the node tree. For every `type: "text"` node (including text nodes inside resolved component instances), record **only the properties present in the node data**:

```
Text Node Font Table — Screen "Login":
| Node ID  | Content            | fontFamily         | fontSize       | fontWeight | fontStyle | lineHeight |
|----------|--------------------|--------------------|----------------|------------|-----------|------------|
| al8SZ    | "Golden Crust"     | $--font-primary    | $--text-4xl    | 700        | —         | —          |
| QJBXz    | "Welcome Back"     | $--font-primary    | $--text-2xl    | 600        | —         | —          |
| j299h    | "Sign in to..."    | $--font-secondary  | $--text-sm     | normal     | —         | —          |
```

**Rules:**
- Use `batch_get` **without** `resolveVariables` so you see `$--` token references, not computed values
- Record `fontStyle` and `lineHeight` only if they **explicitly appear** on the node. A dash (`—`) means "not set in design, do not add in code"
- **Never invent font properties** that aren't in the node data. If the node has no `fontStyle`, do not add `italic`/`underline`/`normal`. If the node has no `lineHeight`, do not add a line-height class
- For `fill` on text nodes, record the exact token — this maps to the `text-[var(...)]` class. A `fill: "$--card"` on an input is **different** from `fill: "$--background"`

This table becomes the single reference for all typography classes in the exported code. Every text element must trace back to a row in this table.

### Step 5: Translate the Node Tree to Code

Follow Pencil's Component Implementation Workflow (loaded from `get_guidelines("code")` in Step 0):

1. **Extract & map** (Pencil Steps 1A-1C) — Identify all component refs in the screen, count instances, document every property override and descendant mapping. This step captures the exact structure, children order, and content from the node tree.
2. **Create components** (Pencil Step 2) — Build React components following the tailwind guidelines from `get_guidelines("tailwind")` for exact property-to-class mapping. The tailwind guide covers layout conversion, spacing, colors, typography, fonts, and SVG styling. **Cross-reference every text element against the Font Property Table from Step 4b** — only output font classes for properties that exist in the table.
3. **Validate each component** (Pencil Step 3) — Use `get_screenshot` to verify pixel-perfect match before moving to the next component. Fix any discrepancy immediately.
4. **Integrate into frame** (Pencil Step 4) — Assemble components into the page layout. Verify instance count matches between design and code. Confirm all props match design overrides.

**For screen-level elements** not covered by Pencil's component workflow:

- **Semantic HTML** — Choose element based on context: `<h1>`-`<h3>` for headings, `<p>` for body text, `<label>` for form labels, `<a>` for links, `<form>` for form wrappers
- **Page wrapper** — Full-page screens need `min-h-screen` + centering/alignment classes on the outermost container
- **Form behavior** — Add `onSubmit={(e) => e.preventDefault()}` for demo/preview forms
- **Icon conversion** — Pencil `icon_font` nodes use kebab-case (`log-in`); convert to Lucide React PascalCase (`LogIn`). Watch for renamed icons: `check-circle` → `circle-check`, `alert-triangle` → `triangle-alert`, `home` → `house`
- **Image fills** — Pencil frames with image fills become `<Image>` (Next.js) or `<img>` (Vite+React) with the image source path

### Step 6: Assemble the Page File

Combine all translated elements into a complete page file.

**Note:** The example below illustrates the output structure for a login screen. The actual content, components, and layout must come from reading the .pen file's screen node tree via `batch_get` — never from this template.

```tsx
"use client"; // Next.js client component (only if using useState, event handlers, etc.)

import { Button } from "@/components/ui/button";
import { InputGroup } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { LogIn } from "lucide-react";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
      <div className="w-full max-w-[420px] flex flex-col gap-[var(--space-8)]">
        {/* Brand */}
        <h1 className="text-center text-[length:var(--text-3xl)] font-bold font-primary text-[var(--primary)]">
          Golden Crust
        </h1>

        {/* Login card — structure matches Pencil exactly */}
        <Card>
          <CardHeader>
            <CardTitle>Welcome Back</CardTitle>
            <CardDescription>Sign in to your account</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="flex flex-col gap-[var(--space-5)]" onSubmit={(e) => e.preventDefault()}>
              <InputGroup label="Email" placeholder="Placeholder" type="email" />
              <InputGroup label="Password" placeholder="Placeholder" type="password" />
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-[var(--space-2)] text-[length:var(--text-sm)] font-secondary">
                  <input type="checkbox" className="..." />
                  Remember me
                </label>
                <a href="#" className="text-[length:var(--text-sm)] font-secondary text-[var(--primary)] hover:underline">
                  Forgot password?
                </a>
              </div>
              <Button variant="primary" className="w-full">
                <LogIn className="h-4 w-4" />
                Sign In
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Footer link */}
        <p className="text-center text-[length:var(--text-sm)] text-[var(--muted-foreground)] font-secondary">
          Don&apos;t have an account?{" "}
          <a href="#" className="font-medium text-[var(--primary)] hover:underline">
            Sign up
          </a>
        </p>
      </div>
    </div>
  );
}
```

### Step 7: Visual Verification

After generating the page file:

1. **Run the dev server** and navigate to the page
2. **Take a screenshot** of the rendered page
3. **Compare side-by-side** with the Pencil screenshot from Step 3
4. **Check every element:**
   - Text content matches exactly (labels, headings, placeholder text, link text)
   - Layout direction and alignment match (vertical/horizontal, centered/left/right)
   - Spacing between elements matches (gaps, padding, margins)
   - Colors match (backgrounds, text colors, border colors)
   - Typography matches (font family, size, weight, italic/normal)
   - Icons match (correct icon, correct size, correct position)
   - Interactive elements present (checkboxes, links, buttons)
   - No extra elements that don't exist in the design (e.g., dark mode toggle, Google OAuth)
   - No missing elements that do exist in the design (e.g., "Remember me" checkbox)

5. **Fix discrepancies** immediately and re-verify

### Common Pitfalls in Screen Export

| Pitfall | Solution |
|---------|----------|
| Adding elements not in the design | Only include what the Pencil node tree contains — nothing more |
| Rephrasing or abbreviating text content | Copy all text verbatim from the Pencil node tree |
| Missing elements that exist in design | Read ALL children at full depth — don't skip small or nested elements |
| Inventing content not in the node tree | Use exact `content`, `placeholder`, and `icon` values from nodes |
| Inventing font styles not in the node | **Only output `italic`, `underline`, `lineHeight` if the node explicitly has that property.** A font that *looks* italic doesn't mean `fontStyle: "italic"` is set — check the node data, not the visual impression |
| Wrong fill token on text/input nodes | Read the node's exact `fill` value — e.g., an input with `fill: "$--card"` needs `bg-[var(--card)]`, NOT `bg-[var(--background)]`. These may be different colors |
| Using component without its design overrides | Apply the exact overrides from the instance's `descendants` map |
| Skipping the Font Property Table | Build the table in Step 4b before writing any code — it catches font mismatches before they reach the output |
| Skipping Pencil's code/tailwind guidelines | Always call `get_guidelines("code")` and `get_guidelines("tailwind")` — they are the authoritative property mapping |
| Skipping visual verification | Always use `get_screenshot` to compare rendered output against the Pencil design |

### Screen Export Workflow Summary

```
0. get_guidelines("code") + get_guidelines("tailwind")  → load Pencil's translation rules
1. batch_get(screenId, readDepth: 10, resolveInstances: true)  → full node tree
2. get_screenshot(screenId)  → save as visual reference
3. Map component instances (Step 4)
4. Build Font Property Table from text nodes (Step 4b)  → typography single source of truth
5. Translate to code using Pencil's workflow, cross-referencing font table (Step 5)
6. Handle screen-level elements (semantic HTML, page wrapper, forms)
7. Assemble into page.tsx with all imports
8. Verify visually against reference screenshot (Pencil Step 3)
9. Fix any discrepancies and re-verify
```

---

## Export Checklist

After generating all files, verify:

### Token & Component Checks

1. **All ~64 tokens present** in `globals.css` `:root` block
2. **Dark mode values** present in `.dark` block for all themed tokens
3. **No hardcoded hex** in component TSX files — all colors reference tokens
4. **Font utilities** (`.font-primary`, `.font-secondary`, `.font-mono`) defined in `@layer base`
5. **Config complete** (v3 only) — all colors, radii, shadows, font sizes, spacing mapped
6. **Components match Pencil** — compare generated Button, Card, Badge against Pencil screenshots
7. **Framework-correct paths** — Next.js uses `app/globals.css`, Vite uses `src/index.css`
8. **Font loading works** — fonts loaded via `next/font` (Next.js) or `<link>` (Vite)
9. **TypeScript types** — all components have proper interface/type definitions
10. **className prop** — all components accept and spread an optional `className` prop

### Screen/Page Checks (if screens were exported)

11. **Element completeness** — no missing elements and no extra elements vs the Pencil node tree
12. **Content fidelity** — every text label, placeholder, icon, and link matches the node tree verbatim
13. **Font property fidelity** — every text element's `fontFamily`, `fontSize`, `fontWeight`, `fontStyle`, and `lineHeight` matches the Font Property Table from Step 4b. No invented styles (italic, underline) that aren't in the node data
14. **Fill token accuracy** — text colors use the node's exact `fill` token, input/field backgrounds use the node's exact `fill` token (not a similar-sounding token like `--background` when the node says `--card`)
15. **Component usage** — all component refs imported with correct variant and override props
16. **Pencil validation passed** — followed Pencil's Component Implementation Workflow Steps 3-5 (visual verification with `get_screenshot`, frame integration, final validation)
17. **Visual comparison** — rendered page screenshot compared side-by-side against Pencil design screenshot
