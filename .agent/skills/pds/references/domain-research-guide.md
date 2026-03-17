# Domain Research Guide

How to research any business domain to inform design system decisions. Use this guide during Phase 1 to build a design brief before touching Pencil.

## Research Process

### Step 1 — Web Search

Use `WebSearch` with these query patterns:

```
"[domain] website design trends 2026"
"[domain] brand color palette examples"
"[domain] UI UX best practices"
"best [domain] website designs inspiration"
"[domain] app design case study"
```

For example, for a bakery:
```
"bakery website design trends 2026"
"bakery brand color palette examples"
"artisan bakery UI UX best practices"
```

### Step 2 — Extract the Five Pillars

From search results, document:

1. **Color palette** — 1 primary, 1–2 secondary, 1 accent, neutral scale, semantic colors
2. **Typography** — Display font + body font pairing (see Step 2b for dedicated font research)
3. **Imagery** — Photo subjects, illustration style, texture/pattern use
4. **Screen inventory** — 3–5 screens this business type needs
5. **UI density and tone** — Spacious vs. dense, formal vs. playful

### Step 2b — Font Research (Typography Deep Dive)

**Do NOT just pick fonts from the fallback table.** Run dedicated research to find the best pairing for this specific domain.

#### Font Research Queries

Run 2–3 of these `WebSearch` queries:

```
"[domain] website typography trends 2026"
"best Google Fonts for [domain] website"
"[domain] brand font pairing examples"
"[domain] website design fonts serif sans-serif"
```

For example, for a bakery:
```
"bakery website typography trends 2026"
"best Google Fonts for bakery website"
"artisan bakery brand font pairing examples"
```

#### What to Look For

From the search results, identify:

1. **What top sites in this domain actually use** — Check 3–5 real websites. Note their heading font, body font, and the personality they convey.
2. **Serif vs. sans-serif preference** — Some domains lean heavily serif (bakery, fine dining, fashion), others lean sans-serif (SaaS, fitness, developer tools).
3. **Font personality match** — Does the font's character match the domain's tone? (e.g., a playful rounded font for a kids' brand, a sharp geometric for fintech)
4. **Google Fonts availability** — The font must be available on Google Fonts for broad compatibility.

#### Font Evaluation Criteria

Score each candidate pairing against:

| Criteria | Question |
|----------|----------|
| **Personality** | Does it match the domain's tone? (warm, professional, playful, elegant) |
| **Readability** | Is the body font comfortable at 14–16px for paragraphs? |
| **Contrast** | Do the display and body fonts create clear visual hierarchy? |
| **Availability** | Is it on Google Fonts with sufficient weight options (400, 500, 600, 700)? |
| **Uniqueness** | Does it avoid being generic? (e.g., Inter is safe but unremarkable for a bakery) |

#### Decision Process

1. **Research first** — Run the queries above and note what real sites use.
2. **Pick 2–3 candidates** — Select display + body pairings that match the research.
3. **Validate against the domain** — Does this pairing feel right for a [bakery/SaaS/fitness app]?
4. **Fall back if needed** — If research yields no clear winner, use the Fallback Pairing Table below.
5. **Document the choice** — In the design brief, note: font name, why it was chosen, and the source (research or fallback).

### Step 3 — Compile Design Brief

Write a concise brief (internal reference, not shown to user).

**If the user specified colors or fonts:** Use their values directly — mark them as "user-specified" in the brief. Research still fills in the remaining values (secondary, muted, foreground, etc.) to complement the user's choices.

**If the user gave no preferences:** Use research results + fallback tables.

```
Domain: Bakery
Brand name: [if provided]
Primary color: Warm brown (#8B4513) — trust, warmth, earthiness [source: research / user-specified / fallback]
Secondary: Cream (#FFF8DC) — softness, comfort [source: derived from primary]
Accent: Terracotta (#CD5C5C) — warmth, appetite [source: research / user-specified / fallback]
Fonts: Playfair Display (display) + Nunito (body) [source: research / user-specified / fallback]
Imagery: Artisan bread, pastries, warm wood, flour dust, golden light
Screens: Landing hero, Menu grid, Order/cart, About story, Contact
Tone: Warm, inviting, artisanal, approachable
Density: Spacious, editorial, generous whitespace
```

---

## Color Psychology by Industry

Use these as starting points. Always validate with web research for the specific sub-domain.

### Food & Beverage

| Sub-domain | Primary | Secondary | Accent | Psychology |
|-----------|---------|-----------|--------|------------|
| Bakery | Warm brown `#8B4513` | Cream `#FFF8DC` | Terracotta `#CD5C5C` | Warmth, earthiness, comfort |
| Coffee shop | Dark brown `#3E2723` | Cream `#F5F0EB` | Burnt orange `#E65100` | Richness, energy, warmth |
| Restaurant (fine) | Deep navy `#1A237E` | Off-white `#FAFAFA` | Gold `#FFD700` | Elegance, trust, luxury |
| Restaurant (casual) | Tomato red `#D32F2F` | Warm white `#FFF3E0` | Olive green `#689F38` | Appetite, energy, freshness |
| Juice/smoothie | Lime green `#7CB342` | Light yellow `#FFF9C4` | Berry purple `#7B1FA2` | Freshness, health, energy |
| Pizza | Red `#C62828` | Warm yellow `#FFC107` | Green `#388E3C` | Appetite, fun, Italian heritage |

### Technology & SaaS

| Sub-domain | Primary | Secondary | Accent | Psychology |
|-----------|---------|-----------|--------|------------|
| B2B SaaS | Blue `#2563EB` | Slate `#F1F5F9` | Purple `#7C3AED` | Trust, professionalism, innovation |
| Developer tools | Dark gray `#1E293B` | Slate `#334155` | Green `#22C55E` | Technical, focused, reliable |
| AI/ML | Violet `#7C3AED` | Near-white `#FAFAFE` | Cyan `#06B6D4` | Innovation, futurism, intelligence |
| Fintech | Navy `#1E3A5F` | Light gray `#F8FAFC` | Green `#059669` | Trust, security, growth |
| EdTech | Teal `#0D9488` | Warm white `#FFFBF0` | Orange `#F97316` | Learning, growth, engagement |
| Healthcare SaaS | Teal `#0F766E` | White `#FFFFFF` | Light blue `#38BDF8` | Trust, calm, clinical precision |

### Lifestyle & Wellness

| Sub-domain | Primary | Secondary | Accent | Psychology |
|-----------|---------|-----------|--------|------------|
| Fitness | Energetic orange `#EA580C` | Near-black `#171717` | Neon green `#84CC16` | Energy, motivation, intensity |
| Yoga/meditation | Sage green `#6B8F71` | Warm cream `#FAF5EE` | Lavender `#A78BFA` | Calm, nature, balance |
| Spa/beauty | Rose gold `#B76E79` | Soft pink `#FFF0F3` | Gold `#D4AF37` | Luxury, femininity, relaxation |
| Fashion | Black `#000000` | White `#FFFFFF` | One bold accent | Sophistication, elegance, editorial |
| Real estate | Navy `#1A365D` | Warm white `#FAF9F6` | Gold `#B8860B` | Trust, luxury, stability |

### Creative & Agency

| Sub-domain | Primary | Secondary | Accent | Psychology |
|-----------|---------|-----------|--------|------------|
| Design agency | Black `#111111` | White `#FAFAFA` | Electric blue `#3B82F6` | Minimalism, craft, precision |
| Photography | Charcoal `#1C1C1C` | Off-white `#F5F5F5` | Warm amber `#D97706` | Artistry, moodiness, focus |
| Music | Deep purple `#4A148C` | Dark `#121212` | Neon pink `#EC4899` | Creativity, emotion, energy |

---

## Typography Pairing Guide

### Pairing Principles

- **Display + Body**: The display font carries personality; the body font provides readability
- **Contrast rule**: Pair a serif with a sans-serif, or a decorative with a clean geometric
- **Weight balance**: Display fonts can be bold/heavy; body fonts should be regular weight
- **x-height match**: Fonts with similar x-heights pair better

### Fallback Pairing Table

> **Use only as a fallback.** Always run Step 2b font research first. These are sensible defaults if research yields no clear winner.

| Domain | Display Font | Body Font | Rationale |
|--------|-------------|-----------|-----------|
| Bakery/artisan | Playfair Display | Nunito | Elegant serif + friendly rounded sans |
| Coffee/café | DM Serif Display | Inter | Warm serif + clean modern sans |
| Fine dining | Cormorant Garamond | Lato | Refined serif + versatile sans |
| Casual restaurant | Poppins (700) | Poppins (400) | Single family, weight contrast |
| SaaS / B2B | Inter (700) | Inter (400) | Clean, professional, systematic |
| Developer tools | JetBrains Mono | Inter | Monospace display + clean body |
| AI / startup | Space Grotesk | DM Sans | Futuristic geometric + clean companion |
| Fintech | Outfit | Inter | Modern geometric + trusted neutral |
| Fitness | Oswald | Roboto | Condensed power + clean readability |
| Yoga / wellness | Cormorant | Nunito Sans | Graceful serif + soft sans |
| Fashion | Playfair Display | Raleway | Elegant editorial pairing |
| Real estate | Merriweather | Open Sans | Trustworthy serif + friendly body |
| E-commerce | Poppins | Open Sans | Friendly geometric + versatile body |
| Agency/portfolio | Space Grotesk | Inter | Modern statement + invisible body |
| Education | Quicksand | Nunito | Rounded friendly + approachable body |

### Mono Font

Always set `--font-mono` to `JetBrains Mono` or `Fira Code` regardless of domain. Mono fonts are used for code snippets, data tables, and technical labels.

---

## Screen Inventory Templates

### Food & Beverage Screens

| Screen | Purpose | Key Components |
|--------|---------|---------------|
| Landing/Hero | First impression, brand story | Hero image, headline, CTA button, navigation |
| Menu/Catalog | Browse products | Card grid, category tabs, search, prices |
| Product Detail | Single item view | Large image, description, add-to-cart, reviews |
| Order/Cart | Review and checkout | Cart items, quantity controls, total, checkout button |
| About/Story | Brand narrative | Full-width images, text blocks, timeline |
| Contact | Location and hours | Map embed, form, address, hours table |

### SaaS / Dashboard Screens

| Screen | Purpose | Key Components |
|--------|---------|---------------|
| Dashboard | Overview metrics | Sidebar nav, metric cards, charts, data table |
| Settings | User/app config | Form inputs, toggles, save button, tabs |
| Login/Signup | Authentication | Form, social login buttons, branding |
| Pricing | Plan comparison | Pricing cards (3-column), feature comparison, CTA |
| User list/table | Data management | Table with sorting, pagination, search, filters |

### Fitness / Wellness Screens

| Screen | Purpose | Key Components |
|--------|---------|---------------|
| Home/Hero | Motivational entry | Hero with action imagery, headline, CTA |
| Workout Tracker | Log exercises | Card list, progress bars, timer, stats |
| Profile | User details | Avatar, stats grid, achievement badges |
| Schedule | Class/session calendar | Calendar grid, time slots, booking buttons |
| Programs | Browse plans | Card grid with difficulty badges, duration |

### E-commerce Screens

| Screen | Purpose | Key Components |
|--------|---------|---------------|
| Product Listing | Browse products | Card grid, filters sidebar, sorting, pagination |
| Product Detail | Single product | Image gallery, specs, add-to-cart, reviews |
| Cart | Review order | Item list, quantity, subtotal, checkout button |
| Checkout | Complete purchase | Address form, payment, order summary |
| Order Confirmation | Post-purchase | Order number, summary, tracking |

### Portfolio / Agency Screens

| Screen | Purpose | Key Components |
|--------|---------|---------------|
| Home/Hero | First impression | Large hero, work preview grid, tagline |
| Work/Projects | Showcase | Project cards with images, descriptions, tags |
| About | Team and story | Team photos, bio text, values |
| Contact | Get in touch | Contact form, email, social links |
| Case Study | Deep dive | Full-width images, metrics, process narrative |

---

## Research Output Template

After completing research, compile findings in this format before proceeding to Phase 2:

```
## Design Brief: [Domain]

### Brand
- Name: [user-provided or TBD]
- Tone: [warm/cool/professional/playful/etc.]
- Density: [spacious/moderate/dense]

### Colors
- Primary: [hex] — [psychology]
- Secondary: [hex] — [psychology]
- Accent: [hex] — [psychology]
- Background light: [hex]
- Background dark: [hex]
- Semantic: [derive from palette — match temperature, saturation, lightness of primary. See design-tokens-reference.md]

### Typography
- Display: [font name] — [rationale]
- Body: [font name] — [rationale]
- Mono: JetBrains Mono
- Source: [research / fallback table] — [which sites use this / why fallback was used]

### Imagery
- Subjects: [what to photograph/illustrate]
- Style: [realistic/flat/gradient/textured]
- Mood: [bright/moody/warm/cool]

### Screens (Priority Order)
1. [Screen name] — [purpose]
2. [Screen name] — [purpose]
3. [Screen name] — [purpose]
4. [Screen name] — [purpose]
5. [Screen name] — [purpose]
```
