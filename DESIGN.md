# BeeD Energy — design contract

Chosen by Luca on 2026-10-23: **"Shtëpia në shtresa" / The house in layers.**
Research behind it: `research/awwwards-energy-construction.md` (20 winners), `research/marketplace-ux.md`.
Engine line: **GSAP 3.15 + ScrollTrigger + Lenis 1.3 on GSAP's ticker. One requestAnimationFrame owner. No other motion library.**

## Thesis
Everything a house needs to be built and to make its own energy, sold by Albanian sellers side by side. The site is a construction drawing set: one house on a drafting sheet whose energy equipment lifts out part by part — and every part is a shelf of the shop. (Since 2026-10-27 the house itself is a realistic AI illustration; the drawing set is the sheet, the keys and the leaders around it.)

Refused on purpose (the category's defaults, see research §5.1): blue-sky panel photos, turbines, green leaves, lime/yellow "energy" palettes, hard hats, power puns, a full-bleed asset video hero, a three-number vanity stat row.

## The world
- **A drawing set, not a brochure.** Thin ink-teal lines on pale sky paper, dimension lines in millimetres, leader lines with numbered keys, title blocks, section cuts. Products are shown as technical drawings at their real datasheet size (`src/lib/drawing.ts`), never as fake photos.
- **Water + Sun** (Luca, 2026-10-27, replacing ink + copper, which "seemed dead"): Albania's two renewable sources. **Deep Adriatic teal is water** — the country's hydropower: it is the structure (colour bands, primary buttons, the menu, the dock, links, heavy rules). **Sun amber is energy** — solar: it marks what is live (the ring and leader on the house, the active key, the active state, prices and figures on teal, the moment the house switches on). The page alternates paper and teal bands so it has rhythm; amber is an accent, never a wash.
- **Things are assembled, not faded in.** Motion comes from a site: parts lift out of the house like an exploded assembly drawing and go back in; lines are drawn, not revealed; numbers are stamped.

## Logo
The BeeD Energy logo (chosen 2026-10-27, `src/components/Logo.astro`): "BeeD" in white on a green label, "Energy" beside it, both in Plus Jakarta Sans (Tokotype, SIL Open Font License) outlined to paths, so it never waits for a font. On light grounds the label is `--leaf` with white letters; on teal grounds (menu, admin rail, ink header, sign-in poster) it is `--leaf-bright` with teal-deep letters; "Energy" follows the text colour. Favicon: the white B on the green label (`public/favicon.svg`, `favicon.ico`); phone icon: "BeeD" on green (`public/apple-touch-icon.png`).

## Colour: Forest + Sun (two colours + tinted neutrals) — tokens in `src/styles/tokens.css`
Retuned on 2026-10-27 from Water + Sun to sit with the green logo: every step keeps its lightness and only the hue moves from Adriatic teal to forest green, so each contrast pair below holds. The `--teal*` token names stay and now hold the greens.
| token | value | use |
|---|---|---|
| `--paper` | #f3f8f5 | pale green-white paper: the page ground |
| `--sheet` | #e6f2eb | the house stage's drafting sheet (paper with a light green tint), product drawing frames |
| `--teal-tint` | #d9ede2 | panels, rows, chosen options, notices (old `--paper-2`) |
| `--teal-tint-2` | #c4e1d1 | a step deeper: drawing faces (old `--paper-3`) |
| `--teal` | #0c4c37 | deep forest green: colour bands, primary buttons, menu, dock, tray, toasts, admin rail, links, 3 px rules, focus ring on light grounds |
| `--teal-deep` | #083a2a | hover on teal buttons, the footer, the finale's night, the active admin row |
| `--teal-2` | #145f46 | lifted green: hover rows on teal grounds, the night's halo |
| `--sun` | #f5a524 | sun amber: energy highlights, prices and figures on teal, the live part of the house (ring, leader, keys), active states, focus on teal, amber chips, the loader line |
| `--glow` | #ffd166 | energy glow: amber button hover on teal, lit windows, subtle highlights |
| `--amber-deep` | #925700 | amber text on light grounds (5.5:1 on paper, 4.8:1 on tint): drawing keys 01–14, HUD meta, errors, the brand's "D" |
| `--text` | #0f2a20 | ink-green text (old `--ink`) |
| `--leaf` / `--leaf-bright` | #009e5c / #3ddc97 | the logo's label on light / on teal grounds |
| `--text-2` | #3b5c4e | secondary text (6.9:1 on paper, 6.1:1 on tint) (old `--ink-2`) |
| `--on-teal-2` | #b8d9c8 | secondary text on teal (6.6:1) and teal-deep (8.4:1) |
| `--line` / `--line-strong` | text at 16 % / 42 % | hairlines |
| `--line-ui` | text at 56 % | form control boundaries (3.7:1 on paper, 3.5:1 on tint) |
| `--line-on-teal` / `-strong` / `-ui` | paper at 20 % / 36 % / 50 % | the same three on teal grounds |
The old names stay as aliases (`--ink` → `--text`, `--ink-2` → `--text-2`, `--copper` → `--sun`, `--copper-2` → `--glow`, `--copper-deep` → `--amber-deep`, `--paper-2` → `--teal-tint`, `--line-on-ink` → `--line-on-teal`); classes `.on-ink`, `.btn--copper`, `.tag--copper`, `.tag--ink` keep their names and mean teal band, sun button, sun chip, teal chip.
Rules:
- **Rhythm.** Sections alternate paper and teal. Home: hero and house stage on paper (the sheet in `--sheet`), manifesto on teal, how-it-works and featured on paper, numbers on teal with sun dimension lines and sun figures, calculator teaser on paper, seller band on teal with the sun CTA, footer on teal-deep. Teal bands use `.on-ink` (paper text, `--on-teal-2` secondary text, re-tinted lines, sun focus ring with a teal halo).
- **Buttons.** On light grounds the primary is teal fill + paper text, with a sun arrow; hover teal-deep. On teal grounds every filled button is sun fill + ink-teal text (7.7:1), hover glow. Secondary = 1 px outline in the current colour.
- **Amber and contrast.** `--sun` on paper is 1.9:1, so it never carries text or a state indicator on light grounds: there it is a fill under ink-teal words (sun chips, the live key, 7.7:1), a bar or a highlighter band. Amber text on light grounds is `--amber-deep`. On teal, `--sun` text is 4.8:1 (teal-deep 6.1:1).
- **Prices.** On light grounds prices are in the text colour (the best total gets a sun highlighter band, the grand total a 3 px sun rule); on teal they may be sun.
- **No muddy mixes.** No translucent amber over teal (it turns olive): the finale's night is teal-deep with a lifted-teal halo; its warm light comes from the dusk render's lit windows.
- **State is never colour alone.** Errors are amber-deep words with a "!" marker and a 2 px border; chosen options add a sun bar and a teal border to the native mark; current nav items are underlined; status tags carry a shape and a word.
- Product photos stay on white (#fff); everything else is a token.
Every text/background and UI-part pair in use was checked against WCAG 2.2 AA (4.5:1 text, 3:1 large text and UI parts) on 2026-10-27; recheck when a token changes.

## Type — self-hosted WOFF2 in `public/fonts/`
- **Archivo** (variable, wdth 62–125, wght 100–900, OFL, Omnibus-Type): display at poster size **condensed** (`font-stretch: 62%–75%`, weight 750–850, uppercase allowed for 1–3 word posters, tracking −0.02 em), and the text face at 100% width, 400/500.
- **Geist Mono** (OFL, Vercel): every number with a unit, prices, spec labels, dimension labels, keys (01–07), eyebrows. `font-variant-numeric: tabular-nums`.
- Scale: Utopia from `awwwards-blueprints/assets/base.css`; poster `--step-display` raised to 64 → 300 px (`clamp(4rem, 0.5rem + 15.5vw, 18.75rem)`); phone poster ≥ 15 vw, fitted, `overflow-wrap: anywhere`.
- Albanian is long: never let a heading overflow; test with "Ngrohës uji diellorë" and "Karikues për makina elektrike".

## Surfaces and shape
Sharp corners (0) everywhere except: the cart count pill and the energy-saving switch (999 px). 1 px rules (`--line`); double rule (3 px + 1 px) under page title blocks. Buttons square: primary = teal fill / paper text (sun arrow); on teal = sun fill / ink-teal text; secondary = 1 px outline in the current colour. Hover only under `(hover: hover)`; press `scale(0.97)`.

## Signature — "Shtëpia ndizet" (the house switches on), exploded parts
Home, sticky sheet beside the scrolling chapters (CSS sticky, no pin; chapters toggle through ScrollTrigger, Lenis-driven). Updated 2026-10-27 at Luca's request: energy first, and a realistic house instead of the line drawing.
- **The house is a realistic, AI-generated illustration**, not a photo and not a drawing: a two-storey Albanian house (tile roof with 8 PV panels and a solar thermal collector, garage with an EV charger, heat pump, inverter/battery unit and meter on the side wall), rendered with FLUX.2 [klein] 4B on Cloudflare Workers AI and cut out onto the paper (`public/house/`, `ASSETS.md`, prompts in `tools/art/house-prompts.mjs`). A day render and a dusk render on the same canvas, plus one cut-out image per piece of equipment. Geometry (hotspots, object boxes, the house's solid-pixel grid) lives in `src/lib/house-render.ts`, copied from `public/house/manifest.json`.
- **The line-drawing world stays for the chrome**: the drafting-grid sheet the render sits on (light teal tint), sun-amber rings and leader lines, the HUD title-block label, numbered keys, mono captions, product drawings in the shop. A small mono stamp on the sheet says "AI-generated illustration · not a photo".
- Seven chapters, energy first (`src/content/story.ts`, `parts` per chapter): **01 Panelet diellore** (pv) → **02 Inverteri** → **03 Bateria** → **04 Ngrohja, ftohja, uji i ngrohtë** (heat pump + solar water heater) → **05 Karikuesi** (EV) → **06 Matësi dhe rrjeti** (meter, net billing) → **07 Energjia që nuk humbet** (insulation + windows). Building materials stay in the shop, not on the stage.
- When a chapter goes live (`src/scripts/home.ts`): the house steps back (scale + translate) and dims to 58 %; a sun-amber ring marks the equipment on it; the matching part image flies out of that point (from 18 % scale, transparent) to the free area of the sheet nearest it — found on the house's solid-pixel grid, so it never lands on the house, the ring, the label or the stamp; an amber leader is drawn from the ring to the part (scaleX) and the HUD label (key, chapter, shop category, **live product count and lowest price from the database**, link) fades in beside the part. The previous part flies back into the house. Transform + opacity only, ≤ 0.8 s, every tween interruptible (`overwrite: 'auto'`).
- **Finale "Ndize"**: every part flies home, the house returns to full size, the sheet turns to night (teal-deep ground, paper grid, a lifted-teal halo behind the house) and the day render cross-fades to the dusk render with lit windows; the counter stamps the year's production for a 5 kWp roof in the chosen city (PVGIS).
- Phone: the same sticky sheet at the top (≥ 30 svh, clear of the dock); the house steps back to the left, the part takes the free band beside or above it, the label is a compact two-line tag.
- **Energy-saving mode / reduced motion / no scripts**: a static exploded diagram — the house in the middle of the sheet, every part laid out around it on a CSS grid with its chapter key (01–07) and a short amber leader toward the house (keys are sun chips); chapters read as a plain list; the sheet is not sticky on phones. Nothing moves.
- `src/lib/house.ts` (the old isometric SVG) is no longer on the home page; it stays for the dev pages and the OG image.

## Technique map (award technique → object in this world)
| # | Technique (winner) | Here |
|---|---|---|
| 1 | Phase-by-phase build (NRG) + pinned product (Caeli) | Exploded parts lift out of the realistic house, chapter by chapter (signature) |
| 2 | % curtain (Belgrade Arbor), as a battery | Loader: a battery charges cell by cell while the % counts to 100, flashes full, then the curtain lifts; decided in `<head>` before the first paint (no flash of the page); skip button; ≤ 1.6 s; once per session; hard 2.2 s time-out; home only |
| 3 | Energy-saving mode (Enpower) + Stop animations (Vazzi) | "Kursim energjie" switch in the header and footer = `html[data-motion=off]` + no pin, no smooth scroll |
| 4 | One product → many (ON Energy) | Product page: the drawing card fans out into the seller offer cards, which settle into the offers table sorted by price |
| 5 | Live counts in the menu (Decor Systems) | Full-screen menu: 14 categories with real product counts and "nga 12 400 L" |
| 6 | Sample basket counter in the nav (Decor Systems) | "Krahaso 2" and "Shporta 3" counters in the header, SSR from cookies |
| 7 | Spec sheet as object (Gehry metadata cards, Fluid Glass tags) | Product page "Fleta teknike": drawing + title block (Vizatimi nr., shkalla, përmasat në mm, burimi) |
| 8 | HUD labels with leader lines (Igloo) | House labels, product drawing callouts |
| 9 | "What's around" map with times (Belgrade Arbor) | Line map of Albania: cities, PVGIS yield, delivery days, sellers |
| 10 | Chapter index + progress (ERA, Gehry) | Vertical rule with keys 01–07 and a permanent "Hyr në dyqan" exit |
| 11 | Bottom-docked pill nav (Fluid Glass) | Phone dock: Kërko · Kategoritë · Krahaso · Shporta |
| 12 | Fixed action bar (Jonite) | Product page: Kërko ofertë · Pyet shitësin |
| 13 | Word-by-word manifesto (Caeli) | Home manifesto under the poster |
| 14 | Mask/slit page transition (KPR, Fluid Glass) | Cross-document view transition: the new page slides in like a drawing sheet |

## Motion rules
- UI 150–250 ms ease-out; choreography (loader, house, offers fan-out, page transition) only, skippable.
- GSAP ticker drives Lenis (`autoRaf: false`) and every tween; no other rAF. `gsap.ticker.lagSmoothing(0)`.
- Never animate width/height/top/left; transform + opacity only; SVG groups use `transform-box: fill-box`.
- Entrance animations never move tap targets (opacity only on nav and buttons).
- Reduced motion or energy-saving: final states at once; no pin; native scroll.

## Layout
12 columns, gutter 40 px desktop / 20 px phone, header 72 px, sections 128 px apart. Shop pages are calm: the world shows in rules, drawings, mono labels, teal structure and sun-amber accents — never in motion over forms or number entry.

## Copy voice
Albanian first, plain and practical, second person ("ju"), numbers with units and sources. No power puns. English is a full translation, not a summary.
