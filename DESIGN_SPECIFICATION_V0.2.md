# Forest Guard — Design Specification v0.2

**Status:** Working draft for review. Not approved for implementation.  
**Purpose:** Convert the agreed art direction and repository audits into an evidence-backed UI/UX specification.  
**Implementation policy:** Antigravity/Gemini is an implementation tool. Product, architecture, design and acceptance decisions must be explicitly specified and approved first.

---

## 0. Product definition and non-negotiable constraints

Forest Guard is a high-precision Earth-observation observatory combined with an editorial scientific journal, for investigating potential changes in Maharashtra's forests using satellite observations, geospatial analysis and classical computer vision.

The product must feel scientific, precise, atmospheric and editorial—not like a generic AI dashboard.

### Product truths

- Current geographic scope: Maharashtra.
- Catalogue: 1,479 sectors across 36 districts, using the existing 15 × 15 km sector catalogue.
- Pilot assessment: 5 sectors assessed; 4 processed and 1 cloud-obscured/incomplete.
- Credited monitored land area: 390.86 km².
- State-boundary denominator: 307,492.71 km², GIS-derived state-boundary area. The displayed 0.13% must be labelled as a share of this GIS-derived state-boundary area—not terrestrial land area.
- Live records: 20 unconfirmed satellite-change candidate records across 3 parent sectors.
- Candidate parent sectors: MH-R01-C06, MH-R01-C10, MH-R07-C09.
- All detections remain `[UNCONFIRMED SATELLITE-CHANGE CANDIDATE]`.
- Genuine Sentinel-2 source imagery does not establish the cause or legality of a change.
- Scheduled statewide monitoring is disabled. A 21-day cycle is an engineering target, not an active statewide operational capability.
- Synthetic fixtures must never appear in live feeds or public candidate routes.

### Protected implementation boundaries

Do not change the Python detection pipeline, GIS source catalogue, Maharashtra boundary geometry, authoritative incidents/monitoring JSON contracts, candidate image-comparison mathematics, or GitHub Actions monitoring schedule as part of a UI-only redesign. Any proposed functional change requires separate approval.

Static export and GitHub Pages compatibility must remain intact. The application must not gain an application-backend/runtime API dependency or external font/JavaScript CDN. Legitimate external satellite imagery and map-tile sources remain permitted and must be attributed.

---

## 1. Shared visual system

### 1.1 Art direction

**An Earth-observation observatory meets an editorial scientific journal.** The experience balances a cinematic sense of planetary scale with precise, restrained evidence presentation.

### 1.2 Typography

Use only the existing self-hosted font families:

| Role | Family | Size | Weight | Line height | Rules |
|---|---|---:|---:|---:|---|
| Hero H1 | Sora Variable | `clamp(2.25rem, 4.2vw, 3.75rem)` | 600 | 1.15 desktop; 1.20 small screens | Sentence case; balanced wrapping |
| H2 | Sora Variable | `clamp(1.75rem, 3vw, 2.5rem)` | 600 | 1.20 | Balanced wrapping |
| H3 | Sora Variable | 20–24px | 600 | 1.25 | Sentence case |
| Metric numeral | Sora Variable | `clamp(2rem, 3.5vw, 3rem)` | 600 | 1.10–1.15 | Tabular numerals |
| Lead body | DM Sans Variable | 17–18px | 400 | 1.60–1.65 | Max 60–70ch; pretty wrapping |
| Standard body | DM Sans Variable | 16px | 400 | 1.60 | 14px allowed in dense tables only |
| Navigation | DM Sans Variable | 15px | 500 | 1.00 | Never monospace |
| Buttons | DM Sans Variable | 15px | 600 | 1.00 | Sentence case |
| Dense table | DM Sans Variable | 14px | 400 | 1.40 | High contrast, tabular numerals where useful |
| Technical telemetry | JetBrains Mono Variable | 12–13px | 500 | 1.40 | IDs, coordinates, timestamps, CRS and technical values only |

Use natural tracking, generally 0 to -0.02em for headings. Never combine extremely tight tracking with 1.0 line height. Use `text-wrap: balance` on headings and `text-wrap: pretty` on paragraphs. No external font CDN requests.

### 1.3 Colour tokens

Consolidate with the existing `tailwind.config.js` and `globals.css`; do not create a competing palette.

| Token | Proposed value | Usage |
|---|---|---|
| `--bg` | `#05060F` | Main deep-space background |
| `--bg-void` | `#03050B` | Deepest canvas/ambient depth |
| `--surface` | `#080E1B` | Primary surface |
| `--surface-2` | `#0B1324` | Elevated surface |
| `--text-primary` | `#F2F7FF` | Primary text |
| `--text-secondary` | `#A7B4CC` | Supporting text |
| `--text-tertiary` | `#8794AA` | Captions and secondary metadata; verify contrast in each context |
| `--text-disabled` | `#64718A` | Disabled-only treatment; never normal body/caption text on the dark canvas without a contrast check |
| `--accent` | `#3DFFB0` | Primary action, active state, Maharashtra boundary |
| `--warn` | `#FFB454` | Genuine warning/attention state only |
| `--atmosphere-aqua` | `#6FE3FF` | Background depth only, normally ≤10% opacity |
| `--atmosphere-indigo` | `#1D4ED8` | Background depth only, normally ≤10% opacity |
| `--border-subtle` | `rgba(255,255,255,0.08)` | Hairline dividers |
| `--border-strong` | `rgba(255,255,255,0.16)` | Stronger boundaries |
| `--focus-ring` | `#3DFFB0` | Keyboard focus |

Contrast must be computed from the final rendered foreground/background pair. Normal text requires at least 4.5:1; large text and relevant graphical controls require at least 3:1. The previous contrast table contained inaccurate ratios; do not copy those figures without recalculation.

### 1.4 Status colour semantics

- Candidate status appears as a neutral text label with a small muted indicator. It is not an amber warning: every live record is a candidate, so amber would lose meaning if used on every row.
- Amber is reserved for genuine attention states such as cloud-obscured/incomplete observations or an explicit warning.
- `StatusPill` may remain as a reusable component but must be used selectively for structured status values, not as decoration on every card or section.
- Full epistemic wording remains available: `[UNCONFIRMED SATELLITE-CHANGE CANDIDATE]`.

### 1.5 Layout and spacing

- Shared editorial container: `max-w-7xl` (1280px), centered, with responsive gutters.
- Full-bleed regions: homepage Earth hero and Explore map.
- Use the 8px spacing system: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128px.
- Use space and typography before adding containers. No nested cards and no default three-identical-card composition.
- Distinct page structures are mandatory; shared tokens do not mean identical layouts.

### 1.6 Navigation

- Fixed height: exactly 64px (`h-16`).
- Transparent over the space background; subtle blur/hairline only after scrolling.
- Wordmark: “Forest Guard”, Sora 600; plain wordmark or restrained line-art mark, no icon-in-rounded-square.
- Exactly four links: `Overview` (`/`), `Map` (`/explore`), `Investigations` (`/investigations`), `Methodology` (`/status`).
- Plain DM Sans 15px text links; active state is a restrained 1.5px teal underline or dot.
- No `/about` link, no separate duplicate Explore/Map CTA, no amber pilot pill in the navigation.
- Hamburger below 900px. Menu must support keyboard use, Escape dismissal, correct focus behaviour and background scroll handling.

### 1.7 Buttons, surfaces and icons

- Primary button: teal `#3DFFB0`, dark `#05060F` text, 44–48px height, 10–12px radius, 15px DM Sans 600. No glow. Hover: slight brightness change and 2–3px arrow movement. Focus: 2px outline with 2px offset.
- Secondary action: plain text link with arrow/animated underline or a faint translucent fill; no default heavy box.
- Tertiary action: text only.
- Cards/panels only where semantic grouping helps; subtle 1px border, 12–16px radius, restrained surface. No nested cards.
- Icons: existing Lucide set, consistent 1.5px stroke, 16px inline/20px major. No decorative icon tiles. No emoji in product UI.
- Touch targets: minimum 44 × 44px.

### 1.8 Motion and accessibility

- Hover transitions: 150–200ms.
- Entrance: opacity + 16–20px rise, 500–600ms, ease-out; stagger 60–80ms.
- Animate transform/opacity; no layout shifts, bouncy transitions or constant animation.
- `prefers-reduced-motion: reduce` disables/short-circuits animation and renders settled content.
- Visible focus ring: 2px teal outline, 2px offset.
- Semantic landmarks, labelled controls, keyboard operation, useful alt text and accessible table alternatives are required.
- Map must have an accessible sector-table fallback when WebGL is unavailable.

### 1.9 Prohibited visual patterns

No neon borders/shadows everywhere; icon-in-rounded-square feature grids; cookie-cutter three-card grids; monospace headings/buttons; badges on everything; all-caps mono body labels; purple/rainbow gradients; decorative gradient blobs; centred text blocks everywhere; text shadows; dashboard-card-inside-a-page appearance; unverified statistics; marketing hype; low-contrast tiny text.

---

## 2. Authoritative data inventory and display rules

### 2.1 Candidate records

The current audit enumerated these 20 live records and reported the following `affected_area_hectares` values. Values below are rounded to two decimals for display; authoritative raw values remain in JSON.

| # | Candidate ID suffix | Parent sector | District | Area (ha) | Perimeter estimate (ha) | Geometry |
|---:|---|---|---|---:|---:|---|
| 1 | `R07-C09-...-115` | `MH-R07-C09` | Kolhapur | 1.07 | 0.31 | linear_corridor |
| 2 | `R07-C09-...-32` | `MH-R07-C09` | Kolhapur | 1.71 | 0.27 | compact_block |
| 3 | `R01-C10-...-77` | `MH-R01-C10` | Kolhapur | 2.04 | 0.40 | irregular_patch |
| 4 | `R01-C10-...-76` | `MH-R01-C10` | Kolhapur | 3.23 | 0.70 | linear_corridor |
| 5 | `R01-C10-...-68` | `MH-R01-C10` | Kolhapur | 1.58 | 0.34 | linear_corridor |
| 6 | `R01-C10-...-59` | `MH-R01-C10` | Kolhapur | 1.05 | 0.24 | compact_block |
| 7 | `R01-C10-...-38` | `MH-R01-C10` | Kolhapur | 1.02 | 0.28 | irregular_patch |
| 8 | `R01-C10-...-32` | `MH-R01-C10` | Kolhapur | 1.14 | 0.30 | irregular_patch |
| 9 | `R01-C10-...-30` | `MH-R01-C10` | Kolhapur | 4.02 | 0.65 | irregular_patch |
| 10 | `R01-C10-...-27` | `MH-R01-C10` | Kolhapur | 5.10 | 0.76 | irregular_patch |
| 11 | `R01-C10-...-26` | `MH-R01-C10` | Kolhapur | 3.30 | 0.63 | irregular_patch |
| 12 | `R01-C10-...-23` | `MH-R01-C10` | Kolhapur | 3.04 | 0.54 | irregular_patch |
| 13 | `R01-C06-...-50` | `MH-R01-C06` | Sindhudurg | 29.75 | 3.05 | diffuse_noise |
| 14 | `R01-C06-...-49` | `MH-R01-C06` | Sindhudurg | 1.61 | 0.37 | linear_corridor |
| 15 | `R01-C06-...-48` | `MH-R01-C06` | Sindhudurg | 5.82 | 0.85 | linear_corridor |
| 16 | `R01-C06-...-47` | `MH-R01-C06` | Sindhudurg | 2.60 | 0.55 | linear_corridor |
| 17 | `R01-C06-...-37` | `MH-R01-C06` | Sindhudurg | 1.02 | 0.33 | irregular_patch |
| 18 | `R01-C06-...-32` | `MH-R01-C06` | Sindhudurg | 2.40 | 0.62 | linear_corridor |
| 19 | `R01-C06-...-03` | `MH-R01-C06` | Sindhudurg | 1.42 | 0.26 | compact_block |
| 20 | `R01-C06-...-01` | `MH-R01-C06` | Sindhudurg | 1.05 | 0.26 | irregular_patch |

Full incident IDs, exact coordinates and raw JSON values must always be read from the authoritative record; do not reconstruct IDs from these abbreviated display labels.

### 2.2 Authoritative counts and labels

These three counts must never be conflated:

| Metric | Value | UI meaning |
|---|---:|---|
| Pilot sectors assessed | 5 | Five sectors have assessment records |
| Sectors with candidates | 3 | Three sector polygons have `properties.s === 'candidate'` |
| Candidate records | 20 | Twenty individual candidate records in the live incidents array |

Explore polygon filter labels must be `All sectors (1,479)` and `Sectors with candidates (3)`. A nearby explanatory label may say `20 unconfirmed candidate detections across 3 parent sectors`.

### 2.3 Candidate-area aggregation

- The arithmetic sum of all 20 `affected_area_hectares` values is 73.968 ha, displayed as 73.97 ha.
- Two pairs of **bounding boxes** intersect. This does not prove that the actual candidate geometries overlap; the source stores bounding boxes, not dissolved precise footprint polygons.
- Records are independent connected morphological components, but no dissolved spatial union has been computed.
- Do not display 73.97 ha as “forest loss”, “total cleared area” or an unqualified unique footprint.
- Default decision: omit aggregate candidate area from homepage hero/statistics. If used in the investigations archive, label it exactly as `73.97 ha arithmetic sum of per-record candidate component areas; not a dissolved spatial union` and explain the limitation.

### 2.4 Candidate field/source mapping

| UI field | Source / field | Status and rule |
|---|---|---|
| Incident ID | `incidents.json` → `incident_id` | Present; use exact value |
| Parent sector | Parse canonical sector token from incident ID or validated report field | Derived; verify regex and source |
| District | Sector GeoJSON join (`feature.properties.d`) / validated report title | Derived; do not invent from coordinates |
| Coordinates | `geographic_coordinates: [lon, lat]` | Present; preserve longitude/latitude order |
| Bounding box | `geographic_bounding_box` | Present; draw as a box, never label as exact detected contour |
| Area | `affected_area_hectares` | Present; per-record measured component estimate |
| Perimeter estimate | `measurement_uncertainty_hectares` | Present but engineering discretization estimate, not statistical CI |
| Geometry | `visual_geometry` | Present; preserve enum values/approved display labels |
| Status | `investigation_status` | Present; all live candidates are unconfirmed |
| Synthetic flag | `is_synthetic_test` | Present; must be false for public live feed |
| Scene IDs | `source_scene_ids` | Present; display exact IDs |
| Dates | `observation_dates` | Present but contains known mismatch for ten `MH-R01-C10` records; do not blindly display until reconciled with scene metadata |
| Before/after/overlay images | `web/public/data/artifacts/{incident_id}/before.png`, `after.png`, `overlay.png` | 60 files exist and pass PNG header/readability checks; visual/source content still needs browser/imagery provenance review |
| Citations | Report `citations` array | Present as contextual automated public-record search results; not permit/clearance verification |
| Decision trace | Report `decision_trace` | Present where available; verify per record and render only actual entries |
| Tree count | `tree_count_estimate.is_supported === false` | Unsupported for all 20; state that tree counts are not estimated |
| FSI classification | No per-candidate VDF/MDF/OF field | Exclude; only sector-level forest-priority boolean exists |
| ROI cloud percentage | No field | Exclude; tile-level occlusion is not ROI-specific cloud percentage |
| Elevation/settlement distance | No structured source | Exclude |
| GeoTIFF export | No GeoTIFF assets/export pipeline | Exclude |

### 2.5 Scene-date discrepancy

Ten records in `MH-R01-C10` have `observation_dates` beginning `2026-10-10`, while their first `source_scene_ids` encode `2026-10-20`; the second date is `2026-10-25` in both.

The audit's explanation is that `2026-10-10` is the search-window start, while the actual selected scene is 20 October. However, before changing or overriding the authoritative date field, validate the acquisition dates against the underlying STAC item/product metadata or ingestion manifest. Until confirmed, do not show the contradictory `2026-10-10` as an actual image acquisition date. Exact scene IDs can be shown; the date label must be sourced from validated acquisition metadata.

### 2.6 Uncertainty terminology

The reported calculation is:

`boundary_uncertainty_px = perimeter_px × 0.5`

`uncertainty_ha = (boundary_uncertainty_px × pixel_area_m2) / 10,000`

The audit reports `pixel_area_m2 = 100` (10 m × 10 m pixel). This is a perimeter-based half-pixel raster-boundary discretization estimate, not a calibrated statistical confidence interval.

Approved display language:

`Area: 1.07 ha · estimated perimeter-discretization allowance: ±0.31 ha (10 m GSD; engineering estimate, not a statistical confidence interval)`

Do not call it a confidence interval, confidence level or probability range.

### 2.7 Public records/citations terminology

Rename this section to `Contextual Public Records & Regional Inquiries`.

Required explanation:

`Automated public-record search results provide regional context. They do not confirm incident-specific statutory clearance, permit status or ground-truth legality.`

No “clearance verified”, “no clearance exists” or legal conclusion based only on search snippets or absence of a result.

### 2.8 Asset performance

The 60 PNG assets total approximately 236.53 MB. Individual images are large (roughly 2.4–4.4 MB each) and one sector group has portrait crops (880 × 1586 px) while others are square (1579–1589 px).

Requirements:
- Do not eagerly load all 60 files on feed or homepage.
- Feed/home preview images must be lazy-loaded and served as appropriately sized preview assets.
- Dossier full-resolution evidence loads only on the individual dossier route or when requested.
- Load `overlay.png` only when its layer is selected or the user opens that view.
- Preserve aspect ratios; use `object-fit: contain` or equivalent where full evidence must remain visible. Never silently crop evidence.
- Before implementing derived thumbnails, inspect available local image tooling and establish a reproducible method without adding an npm dependency unless separately approved.
- Record preview dimensions, formats and byte sizes; set a measured page image-payload budget before claiming performance improvement.
- File-level PNG validation is not proof that the visual image content matches the labelled scene. Browser/visual and source-provenance checks remain separate gates.

---

## 3. Page specifications and wireframes

## 3.1 Home — Editorial Observatory (`/`)

### Primary focus and reading order

1. Earth and Maharashtra boundary.
2. One clear mission headline and concise supporting sentence.
3. Primary action and secondary text link.
4. Discreet staged-pilot notice.
5. Three JSON-backed statistics.
6. Recent candidate previews.
7. Observe → Detect → Investigate explanation.
8. Attribution/footer.

### Desktop wireframe (≥1100px)

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Forest Guard      Overview   Map   Investigations   Methodology      (64px) │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  EDITORIAL COPY (≈45%)                         EARTH / GLOBE (≈55%)           │
│  Earth observation · Maharashtra                 NASA GIBS Blue Marble       │
│                                                                              │
│  See what's changing in                         Visible Earth texture        │
│  Maharashtra's forests.                         + teal Maharashtra outline  │
│                                                                              │
│  Comparing satellite observations across                                    │
│  selected Maharashtra sectors to identify                                  │
│  potential forest changes and investigate                                   │
│  the evidence.                                                               │
│                                                                              │
│  [Explore Maharashtra →]  View investigations →                             │
│                                                                              │
│  · Staged pilot: 5 of 1,479 sectors assessed.                                │
│    All detections are unconfirmed candidates.                               │
│                                                                              │
│                                      19.300° N · 76.800° E · zoom 3.85        │
├──────────────────────────────────────────────────────────────────────────────┤
│  1,479 sectors        │ 5 pilot sectors       │ 390.86 km² monitored land    │
│  36 districts         │ 4 processed · 1 cloud │ 0.13% of GIS-derived         │
│                       │                       │ state-boundary area           │
├──────────────────────────────────────────────────────────────────────────────┤
│  RECENT UNCONFIRMED CANDIDATES                         View investigations → │
│  [Evidence preview]     [Evidence preview]       [Evidence preview]          │
│  ID · district · area  ID · district · area    ID · district · area         │
├──────────────────────────────────────────────────────────────────────────────┤
│  OBSERVE  →  DETECT  →  INVESTIGATE                                         │
│  Short factual explanation, no operational overclaim.                       │
├──────────────────────────────────────────────────────────────────────────────┤
│  Attribution and restrained footer                                           │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Mobile wireframe (390px)

```text
┌──────────────────────────────────────┐
│ Forest Guard                     [≡] │ 64px
├──────────────────────────────────────┤
│                                      │
│          EARTH / GLOBE               │ ≈38–42svh
│    actual texture + state outline    │
│                                      │
│  19.300° N · 76.800° E · zoom 3.85   │
├──────────────────────────────────────┤
│ Earth observation · Maharashtra     │
│                                      │
│ See what's changing in               │
│ Maharashtra's forests.               │
│                                      │
│ Short supporting copy.               │
│                                      │
│ [ Explore Maharashtra → ]            │ 48px
│ View investigations →                │
│                                      │
│ · Staged pilot: 5 of 1,479 assessed. │
├──────────────────────────────────────┤
│ 1,479 sectors                        │
│ 36 districts                         │
│ ──────────────────────────────────── │
│ 5 pilot sectors assessed             │
│ 4 processed · 1 cloud-obscured       │
│ ──────────────────────────────────── │
│ 390.86 km² monitored land area       │
│ 0.13% of GIS-derived state boundary  │
├──────────────────────────────────────┤
│ Recent candidate previews            │
│ Evidence-led stacked rows            │
└──────────────────────────────────────┘
```

### Layout/interaction rules

- Desktop ≥1100px: 45/55 editorial split; full-bleed globe with no enclosing rounded card.
- Below 1100px: stack globe above copy; globe target 38–42svh. Do not overlay text on the sphere.
- Hero target around 88svh, subject to existing min/max sizing and actual content fit.
- Primary CTA is visible without scrolling at the agreed mobile acceptance size (390 × 667); separately verify 375 × 667.
- Hero camera target is approximately `[76.8, 19.3]`, zoom 3.85, but only claim settled state after actual camera completion.
- NASA GIBS Blue Marble must be credited as August 2004 context background, not contemporary satellite observation.
- Keep Skip/Replay low-emphasis and accessible. Respect reduced motion.
- Statistics: 1,479 sectors; 5 assessed sectors; 390.86 km² monitored land area. Do not substitute 20 candidates or 3 parent sectors for 5 assessed sectors.
- Candidate cards use exact JSON fields and verified image assets; no hardcoded example measurements.
- Do not display 73.97 ha in the home statistics.

### Required states

- Initial loading: calm atmospheric placeholder; never present a blank dark sphere as a successful loaded globe.
- Globe rendered: actual Blue Marble texture visible and state boundary visible.
- Partial imagery/tile failure: preserve layout, identify unavailable imagery; do not silently show blank canvas.
- WebGL failure: explicit fallback state, explain that interactive globe is unavailable, provide a working route to the Explore/table alternative. A 2D boundary alone must not be described as a rendered Earth.
- Statistics data unavailable: use only approved build-time static fallback and label it appropriately; do not invent values.
- Zero candidate records: factual empty state, no fake previews.
- Reduced motion: directly show settled camera state.

### Acceptance checks

- Capture fresh intro, post-fly-in and returning-session states only after relevant map sources/tiles have rendered and animations have finished.
- Verify visible texture pixels and visible Maharashtra boundary in the raster screenshot; camera telemetry alone is insufficient.
- Verify actual fonts from computed styles.
- No heading/CTA overlap or horizontal overflow.

---

## 3.2 Explore — Geospatial Workstation (`/explore`)

### Primary focus and reading order

1. Full-screen MapLibre canvas and Maharashtra sector geometry.
2. Search and sector filters.
3. Selected-sector inspector when a polygon is selected.
4. Map attribution/basemap controls and coordinate readout.
5. Accessible sector table alternative.

### Desktop wireframe (≥1100px)

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Forest Guard      Overview   Map   Investigations   Methodology      (64px) │
├──────────────────────────────────────────────────────────────────────────────┤
│ [Search sector/district] [All sectors (1,479)] [Sectors with candidates (3)] │
│                                                                              │
│                                                                              │
│                         MAPLIBRE CANVAS                                     │
│                 1,479 sectors · candidate markers                           │
│                                                                              │
│                                               ┌───────────────────────────┐  │
│                                               │ Selected sector           │  │
│                                               │ Sector ID / district       │  │
│                                               │ Assessment status          │  │
│                                               │ Monitored area if present  │  │
│                                               │ Candidate records (if any)│  │
│                                               │ [Open dossier →]           │  │
│                                               └───────────────────────────┘  │
│                                                                              │
│ [Basemap control]                                  [lat · lon] [Table mode]  │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Mobile wireframe (390px)

```text
┌──────────────────────────────────────┐
│ Forest Guard                     [≡] │
├──────────────────────────────────────┤
│ [Search sector or district         ] │
│ [All 1,479] [Candidate sectors 3]    │
├──────────────────────────────────────┤
│                                      │
│          FULL-HEIGHT MAP             │
│                                      │
│                              [+] [-] │
│                                      │
├──────────────────────────────────────┤
│ SELECTED SECTOR BOTTOM SHEET         │
│ Sector ID · district                 │
│ Status · monitored area              │
│ Candidate records                    │
│ [Open dossier →]                     │
└──────────────────────────────────────┘
```

### Data and labels

- Sector polygons: existing 1,479-feature GeoJSON catalogue.
- Sector filter: `All sectors (1,479)` and `Sectors with candidates (3)`; it filters sector polygons using `properties.s === 'candidate'`.
- Candidate markers: 20 candidate detections across 3 parent sectors. Do not label the polygon filter `Candidates (5)`.
- Coordinates: `geographic_coordinates` in `[longitude, latitude]` order.
- Candidate extents: `geographic_bounding_box`; label as an extent/bounding box, not exact candidate contour.
- Sector status: existing `resolveSectorStatus()` logic.
- No 3D terrain/elevation or settlement distance; no data support.

### Interaction rules

- Search matches sector ID or district and moves map to the matched sector.
- Selecting a sector opens the existing inspector and highlights the polygon.
- Inspector includes only actual sector fields and linked candidate records.
- Basemap switcher uses existing supported sources; attribution remains visible.
- Accessible table mode must expose all 1,479 sectors with keyboard sorting and pagination.
- Mobile inspector uses a bottom sheet only if implemented accessibly; must have explicit close/collapse behaviour and must not trap map interaction unexpectedly.
- Controls must be below the 64px fixed nav and remain clickable.
- Avoid double-applying navbar offset. Establish one owner for the vertical layout calculation; call `map.resize()` when container dimensions change.

### Required states

- Map/source loading.
- Fully loaded map with no selected sector.
- Selected sector and inspector open.
- No search match.
- No sectors after filter.
- GeoJSON fetch failure: visible user-facing error, not an empty-looking map with no explanation.
- Tile/basemap failure: show a source error and allow switching to an available basemap where possible.
- WebGL unavailable: accessible sector table fallback.
- Monitoring state unavailable: continue to show catalogue geometry but clearly mark unavailable status data; do not infer “no change”.

### Acceptance checks

- Full map viewport below 64px nav, no vertical window scrollbar caused by offset duplication.
- Search/filter controls visible and clickable.
- Polygon selection and drawer/table keyboard access work.
- Filter counts match 1,479 sectors, 3 candidate sectors and 20 records distinctly.
- WebGL fallback remains usable.

---

## 3.3 Investigations — Evidence Ledger (`/investigations`)

### Primary focus and reading order

1. Page title and factual summary.
2. Search/filters/sort/view controls.
3. Candidate evidence list/grid.
4. Interpretation/limitations notes.

### Desktop wireframe (≥1100px)

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Forest Guard      Overview   Map   Investigations   Methodology      (64px) │
├──────────────────────────────────────────────────────────────────────────────┤
│ PAGE HERO — Evidence archive                                                │
│ Candidate investigations                                                    │
│ 20 unconfirmed candidate records across 3 parent sectors.                   │
│ 5 of 1,479 sectors assessed in the staged pilot.                            │
├──────────────────────────────────────────────────────────────────────────────┤
│ [Search ID/district/sector] [Sector] [Geometry] [Area] [Sort] [Grid | List] │
├──────────────────────────────────────────────────────────────────────────────┤
│ CANDIDATE EVIDENCE LEDGER                                                   │
│                                                                              │
│ [Evidence image]          [Evidence image]          [Evidence image]         │
│ Unconfirmed candidate     Unconfirmed candidate     Unconfirmed candidate    │
│ Exact incident ID         Exact incident ID         Exact incident ID        │
│ District · parent sector  District · parent sector  District · parent sector│
│ Area · perimeter estimate Area · perimeter estimate Area · perimeter estimate│
│ Observation pair*         Observation pair*         Observation pair*        │
│ [Inspect dossier →]       [Inspect dossier →]       [Inspect dossier →]      │
│                                                                              │
│ *Show acquisition dates only after scene/date discrepancy is resolved.      │
├──────────────────────────────────────────────────────────────────────────────┤
│ INTERPRETATION NOTES — plain columns separated by hairlines                 │
│ Unconfirmed by design | Staged pilot coverage | Sentinel-2 observation data │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Mobile wireframe (390px)

```text
┌──────────────────────────────────────┐
│ Forest Guard                     [≡] │
├──────────────────────────────────────┤
│ Candidate investigations             │
│ 20 unconfirmed records · 3 sectors   │
│ 5 of 1,479 sectors assessed          │
├──────────────────────────────────────┤
│ [Search candidates                  ]│
│ [Filters] [Sort] [Grid/List]         │
├──────────────────────────────────────┤
│ [Evidence preview]                   │
│ Unconfirmed satellite-change candidate│
│ Exact ID                             │
│ District · Sector                    │
│ Area · perimeter estimate            │
│ [Open dossier →]                     │
├──────────────────────────────────────┤
│ [Next candidate row]                 │
└──────────────────────────────────────┘
```

### Data and interaction rules

- Count: 20 records, dynamically derived from non-synthetic live incidents.
- Parent-sector count: 3, separate from the 5 assessed sectors.
- Search: incident ID, district, sector, geometry and supported summary text.
- Filters: parent sector, geometry classification and area range, with combinable state.
- Sorting: measured area, validated observation date, heuristic score only if its meaning is disclosed, and ID.
- Grid/list view retained.
- Modal deep-link/hash and Escape dismissal retained; modal must stack above navbar and restore focus on close.
- Every candidate remains labelled `[UNCONFIRMED SATELLITE-CHANGE CANDIDATE]`, using neutral treatment, not repeated amber warning pills.
- Do not show 73.97 ha as an unqualified unique area or forest-loss metric. Default: omit aggregate area from the hero. If shown in a detailed archive, use the full qualified arithmetic-sum wording.
- Candidate preview thumbnails must be derived/optimized and lazy-loaded; do not download all 60 large PNGs on initial page load.

### Required states

- Loading skeleton.
- Loaded candidate feed.
- Zero records from source.
- Search/filter no results with reset action.
- Fetch error with retry.
- Partial candidate metadata.
- Missing thumbnail with a meaningful satellite-evidence placeholder.
- Modal open/close, keyboard dismissal and focus restoration.

### Acceptance checks

- Search, combined filters, sorting and grid/list modes produce correct results.
- Counts distinguish 20 records, 3 parent sectors and 5 assessed sectors.
- Synthetic fixtures never enter the feed.
- Image loading is lazy and performance budget is measured.
- Modal works with keyboard and does not conflict with nav stacking.

---

## 3.4 Dossiers — Scientific Investigation Report (`/investigations/[id]`)

### Primary focus and reading order

1. Breadcrumbs and exact candidate ID.
2. Neutral unconfirmed-candidate status label.
3. Candidate summary: sector, district, coordinates, measured area and engineering estimate.
4. Large before/after comparison.
5. Optional connected-component overlay toggle.
6. Satellite observations and provenance.
7. Decision trace and unresolved questions.
8. Contextual public records and regional inquiries.

### Desktop wireframe (≥1100px)

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Forest Guard      Overview   Map   Investigations   Methodology      (64px) │
├──────────────────────────────────────────────────────────────────────────────┤
│ Overview / Investigations / [Exact candidate ID]         [Back] [View map] │
│                                                                              │
│ UNCONFIRMED SATELLITE-CHANGE CANDIDATE                                       │
│ Exact incident ID                                                            │
│ Parent sector · district · geometry classification                         │
│ Coordinates · measured area · engineering perimeter estimate                │
├──────────────────────────────────────────────────────────────────────────────┤
│ SATELLITE OBSERVATION COMPARISON                                             │
│ ┌──────────────────────────────────────────────────────────────────────────┐ │
│ │ BEFORE IMAGE                   | slider | AFTER IMAGE                    │ │
│ │ source scene/date              |        | source scene/date               │ │
│ └──────────────────────────────────────────────────────────────────────────┘ │
│ [Toggle connected-component mask overlay]                                   │
│                                                                              │
│ EVIDENCE & OBSERVATIONS                 INVESTIGATION CONTEXT                │
│ • Scene IDs                            • Contextual public records           │
│ • Validated acquisition dates          • What those records do/do not prove  │
│ • Source/product identifiers           • Unresolved questions                 │
│ • Image processing details             • No legal conclusion                 │
│ • Decision trace                       • Tree-count estimate unsupported     │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Mobile wireframe (390px)

```text
┌──────────────────────────────────────┐
│ Forest Guard                     [≡] │
├──────────────────────────────────────┤
│ ← Back to Investigations             │
│                                      │
│ UNCONFIRMED CANDIDATE                │
│ Exact incident ID                    │
│ Sector · district                    │
│ Area · estimate · coordinates        │
├──────────────────────────────────────┤
│ BEFORE / AFTER COMPARISON            │
│ [Full-width responsive slider]       │
│ [Toggle mask overlay]                │
├──────────────────────────────────────┤
│ SATELLITE OBSERVATIONS               │
│ Scene IDs · validated dates          │
│ Provenance · processing method       │
├──────────────────────────────────────┤
│ INVESTIGATION TRACE                  │
│ Actual decision-trace entries        │
├──────────────────────────────────────┤
│ CONTEXTUAL PUBLIC RECORDS            │
│ Search references + explicit caveat  │
├──────────────────────────────────────┤
│ UNRESOLVED QUESTIONS                 │
│ Tree count: unsupported              │
└──────────────────────────────────────┘
```

### Data and interaction rules

- Before/after slider uses existing `before.png` and `after.png`, preserving aspect ratio and full evidence. Some crops are portrait (880 × 1586); others square (1579–1589px). Do not force a common crop that removes evidence.
- Overlay toggle uses existing `overlay.png`, described as a connected-component/change-mask overlay—not a continuous spectral-difference raster.
- Display exact `source_scene_ids`.
- Acquisition-date display for the 10 `MH-R01-C10` candidates is pending STAC/ingestion-manifest reconciliation; never silently show the incorrect 10 October date as the actual scene acquisition date.
- Display `affected_area_hectares` per record.
- Display uncertainty only as a perimeter-based half-pixel discretization estimate at 10 m GSD, not statistical confidence.
- Display `[UNCONFIRMED SATELLITE-CHANGE CANDIDATE]` on every dossier presentation layer.
- Display actual `decision_trace` entries only when present.
- Citation heading: `Contextual Public Records & Regional Inquiries`. Include: `Automated public-record search results provide regional context. They do not confirm incident-specific statutory clearance, permit status or ground-truth legality.`
- Tree counts: `Tree-count estimation omitted because the method is unsupported.`
- No terrain elevation, nearest settlement distance, per-candidate FSI VDF/MDF/OF class, ROI cloud percentage or GeoTIFF export action.
- A PNG download action may be included only if a working existing download route is verified; otherwise do not invent a button.
- Synthetic/unknown IDs return 404.

### Required states

- Static dossier loaded.
- Missing report JSON but incident summary available: show supported fields and clearly state report details are unavailable.
- Missing before or after crop: show explicit missing-evidence panel; never mirror one image and imply a pair.
- Missing overlay: disable toggle or show unavailable explanation.
- Invalid/synthetic ID: 404.
- Partial provenance/date mismatch: label unresolved; do not silently choose a date.
- Loading image state and image decode error.
- Slider supports pointer, touch, keyboard and visible focus.

### Acceptance checks

- Full before/after imagery visible at square and portrait aspect ratios.
- Slider works by pointer, touch and keyboard.
- Overlay toggle changes to the actual overlay asset.
- All values map to record/report fields.
- No unsupported claims/actions appear.
- Breadcrumbs clear 64px fixed navbar.

---

## 3.5 Status & Methodology — Technical Journal (`/status`)

### Primary focus and reading order

1. Full-bleed technical hero and concise statement of current pilot status.
2. Operational coverage metrics.
3. Searchable 1,479-sector inventory.
4. Seven-stage OpenCV pipeline explanation.
5. Safeguards and caveats.
6. Sources, licences and CRS mathematics.

### Desktop wireframe (≥1100px)

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Forest Guard      Overview   Map   Investigations   Methodology      (64px) │
├──────────────────────────────────────────────────────────────────────────────┤
│ FULL-BLEED TECHNICAL HERO                                                    │
│ Methodology & status                                                        │
│ How Forest Guard processes satellite observations                           │
│ Concise factual explanation; no statewide automation claim.                 │
│ Last recorded run (if present) · 5 of 1,479 assessed · 21-day target         │
│ Jump links: Metrics · Inventory · Pipeline · Safeguards · Sources            │
├──────────────────────────────────────────────────────────────────────────────┤
│ OPERATIONAL TELEMETRY                                                       │
│ 5 assessed · 4 processed · 1 incomplete                                     │
│ 390.86 km² monitored land · 0.13% of GIS-derived state-boundary area        │
├──────────────────────────────────────────────────────────────────────────────┤
│ 1,479-SECTOR INVENTORY                                                      │
│ [Search] [Status filters] [Sort] [Pagination]                               │
│ ID | District | Region | Area | Status | Observation                         │
├──────────────────────────────────────────────────────────────────────────────┤
│ SEVEN-STAGE OPENCV PIPELINE — connected flow, not seven cards               │
│ Ingest → Align → Mask → Compare → Morphology → Geometry → Dossier           │
│ Expand a stage for verified implementation detail                           │
├──────────────────────────────────────────────────────────────────────────────┤
│ SAFEGUARDS & LIMITATIONS — narrative columns and hairlines                  │
├──────────────────────────────────────────────────────────────────────────────┤
│ SOURCES, LICENCES & CRS MATHEMATICS                                         │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Mobile wireframe (390px)

```text
┌──────────────────────────────────────┐
│ Forest Guard                     [≡] │
├──────────────────────────────────────┤
│ Methodology & status                 │
│ How Forest Guard works               │
│ Factual pilot explanation            │
├──────────────────────────────────────┤
│ 5 / 1,479 sectors assessed            │
│ 390.86 km² monitored land             │
│ 0.13% state-boundary area             │
├──────────────────────────────────────┤
│ SECTOR INVENTORY                     │
│ Search and filters                   │
│ Responsive accessible table/list     │
├──────────────────────────────────────┤
│ SEVEN-STAGE PIPELINE                 │
│ 01. Ingest                            │
│ 02. Align                             │
│ 03. Cloud/shadow mask                 │
│ 04. Compare                           │
│ 05. Morphological cleanup             │
│ 06. Geometry filtering                │
│ 07. Candidate dossier                 │
├──────────────────────────────────────┤
│ SAFEGUARDS                           │
│ SOURCES AND LICENCES                 │
└──────────────────────────────────────┘
```

### Data and interaction rules

- The 5 assessed sectors come from `monitoring_state.json` tile keys.
- 4 processed; 1 cloud-obscured/incomplete.
- 390.86 km² is monitored/credited land area; 0.13% denominator is 307,492.71 km² GIS-derived state-boundary area.
- Inventory uses the full 1,479-sector GeoJSON and existing `resolveSectorStatus()` logic.
- Table remains sortable, paginated and filterable; 25 rows per page unless current implementation requires otherwise.
- Pipeline steps use only implementation details verified against code. Do not present unverified thresholds as operational facts.
- 21-day cycle is an engineering target, not active statewide scheduling.
- Absence of a record is not absence of forest loss.
- Preserve sources/licences and precise attribution. Distinguish NASA Blue Marble 2004 context background from Sentinel-2 observations.
- Ensure anchor offsets account for the fixed 64px nav (e.g. scroll margin/padding); do not add conflicting nested offsets.

### Required states

- Initial data loading/skeleton.
- Full telemetry and sector inventory.
- Partial monitoring state, with missing values labelled unavailable rather than zero unless zero is the actual contract value.
- No inventory results after filtering, with reset action.
- Monitoring contracts unavailable: visible page-level error and retry/recovery action.
- Static catalogue available but monitoring JSON unavailable: retain catalogue and explicitly mark status unavailable.
- Stale data: display source timestamp/date and label stale if determined by a documented rule.

### Acceptance checks

- Status hero truly full-bleed, outside the constrained content wrapper.
- Metrics match source JSON and denominator label.
- All 1,479 sectors accessible through table and controls.
- Pipeline details match verified Python implementation.
- Anchor links land below fixed nav.
- Failure and partial-data states are visible and honest.

---

## 4. Cross-page interaction and state requirements

Every route must define and visually implement, where applicable:

- Loading.
- Loaded/default.
- Empty source data.
- Error with recovery guidance.
- Partial data.
- Missing/broken imagery.
- Zero search/filter results.
- Keyboard/focus state.
- Reduced-motion state.
- WebGL failure for globe/map routes.

Specific gaps identified in the current audit:

- Explore currently lacks a user-facing error if sector GeoJSON fails to fetch.
- Status currently lacks a user-facing alert/retry state if all data contracts fail.
- Home fallback must not present an empty dark sphere as successful rendering.
- Dossier should distinguish report fallback from missing satellite image assets.

### Shared accessibility requirements

- 44 × 44px minimum interactive targets.
- 2px focus outline and 2px offset.
- Keyboard-operable menus, modal, slider, filters and table.
- Modal Escape dismissal, focus trap where appropriate, and focus restoration.
- Map has an accessible table alternative and keyboard-readable sector data.
- Meaningful image alt text; decorative atmosphere is hidden from assistive technology.
- Reduced motion tested at runtime, not only inferred from code.

---

## 5. Performance and visual verification

### Image loading

The current 60 PNG assets total approximately 236.53 MB. Do not load all of them on feed/home.

- Generate or serve lightweight preview assets using already-available tooling only after checking it exists.
- Feed/home thumbnails: lazy-load below-fold assets and use appropriately sized previews.
- Full-resolution PNGs: load on the dossier route only.
- Overlay PNG: load only when selected/requested.
- Preserve image aspect ratio and avoid forced crops.
- Record real dimensions, format, byte size and page image payload in QA.

### Screenshot matrix

Homepage:
- 1600×780
- 1440×900
- 1366×768
- 1024×768
- 768×1024
- 390×667
- Overflow check: 375×667

All five routes:
- Representative desktop 1440×900.
- Representative mobile 390×667.
- Extra states where interactions materially differ (modal, selected map sector, empty/error, slider).

The globe screenshots must wait for MapLibre load, relevant source/tile render and camera completion. Visual acceptance requires actual visible Earth imagery and Maharashtra boundary in the raster screenshot; correct HUD coordinates alone are not proof.

### Browser verification

Measure actual computed:
- `font-family`
- `font-size`
- `font-weight`
- `line-height`
- `letter-spacing`

Inspect actual rendered contrast and pixel evidence. Check network requests for unexpected font/JS CDNs; allow documented satellite imagery and tile services. Report all failed/hung tests and anything not verified. Never delete/weaken tests to obtain a pass.

---

## 6. Explicitly excluded features until separately approved

- GeoTIFF export.
- 3D terrain/elevation or slope visualization.
- Nearby settlement distance.
- Per-candidate FSI VDF/MDF/OF classification.
- ROI-specific cloud-cover percentage.
- Tree-count impact estimates.
- Incident-specific legal clearance/permit verification.
- Continuous spectral-difference raster visualization (only connected-component mask overlay currently exists).
- Exact candidate contour polygon (current map uses bounding boxes).

---

## 7. Unresolved data/technical questions before final sign-off

1. **Scene date discrepancy:** Ten `MH-R01-C10` records store `observation_dates` beginning 2026-10-10 while scene IDs encode 2026-10-20. Confirm actual acquisition date from STAC item/product metadata or ingestion manifest before displaying pair dates or changing the authoritative contract.
2. **Candidate aggregate:** 73.968 ha is the arithmetic sum of all per-record areas. Two bounding-box pairs intersect; this is not a dissolved union and bounding-box intersections do not prove actual polygon intersections. Default is to omit aggregate candidate area from the homepage.
3. **Uncertainty semantics:** Confirm detector implementation and 10 m pixel area source; label as engineering perimeter-discretization estimate, never confidence interval.
4. **PNG visual provenance:** 60 files pass file/readability checks, but pixel-level visual content and source-pair correspondence still need runtime inspection.
5. **Asset performance:** Establish reproducible preview generation and a measurable payload budget without introducing dependencies unless approved.
6. **Explore counts:** Current filter selects 3 candidate sector polygons, while there are 20 candidate records and 5 assessed sectors. UI labels must preserve the distinction.
7. **Status pipeline thresholds:** Verify thresholds against current Python source and tests before exposing as factual methodology.

---

## 8. Implementation governance

- ChatGPT + user: product requirements, architecture, exact design decisions and acceptance criteria.
- Claude (optional): design critique and visual consultation; suggestions are reviewed, not automatically accepted.
- Antigravity/Gemini: implementation only, using exact file paths, values, states and tests supplied by the approved specification.

No vague implementation requests such as “make it modern”, “make it premium” or “improve the UX”. Use explicit measurements, layouts, component behaviour and acceptance criteria.

No implementation begins until this specification is reviewed, open questions are resolved or explicitly marked as blocked, and the user gives approval.

No commits, pushes, deployments or monitoring activation without explicit user approval.

## Appendix A — Full candidate inventory from the read-only audit

The table below preserves the exact incident IDs, coordinates, per-record area values and scene identifiers reported by the read-only audit. The `MH-R01-C10` observation-date mismatch is intentionally retained as a flagged discrepancy; do not treat its stored first `observation_dates` value as a validated acquisition date.

| # | Full incident ID | Parent sector / district | Coordinates `[lon, lat]` | Stored observation_dates | source_scene_ids | Area ha | Estimate ha | Geometry |
|---:|---|---|---|---|---|---:|---:|---|
| 1 | `INC-MH-R07-C09-20261026-115` | MH-R07-C09 / Kolhapur | `[74.13857, 16.4924]` | 2026-10-20 → 2026-10-25 | `S2C_43QCU_20261020_0_L2A`; `S2B_43QCU_20261025_0_L2A` | 1.067 | 0.309 | linear_corridor |
| 2 | `INC-MH-R07-C09-20261026-32` | MH-R07-C09 / Kolhapur | `[74.2072, 16.5921]` | 2026-10-20 → 2026-10-25 | `S2C_43QCU_20261020_0_L2A`; `S2B_43QCU_20261025_0_L2A` | 1.707 | 0.270 | compact_block |
| 3 | `INC-MH-R01-C10-20261026-77` | MH-R01-C10 / Kolhapur | `[74.2553, 15.7894]` | **2026-10-10 → 2026-10-25 (mismatch)** | `S2C_43PCT_20261020_0_L2A`; `S2B_43PCT_20261025_0_L2A` | 2.038 | 0.400 | irregular_patch |
| 4 | `INC-MH-R01-C10-20261026-76` | MH-R01-C10 / Kolhapur | `[74.2518, 15.7892]` | **2026-10-10 → 2026-10-25 (mismatch)** | `S2C_43PCT_20261020_0_L2A`; `S2B_43PCT_20261025_0_L2A` | 3.234 | 0.700 | linear_corridor |
| 5 | `INC-MH-R01-C10-20261026-68` | MH-R01-C10 / Kolhapur | `[74.2605, 15.7922]` | **2026-10-10 → 2026-10-25 (mismatch)** | `S2C_43PCT_20261020_0_L2A`; `S2B_43PCT_20261025_0_L2A` | 1.582 | 0.340 | linear_corridor |
| 6 | `INC-MH-R01-C10-20261026-59` | MH-R01-C10 / Kolhapur | `[74.3428, 15.7999]` | **2026-10-10 → 2026-10-25 (mismatch)** | `S2C_43PCT_20261020_0_L2A`; `S2B_43PCT_20261025_0_L2A` | 1.054 | 0.240 | compact_block |
| 7 | `INC-MH-R01-C10-20261026-38` | MH-R01-C10 / Kolhapur | `[74.2561, 15.7561]` | **2026-10-10 → 2026-10-25 (mismatch)** | `S2C_43PCT_20261020_0_L2A`; `S2B_43PCT_20261025_0_L2A` | 1.024 | 0.280 | irregular_patch |
| 8 | `INC-MH-R01-C10-20261026-32` | MH-R01-C10 / Kolhapur | `[74.2571, 15.7587]` | **2026-10-10 → 2026-10-25 (mismatch)** | `S2C_43PCT_20261020_0_L2A`; `S2B_43PCT_20261025_0_L2A` | 1.136 | 0.300 | irregular_patch |
| 9 | `INC-MH-R01-C10-20261026-30` | MH-R01-C10 / Kolhapur | `[74.2532, 15.7580]` | **2026-10-10 → 2026-10-25 (mismatch)** | `S2C_43PCT_20261020_0_L2A`; `S2B_43PCT_20261025_0_L2A` | 4.015 | 0.650 | irregular_patch |
| 10 | `INC-MH-R01-C10-20261026-27` | MH-R01-C10 / Kolhapur | `[74.2924, 15.7601]` | **2026-10-10 → 2026-10-25 (mismatch)** | `S2C_43PCT_20261020_0_L2A`; `S2B_43PCT_20261025_0_L2A` | 5.100 | 0.760 | irregular_patch |
| 11 | `INC-MH-R01-C10-20261026-26` | MH-R01-C10 / Kolhapur | `[74.2552, 15.7612]` | **2026-10-10 → 2026-10-25 (mismatch)** | `S2C_43PCT_20261020_0_L2A`; `S2B_43PCT_20261025_0_L2A` | 3.295 | 0.630 | irregular_patch |
| 12 | `INC-MH-R01-C10-20261026-23` | MH-R01-C10 / Kolhapur | `[74.2955, 15.7638]` | **2026-10-10 → 2026-10-25 (mismatch)** | `S2C_43PCT_20261020_0_L2A`; `S2B_43PCT_20261025_0_L2A` | 3.042 | 0.540 | irregular_patch |
| 13 | `INC-MH-R01-C06-20261026-50` | MH-R01-C06 / Sindhudurg | `[73.7817, 15.7282]` | 2026-10-20 → 2026-10-25 | `S2C_43PCT_20261020_0_L2A`; `S2B_43PCT_20261025_0_L2A` | 29.747 | 3.050 | diffuse_noise |
| 14 | `INC-MH-R01-C06-20261026-49` | MH-R01-C06 / Sindhudurg | `[73.7906, 15.7347]` | 2026-10-20 → 2026-10-25 | `S2C_43PCT_20261020_0_L2A`; `S2B_43PCT_20261025_0_L2A` | 1.612 | 0.370 | linear_corridor |
| 15 | `INC-MH-R01-C06-20261026-48` | MH-R01-C06 / Sindhudurg | `[73.80106, 15.73527]` | 2026-10-20 → 2026-10-25 | `S2C_43PCT_20261020_0_L2A`; `S2B_43PCT_20261025_0_L2A` | 5.820 | 0.854 | linear_corridor |
| 16 | `INC-MH-R01-C06-20261026-47` | MH-R01-C06 / Sindhudurg | `[73.7943, 15.7358]` | 2026-10-20 → 2026-10-25 | `S2C_43PCT_20261020_0_L2A`; `S2B_43PCT_20261025_0_L2A` | 2.595 | 0.550 | linear_corridor |
| 17 | `INC-MH-R01-C06-20261026-37` | MH-R01-C06 / Sindhudurg | `[73.7564, 15.7362]` | 2026-10-20 → 2026-10-25 | `S2C_43PCT_20261020_0_L2A`; `S2B_43PCT_20261025_0_L2A` | 1.024 | 0.330 | irregular_patch |
| 18 | `INC-MH-R01-C06-20261026-32` | MH-R01-C06 / Sindhudurg | `[73.7440, 15.7371]` | 2026-10-20 → 2026-10-25 | `S2C_43PCT_20261020_0_L2A`; `S2B_43PCT_20261025_0_L2A` | 2.403 | 0.620 | linear_corridor |
| 19 | `INC-MH-R01-C06-20261026-03` | MH-R01-C06 / Sindhudurg | `[73.7474, 15.7817]` | 2026-10-20 → 2026-10-25 | `S2C_43PCT_20261020_0_L2A`; `S2B_43PCT_20261025_0_L2A` | 1.419 | 0.260 | compact_block |
| 20 | `INC-MH-R01-C06-20261026-01` | MH-R01-C06 / Sindhudurg | `[73.7464, 15.7878]` | 2026-10-20 → 2026-10-25 | `S2C_43PCT_20261020_0_L2A`; `S2B_43PCT_20261025_0_L2A` | 1.054 | 0.260 | irregular_patch |

**Source note:** This appendix transcribes Antigravity's read-only audit. The ten `MH-R01-C10` date entries remain unresolved pending product/STAC/ingestion-manifest verification. Scene-ID date tokens are not a substitute for that verification.

## Appendix B — Static-image inventory by sector

| Parent sector | Records | Files | Dimensions | Reported total size |
|---|---:|---:|---|---:|
| MH-R07-C09 | 2 | 6 | 880 × 1586 px | 15.22 MB |
| MH-R01-C10 | 10 | 30 | 1579 × 1579 px | 122.45 MB |
| MH-R01-C06 | 8 | 24 | 1589 × 1589 px | 98.86 MB |
| **Total** | **20** | **60** | Mixed portrait/square | **236.53 MB** |

All 60 files reportedly exist, are non-zero and pass PNG header/IHDR checks. Visual pixel-content inspection and independent source-product verification remain separate acceptance gates.
