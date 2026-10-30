# Forest Guard — Frontend Design System (v0.2 Consolidated)

This document is the authoritative single source of truth for the visual language and frontend design tokens of Forest Guard.
All pages and components in the application adhere to this specification.

> **Art Direction:** An Earth-observation observatory combined with an editorial scientific journal.
> Deep space `#05060F` / `#03050B` canvas, genuine Copernicus Sentinel-2 satellite imagery, restrained teal `#3DFFB0` primary action, atmospheric cyan/indigo depth, and balanced editorial typography. Everything feels calm, measured, scientific, and precise.

---

## 1. Consolidated Palette

| Token | Value | Semantic Use |
| --- | --- | --- |
| `bg` | `#05060F` | Main deep-space background |
| `bg-void` / `ink-950` | `#03050B` | Deepest canvas / ambient depth |
| `surface` / `ink-800` | `#080E1B` | Primary panel surface |
| `surface-2` / `ink-750` | `#0B1324` | Elevated cards, inputs, secondary panels |
| `text-primary` / `ice-50` | `#F2F7FF` | Primary text (headings, high contrast) |
| `text-secondary` / `ice-300` | `#A7B4CC` | Supporting body copy, secondary metadata |
| `text-tertiary` / `ice-400` | `#8794AA` | Captions, labels, table headers (contrast verified >= 4.5:1) |
| `accent` / `bio` | `#3DFFB0` | Primary action, active navigation underline, Maharashtra boundary |
| `atmosphere-aqua` | `#6FE3FF` | Background depth, atmospheric cyan accents (<= 10% opacity) |
| `atmosphere-indigo` | `#1D4ED8` | Background depth, planetary glow (<= 10% opacity) |
| `warn` / `signal` | `#FFB454` | Genuine warnings, cloud-obscured/incomplete states only |
| `danger` | `#FF6B6B` | Critical failures, error states only |
| `border-subtle` | `rgba(255,255,255,0.08)` | Hairline dividers, card outlines |
| `border-strong` | `rgba(255,255,255,0.16)` | Selected cards, interactive focus rings |
| `focus-ring` | `#3DFFB0` | Accessible keyboard focus outline (2px with 2px offset) |

### Contrast & Status Semantics
- **Text Contrast:** All normal body copy achieves at least 4.5:1 against the canvas. `#64718A` is restricted to disabled-only states.
- **Candidate Badging:** Detections are published as `[UNCONFIRMED SATELLITE-CHANGE CANDIDATE]` with a neutral label and small muted indicator. Amber is never used as an alarm on every candidate row; amber is reserved exclusively for genuine attention states (such as cloud-obscured or incomplete observations).

---

## 2. Typography Scale

Use only the self-hosted font families (`@fontsource-variable/*`):

| Role | Family | Size | Weight | Line Height | Rules |
| --- | --- | --- | --- | --- | --- |
| **Hero H1** | Sora Variable | `clamp(36px, 4.2vw, 60px)` | 600 | 1.15 desktop / 1.20 mobile | Sentence case; `[text-wrap:balance]` |
| **H2** | Sora Variable | `clamp(28px, 3vw, 40px)` | 600 | 1.20 | Sentence case; `[text-wrap:balance]` |
| **H3** | Sora Variable | 20–24px | 600 | 1.25 | Sentence case |
| **Metric Numeral** | Sora Variable | `clamp(2rem, 3.5vw, 3rem)` | 600 | 1.10–1.15 | Tabular numerals |
| **Lead Body** | DM Sans Variable | 17–18px | 400 | 1.60–1.65 | Max 60–70ch; `[text-wrap:pretty]` |
| **Standard Body** | DM Sans Variable | 16px | 400 | 1.60 | `[text-wrap:pretty]` |
| **Navigation** | DM Sans Variable | 15px | 500 | 1.00 | Never monospace |
| **Buttons** | DM Sans Variable | 15px | 600 | 1.00 | Sentence case |
| **Dense Table** | DM Sans Variable | 14px | 400 | 1.40 | High contrast, tabular numerals |
| **Technical Data** | JetBrains Mono Variable | 12–13px | 500 | 1.40 | Coordinates, IDs, CRS, timestamps |

---

## 3. Navigation & Header

- **Fixed Height:** Exactly 64px (`h-16`).
- **Background:** Transparent over the space canvas; subtle `bg-ink-950/85 backdrop-blur-md` with `border-white/[0.08]` after scrolling.
- **Wordmark:** `Forest Guard` in Sora 600 with restrained line-art orbit mark.
- **Four Approved Links:**
  1. `Overview` (`/`)
  2. `Map` (`/explore`)
  3. `Investigations` (`/investigations`)
  4. `Methodology` (`/status`)
- **Active State:** Restrained 1.5px teal (`#3DFFB0`) underline.
- **Prohibited:** No `/about` link, no About page, no duplicate Explore/Map CTA button, no amber pill inside navigation.
- **Mobile Drawer:** Below 900px (`min-[900px]:hidden`), full-viewport drawer starting at `top-16`, Escape key dismissal, background scroll lock.

---

## 4. Shared Components (`@/components/ui`)

- **`<Button />`**:
  - `primary`: Teal `#3DFFB0`, dark text `#05060F`, 44–48px height, 10–12px radius, no coloured glow. Hover: subtle brightness change (`#5affc0`) and 2px arrow translation. Focus: 2px teal outline with 2px offset.
  - `secondary`: Glass outline `border-white/15 bg-white/[0.04] text-ice-100`.
  - `ghost`: Plain text link `text-ice-300 hover:text-white`.
- **`<Reveal />`**: Entrance motion (opacity + translateY), respects `prefers-reduced-motion: reduce`.
- **`<SectionHeading />`**: Eyebrow, H2, and optional lead/action layout.
- **`<Starfield />`**: Restrained procedural star canvas.
- **`<CountUp />`**: Tabular numeral counter with intersection observer.
- **`<StatusPill />`**: Used selectively for structured status codes (e.g., sector inventory table), not as decorative cards.
- **`<PageHero />`**: Sub-page header with fixed navbar clearance (`pt-24 pb-12 sm:pt-28 sm:pb-16`), breadcrumbs, eyebrow, H1, lead, and telemetry meta strip.

---

## 5. Architectural Non-Negotiables & Data Integrity

1. **Static Export:** Build target is pure static HTML/JS/CSS (`output: 'export'`) with GitHub Pages compatibility (`basePath: '/forest-guard'`). Zero server actions, runtime API routes, or external CDNs.
2. **Authoritative Counts:**
   - 1,479 total sectors in Maharashtra catalogue (15 × 15 km, EPSG:7755).
   - 5 pilot sectors assessed (4 processed, 1 cloud-obscured).
   - 3 parent sectors containing candidates (`MH-R01-C06`, `MH-R01-C10`, `MH-R07-C09`).
   - 20 live candidate records.
   - 390.86 km² monitored land area (0.13% of 307,492.71 km² GIS-derived state-boundary area).
3. **Epistemic Truth:** All detections remain `[UNCONFIRMED SATELLITE-CHANGE CANDIDATE]`. Genuine Sentinel-2 provenance does not independently establish deforestation cause or legality. Synthetic test fixtures are strictly excluded from public routes.
4. **Candidate Area Sum:** 73.97 ha is the arithmetic sum of 20 discrete component areas, not a dissolved spatial union. Never display aggregate candidate area as a statewide forest loss metric.
5. **Measurement Uncertainty:** Labeled as engineering perimeter-discretization estimate at 10 m GSD, never a 95% confidence interval.
6. **Public Records:** Citations are automated regional inquiries from public web search (PARIVESH, NHAI, regional gazettes). Never label a citation as a "Verified Clearance".
