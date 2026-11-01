# BeeD Energy — image assets

## Hero scenes (`public/scenes/hero-house-*`, `dusk-house-*`, `battery-grass-*`)

**AI-generated illustrations, not photos.** Made on 2026-11-01 for the Mist + Volt redesign, after the client's glowing-house reference.

| File | Where | What it is |
|---|---|---|
| `hero-house-{960,1440,2048}.webp` | home hero; the stage's reference | A modern glass-gabled house at dusk in sage mist, its roof covered with solar panels, thin orange LED lines on the eaves, a lone tree. |
| `dusk-house-{960,1440,2048}.webp` | footer hero, seller band, packages card | A second dusk house in the same light. |
| `battery-grass-{…}.webp` | hero's battery card | A white home battery cabinet with a glowing ring, standing in tall grass. |

- **Model:** FLUX.1 [schnell] (Black Forest Labs, Apache 2.0 weights) through its public Hugging Face Space (black-forest-labs/FLUX.1-schnell), anonymous; its free GPU quota stopped the batch after three images. Prompts and raw files stayed in the session scratchpad.

## Stage scenes (`public/scenes/stage-*.webp`)

**AI-generated illustrations, not photos of a real building, installation or product.** No brand or model is meant to be shown; marks the model drew (a car badge, pseudo-lettering on the inverter, the battery and the heat pump) were painted out. Do not caption them as a real home or as a specific product from the catalogue.

| File | What it is |
|---|---|
| `stage-house-{960,1440,2048}.webp` | The wide shot: the hero's dusk house (glass gable, solar roof, orange edge lines) with its equipment added: inverter, battery cabinet and meter on the side wall, an EV charging from a wallbox, an air-to-water heat pump on the grass. Graded down to the hero's levels. |
| `stage-pv-{1024,2048}.webp` | Close-up: wet black panels along the roof slope, the orange edge line. |
| `stage-inverter-…` | Close-up: the white wall inverter with its display and cables. |
| `stage-battery-…` | Close-up: the tall white battery cabinet with its glowing status strip, the wallbox beside it. |
| `stage-heatpump-…` | Close-up: the heat pump on the grass, vapour rising, the car out of focus. |
| `stage-ev-…` | Close-up: the wallbox with its glowing ring, the cable to the car. |
| `stage-meter-…` | Close-up: the grey meter cabinet on the wall. |
| `stage-envelope-…` | Close-up: the corner of the triple-glazed gable facade. |

- **Model:** FLUX.2 [klein] 4B on Cloudflare Workers AI (as below), every image an edit of a reference: the house of the hero photo (`hero-house-2048`), the close-ups of the chosen equipped house; the heat pump and the meter of a 640 × 360 crop of it around them (they are too small in the wide shot to come back as close-ups otherwise). 26 renders on 2026-11-01, about 9,500 of the 10,000 daily neurons. Kept: house 3, pv 1, inverter 1, battery 2, heatpump 3, ev 2, meter 3, envelope 1.
- **Prompts:** `tools/art/stage-prompts.mjs` (runner `tools/art/flux2.mjs`).
- **Post-processing** (sharp): marks painted out with a local blur of their surroundings; the house graded with `linear([0.80, 0.84, 0.84], [-4, -2, -2])` to the hero's levels, the close-ups with a slight cool tint; WebP q 70–74 (the meter median-filtered first, its grain cost 280 KB). The 2048 files are 41–169 KB.
- Spots, zooms and focus points: `src/lib/stage-scenes.ts`.

## Earlier house renders (`public/house/`)

The isometric house of 2026-10-27 (FLUX.2 [klein] 4B on Workers AI, prompts in `tools/art/house-prompts.mjs`) left the home page on 2026-11-01. Only `part-pv-{400,800}.webp` (six PV panels on rails, transparent background) remains: the renewables guide's sheet uses it. **AI-generated illustration, not a photo.** Licence and model notes below apply to it.

- **Model:** FLUX.2 [klein] 4B, `@cf/black-forest-labs/flux-2-klein-4b`, run on Cloudflare Workers AI inside the account's free daily allowance.
- **Licence:** the FLUX.2 [klein] 4B weights are released by Black Forest Labs under Apache 2.0 (open weights, commercial use allowed). Workers AI lists Black Forest Labs' terms of service for this model (<https://bfl.ai/legal/terms-of-service>); read them once before launch. The 9B variant of the same model is non-commercial and was not used.
