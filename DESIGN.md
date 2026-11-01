# BeeD Energy — design contract

Chosen by Luca on 2026-10-23: **"Shtëpia në shtresa" / The house in layers.**
Research behind it: `research/awwwards-energy-construction.md` (20 winners), `research/marketplace-ux.md`.
Engine line: **GSAP 3.15 + ScrollTrigger + Lenis 1.3 on GSAP's ticker. One requestAnimationFrame owner. No other motion library.**

## Thesis
Everything a house needs to be built and to make its own energy, sold by Albanian sellers side by side. The site is a construction drawing set: one house on a drafting sheet whose energy equipment lifts out part by part — and every part is a shelf of the shop. (Since 2026-10-27 the house itself is a realistic AI illustration; the drawing set is the sheet, the keys and the leaders around it.)

Refused on purpose (the category's defaults, see research §5.1): blue-sky panel photos, turbines, green leaves, hard hats, power puns, a full-bleed asset video hero, a three-number vanity stat row. (The lemon accent came back on 2026-11-01 by the client's own reference, "Mist + Volt" below, as a single volt colour on misty slate, never a lime wash.)

## The world
- **A drawing set, not a brochure.** Thin ink-teal lines on pale sky paper, dimension lines in millimetres, leader lines with numbered keys, title blocks, section cuts. Products are shown as technical drawings at their real datasheet size (`src/lib/drawing.ts`), never as fake photos.
- **Mist + Volt** (2026-11-01, from the client's glowing-house reference; it follows Water + Sun and Forest + Sun): a house at dusk in sage mist, switched on. **Sage slate is the evening** — the structure (bands, primary buttons, the menu, the dock, the glass header). **Volt lemon is the power** — what is live: CTAs, the active state, figures on slate, the callout tags, the volt mark. Ember orange only traces the house's glowing edges. Mist paper and slate bands alternate; lemon is an accent, never a wash.
- **Things are assembled, not faded in.** Motion comes from a site: parts lift out of the house like an exploded assembly drawing and go back in; lines are drawn, not revealed; numbers are stamped.

## Logo
The BeeD Energy logo (chosen 2026-10-27, `src/components/Logo.astro`): "BeeD" on a label, "Energy" beside it, both in Plus Jakarta Sans (Tokotype, SIL Open Font License) outlined to paths, so it never waits for a font. Since Mist + Volt (2026-11-01) the label is `--leaf` = volt lemon with `--text` letters on every ground; "Energy" follows the text colour. Going back to the green label is two tokens (`--leaf`, `--leaf-bright` in tokens.css). Favicon: the white B on the green label (`public/favicon.svg`, `favicon.ico`); phone icon: "BeeD" on green (`public/apple-touch-icon.png`).

## Colour: Mist + Volt — tokens in `src/styles/tokens.css`
Chosen on 2026-11-01 from the client's reference (a glowing house at a misty sage dusk, "Solar ⚡ Power"): misty sage paper, deep sage-slate structure, one volt lemon for everything live, and an ember orange only for the glowing edge lines of the house. The `--teal*` token names stay and now hold the slates.
| token | value | use |
|---|---|---|
| `--paper` | #e8ede9 | light mist: the page ground |
| `--sheet` | #dde5e0 | the house stage's sheet, product drawing frames |
| `--teal-tint` | #d2dbd5 | panels, rows, chosen options, notices |
| `--teal-tint-2` | #bfcac4 | a step deeper: drawing faces, chart tracks |
| `--teal` | #33423e | deep sage slate: bands, primary buttons on light, menu, dock, tray, toasts, admin rail, links |
| `--teal-deep` | #242f2c | the night: footer, hero shade, hover on slate |
| `--teal-2` | #43534e | lifted slate: hover rows on slate grounds |
| `--sun` | #ece44c | volt lemon: CTAs, live parts, active states, figures on slate, callout tags, the volt mark |
| `--glow` | #f7f08c | volt glow: hover on lemon, highlights |
| `--ember` | #ff9a3c | the house's glowing edge lines and leaders only, never text on light grounds |
| `--amber-deep` | #5f5600 | volt text on light grounds |
| `--text` / `--text-2` / `--text-3` | #18221f / #45524d / #525e59 | ink, secondary, tertiary |
| `--on-teal` / `--on-teal-2` | #eef2ef / #b7c4be | text and secondary text on slate |
| `--leaf` / `--leaf-bright` | #ece44c | the logo's label (lemon with ink letters) |
| `--line` / `--line-strong` / `--line-ui` | ink at 14 % / 38 % / 56 % | hairlines and form control boundaries |
| `--line-on-teal` / `-strong` / `-ui` | mist at 16 % / 32 % / 50 % | the same three on slate |
| `--glass` / `--glass-line` | slate at 62 % + 18 px blur / white at 16 % | the floating header and the hero's cards over photographs |
The old names stay as aliases (`--ink` → `--text`, `--copper` → `--sun`, `--copper-deep` → `--amber-deep`, `--paper-2` → `--teal-tint`, `--line-on-ink` → `--line-on-teal`); classes `.on-ink`, `.btn--copper`, `.tag--copper`, `.tag--ink` keep their names and mean slate band, lemon button, lemon chip, slate chip.
Contrast (WCAG 2.2 AA, checked 2026-11-01): text on paper 13.8:1, on tint 11.5:1; text-2 6.9 / 5.8; text-3 5.7 / 4.8; amber-deep 6.3 / 5.3; on-teal on slate 9.3, on-teal-2 5.9 (deep 7.7); lemon on slate 7.9 (deep 10.4); ink on lemon 12.3; ember on slate 5.0; control boundaries 3.7 on paper, 3.7 on slate. Recheck when a token changes.
Rules:
- **Lemon never carries text on light grounds** (1.1:1 on paper): there it is a fill under ink words (buttons, chips, the logo label, the callout tags) or a bar. Lemon text lives on slate.
- **Rhythm.** Mist paper sections alternate with slate bands; the home opens on the dusk photograph and the footer closes on it.
- **Buttons.** Primary = slate fill + mist text on light grounds, lemon fill + ink text on slate and over photographs; the filled shape has a slanted right end (`.btn::before`, 12 px cut); secondary = a rounded outline in the current colour.
- **State is never colour alone.** Errors are amber-deep words with a "!" marker and a 2 px border; chosen options add a bar and a border; current nav items are underlined; status tags carry a shape and a word.
- Product photos stay on white (#fff); everything else is a token.

## Type — self-hosted WOFF2 in `public/fonts/`
- **Plus Jakarta Sans** (variable, wght 200–800, OFL, Tokotype; latin + latin-ext), the logo's own face: display huge and **thin** (`.poster` weight 200, line-height 0.95, tracking −0.045 em, never uppercase; `.title` 300), text at 400/500, buttons uppercase 650. A size-adjusted Arial fallback face (`'Plus Jakarta Fallback'`, 102 %) keeps the layout close while it loads.
- **Geist Mono** (OFL, Vercel): every number with a unit, prices, spec labels, dimension labels, keys (01–07), eyebrows. `font-variant-numeric: tabular-nums`.
- Scale: Utopia from `awwwards-blueprints/assets/base.css`; the home hero line is `min(clamp(3.25rem, 8.6vw, 11.5rem), 16svh)` so it fits a Full HD screen with the house.
- Albanian is long: never let a heading overflow; test with "Ngrohës uji diellorë" and "Karikues për makina elektrike".
- The Archivo files are still in `public/fonts/` but nothing loads them.

## Surfaces and shape
Soft and floating since Mist + Volt: radii 8 / 14 / 24 px (`--radius-s`, `--radius-m`, `--radius-l`), cards and panels rounded on white or tint, pills for counts, tags and the saver switch. The header is a floating glass bar with slanted ends; filled buttons and the hero's callout tags have one slanted end. 1 px rules (`--line`). Hover only under `(hover: hover)`; press `scale(0.95)`.

### The home hero (2026-11-01, `Home.astro` `.vhero`)
The dusk-house photograph fills a 16:9 frame (`.vhero__scene` is the size container, so tags stay on the photo at any width); "Prodho ⚡ Ruaj ⚡ Kurse" sits huge and thin across the roof with the 3D volt mark (`VoltMark.astro`) between words; two white callout tags ("PANELE DIELLORE", the city's kWh per kWp) hang on leader lines that draw themselves; a glass product card on the left, the claim and two CTAs on the right, and three cards along the bottom (packages, a battery on grass, the calculator figure). Words rise in turn, bolts drop in with a spring, the cards follow; on scroll the photo drifts and the title lifts.

### The footer is a mini website (2026-11-01, `Footer.astro`)
A closing hero over the dusk house with the calculator and quote CTAs and live stats; the shop at a glance (every category with its count and lowest price, in its two groups; two small columns on phones); the three free tools as colour cards (lemon packages, slate guide, white calculator); the site map with a contact card; the big wordmark and the bottom bar with the saver switch.

### Images
Scene photographs in `public/scenes/` (`hero-house`, `dusk-house`, `battery-grass`, each 960 / 1440 / 2048 px WebP) were generated on 2026-11-01 with FLUX.1-schnell (Black Forest Labs, Apache-2.0) through its public Hugging Face Space. They are illustrations of the mood, never product photos: products are always shown with the maker's own photo.

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
- Micro-interactions (2026-10-28, global.css "micro-interactions" + src/scripts/micro.ts), all off with `html[data-motion=off]`: buttons lift on hover with a light sweep on filled ones and press down to 95 %; a pressed filled button throws a small burst of leaf-green and amber sparks; the basket button turns `--leaf` with a ✓ once the item is in; product cards rise 4 px, the photo zooms 4.5 % and the energy key turns into a diamond; category thumbnails tilt; the logo's label tips over on hover; menu links draw a green underline; dock icons squash when pressed and the current one hops on arrival; toasts pop in with a green line counting down their 4.2 s; a leaf-to-sun charge line along the top edge fills with scroll (scroll-driven, hidden where unsupported).
- GSAP ticker drives Lenis (`autoRaf: false`) and every tween; no other rAF. `gsap.ticker.lagSmoothing(0)`.
- Never animate width/height/top/left; transform + opacity only; SVG groups use `transform-box: fill-box`.
- Entrance animations never move tap targets (opacity only on nav and buttons).
- Reduced motion or energy-saving: final states at once; no pin; native scroll.

## Layout
12 columns, gutter 40 px desktop / 20 px phone, a floating 68 px header 12 px from the top, sections 128 px apart, content up to 1600 px (Full HD first). Shop pages are calm: the world shows in rules, drawings, mono labels, teal structure and sun-amber accents — never in motion over forms or number entry.

## Copy voice
Albanian first, plain and practical, second person ("ju"), numbers with units and sources. No power puns. English is a full translation, not a summary.
