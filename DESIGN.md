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
- **Word spacing follows tracking.** Plus Jakarta's space is only 0.16 em at light weights, so tightened type ran words together ("Rrethnesh"). Every rule with a negative `letter-spacing` sets `word-spacing: 2 × |tracking| + 0.04em` beside it (e.g. −0.045 em → 0.13 em); monospaced figures are left as they are.
- Albanian is long: never let a heading overflow; test with "Ngrohës uji diellorë" and "Karikues për makina elektrike".
- The Archivo files are still in `public/fonts/` but nothing loads them.

## Surfaces and shape
Soft and floating since Mist + Volt: radii 8 / 14 / 24 px (`--radius-s`, `--radius-m`, `--radius-l`), cards and panels rounded on white or tint, pills for counts, tags and the saver switch. The header is a floating glass bar with slanted ends; filled buttons and the hero's callout tags have one slanted end. 1 px rules (`--line`). Hover only under `(hover: hover)`; press `scale(0.95)`.
- **Product photos in the studio** (2026-11-01): every frame a maker's photo sits in (cards, product sheet, basket, compare, gallery, hero card, stage tags, admin) is a mist studio sweep (`--studio`: lighter in the middle, a soft floor shadow) with `isolation: isolate`, and the photo is `mix-blend-mode: multiply`, so the maker's white becomes the sweep and the product keeps its colours. Cards give the product 7 % of air.
- **Admin** follows the same style: slate rail with a lemon active pill, thin sentence-case titles, white rounded cards (radius 18–22 px) for figures, filters, tables, forms and boxes, a slate glass save bar, the dusk house on the sign-in page.

### The home hero (2026-11-01, `Home.astro` `.vhero`)
The dusk-house photograph fills a 16:9 frame (`.vhero__scene` is the size container, so tags stay on the photo at any width); "Prodho ⚡ Ruaj ⚡ Kurse" sits huge and thin across the roof with the 3D volt mark (`VoltMark.astro`) between words; two white callout tags ("PANELE DIELLORE", the city's kWh per kWp) hang on leader lines that draw themselves; a glass product card on the left, the claim and two CTAs on the right, and three cards along the bottom (packages, a battery on grass, the calculator figure). Words rise in turn, bolts drop in with a spring, the cards follow; on scroll the photo drifts and the title lifts.

### The footer is a mini website (2026-11-01, `Footer.astro`)
A closing hero over the dusk house with the calculator and quote CTAs and live stats; the shop at a glance (every category with its count and lowest price, in its two groups; two small columns on phones); the three free tools as colour cards (lemon packages, slate guide, white calculator); the site map with a contact card; the big wordmark and the bottom bar with the saver switch.

### Images
Scene photographs in `public/scenes/` (`hero-house`, `dusk-house`, `battery-grass`, each 960 / 1440 / 2048 px WebP) were generated on 2026-11-01 with FLUX.1-schnell (Black Forest Labs, Apache-2.0) through its public Hugging Face Space. They are illustrations of the mood, never product photos: products are always shown with the maker's own photo.

## Signature — "Shtëpia ndizet" (the house switches on), a film of the house
Home, after the hero. Rebuilt 2026-11-01 at the client's request ("the house people see first, realistic, 3D, with a cinematic zoom on the products"): the hero's own dusk house, equipped, pinned full screen while the chapter cards scroll over it; scroll is the camera.
- **The pictures** are AI-generated illustrations, not photos (`public/scenes/stage-*.webp`, `ASSETS.md`, prompts in `tools/art/stage-prompts.mjs`): the wide shot is the hero house with its equipment added (roof PV, inverter, battery and meter on the side wall, an EV charging from a wallbox, a heat pump on the grass); one close-up per chapter (roof panels, inverter, battery, heat pump, wallbox, meter, the glass facade), all FLUX.2 edits of the same house, so light and mist match. A mono stamp in the caption says "AI-generated illustration · not a photo".
- **Geometry** in `src/lib/stage-scenes.ts`: each close-up's spot on the wide shot (1600 × 900 frame units), its zoom, and where the equipment sits inside the close-up.
- Seven chapters, energy first (`src/content/story.ts`, `parts` per chapter): **01 Panelet diellore** → **02 Inverteri** → **03 Bateria** → **04 Ngrohja, ftohja, uji i ngrohtë** (heat pump; the solar water heater is named in the tag) → **05 Karikuesi** → **06 Matësi dhe rrjeti** → **07 Energjia që nuk humbet** (the glass facade). Building materials stay in the shop.
- **One clock** (rebuilt 2026-11-01 after "the film is not in line with the scroll and the information"): the chapter cards are pinned inside the film, stacked in one place, and the same scrubbed timeline that moves the camera raises and removes each card and decides the live chapter (tag, keys, caption). Each chapter is one fixed step of scroll (1.2 × the 100svh view); the film's length is set on `.cine` by home.ts. No scrub lag (Lenis already smooths). The keys, keyboard focus and `#shtresa-N` links scroll to a chapter's reading point.
- **The camera** (`src/scripts/home.ts`, one GSAP timeline scrubbed by the scroll, so it runs backwards just as well): an establishing dolly on the whole house with its numbered lemon spots; for each chapter it flies in (scale + pan, 2D) to the equipment, keeps going while the close-up cuts in over it, and the close-up pushes in and orbits a few degrees in 3D perspective while the card is read (longer for a tall card); then the close-up dissolves into the whole house as the camera pulls back, spots on again, and flies to the next. Mist (two layers) and dust drift against the camera for depth. The live chapter's white slanted tag shows the shelf, **the shelf's most-offered product with its photo**, the live count and the lowest price, and links to the product.
- **Finale "Ndize"**: the camera pulls back to the whole house, which glows warm, every spot lit; the card counts the year's production for a 5 kWp roof in the chosen city (PVGIS).
- **Two traps found on the way** (Chromium): a 3D turn on the wide-shot layer while zoomed three times over, and any `mix-blend-mode` layer inside the camera, each blanked the whole page. The wide camera stays 2D and the glow is plain translucent light; the 3D lives on the screen-sized close-ups.
- The film is full screen on every device and the explanation is inside it: chapter cards are slate glass, a screen and a third apart; the second fact and the sources sit behind a "Burimet dhe më shumë" disclosure, so a card is the chapter, its headline figure and its shelves. Desktop: cards on the left (≤ 32 rem), the camera puts the equipment right of them; short screens (≤ 860 px tall) get tighter cards. Phone: the card rests across the lower part above the dock, the camera puts the equipment in the upper third, the tag and keys step aside (the card names the shelves) and the caption keeps the AI stamp.
- **Energy-saving mode / reduced motion / no scripts**: a still of the wide shot with its numbered spots, then the chapters as cards in two columns, each with its own close-up on top. Nothing moves.

## Technique map (award technique → object in this world)
| # | Technique (winner) | Here |
|---|---|---|
| 1 | Phase-by-phase build (NRG) + pinned product (Caeli) | The house film: the camera flies to each piece of equipment and cuts to its close-up, chapter by chapter (signature) |
| 2 | % curtain (Belgrade Arbor), as a battery | Loader: a battery charges cell by cell while the % counts to 100, flashes full, then the curtain lifts; decided in `<head>` before the first paint (no flash of the page); skip button; ≤ 1.6 s; once per session; hard 2.2 s time-out; home only |
| 3 | Energy-saving mode (Enpower) + Stop animations (Vazzi) | "Kursim energjie" switch in the header and footer = `html[data-motion=off]` + no pin, no smooth scroll |
| 4 | One product → many (ON Energy) | Product page: the drawing card fans out into the seller offer cards, which settle into the offers table sorted by price |
| 5 | Live counts in the menu (Decor Systems) | Full-screen menu: 14 categories with real product counts and "nga 12 400 L" |
| 6 | Sample basket counter in the nav (Decor Systems) | "Krahaso 2" and "Shporta 3" counters in the header, SSR from cookies |
| 7 | Spec sheet as object (Gehry metadata cards, Fluid Glass tags) | Product page "Fleta teknike": drawing + title block (Vizatimi nr., shkalla, përmasat në mm, burimi) |
| 8 | HUD labels with leader lines (Igloo) | The hero's callout tags, the stage's product tags, product drawing callouts |
| 9 | "What's around" map with times (Belgrade Arbor) | Line map of Albania: cities, PVGIS yield, delivery days, sellers |
| 10 | Chapter index + progress (ERA, Gehry) | Vertical rule with keys 01–07 and a permanent "Hyr në dyqan" exit |
| 11 | Bottom-docked pill nav (Fluid Glass) | Phone dock: Kërko · Kategoritë · Krahaso · Shporta |
| 12 | Fixed action bar (Jonite) | Product page: Kërko ofertë · Pyet shitësin |
| 13 | Word-by-word manifesto (Caeli) | Home manifesto under the poster |
| 14 | Mask/slit page transition (KPR, Fluid Glass) | Cross-document view transition: the new page slides in like a drawing sheet |

## Buyer tools and trust (2026-11-01)
Each in both languages, styled with the site's cards and pills; words in `src/i18n/extras.ts`.
| Feature | Where | How |
|---|---|---|
| "Which system do I need?" | `/cili-sistem`, `views/Quiz.astro`, `scripts/quiz.ts` | Five questions; a plain GET to the calculator without scripts; with scripts one question at a time, then `/api/solar` (the calculator's own sizing) shows the kit, total, saving and payback. |
| Build your own system | `/nderto-sistemin`, `views/Builder.astro`, `scripts/builder.ts` | Real products with their cheapest live offer; checks: inverter PV limit, panel/inverter ratio 0.75–1.4, phases against the house supply, inverter–battery pairs the makers list (`content/battery-compat.ts`); adds all lines to the basket in one request. |
| Installer finder | `/instaluesit`, `views/Installers.astro` | Installers and building companies by city; a visit request is a quote request addressed to one installer (`quote_requests.seller_id`), answered in the usual quote thread. |
| City solar pages | `/energji-diellore/<city>`, `views/SolarCity.astro` | PVGIS yield, 3/5/10 kWp production, the calculator's result for a 400 kWh/month home, monthly curve, sellers in the city. Linked from the footer and the sitemap. |
| Order tracking | `/gjurmo-porosine`, `lib/track.ts` | Order code + the last 6 digits of the phone open the order's own page; one answer for every miss; rate-limited. |
| Verified reviews | `lib/reviews.ts`, `/api/review`, order page, product page, `admin/reviews` | Only from a delivered order's page, once per product; shown after approval; `aggregateRating` only from real approved reviews. |
| WhatsApp · Viber · call | `components/ChatButtons.astro`, `lib/chat.ts` | On offers, installer and city cards, when the seller has a phone; Albanian numbers normalised to +355. |
| Price alerts | product page form (existing), `admin/alerts` | "Due" when the cheapest live offer reaches the target; sent by hand from a pre-written e-mail until an e-mail service is connected. |
| Lekë / euro | `lib/currency.ts`, `components/CurrencySwitch.astro`, `/api/currency` | Display only, at the admin's rate (`settings.currency.eurAll`); every `lek()` call follows the visitor's choice (AsyncLocalStorage on the server, `<html data-cur>` in the browser); checkout, order pages and the admin stay in lekë. |
| Completed projects | `/projekte`, `admin/projects` | Real installations by sellers, shown only when published with the owner's consent; an honest empty page until then. |

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
