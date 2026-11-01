// Prompts for the home stage's cinematic house (public/scenes/stage-*.webp, see ASSETS.md "Stage scenes"):
// the hero's dusk house with its energy equipment added, and one close-up per chapter that the camera cuts to.
// FLUX.2 [klein] 4B on Workers AI (tools/art/flux2.mjs). Every brief is an edit of a reference image, so the
// house, the light and the mist stay the hero's: the house brief takes the hero photo (--ref), the close-ups take
// the chosen equipped house (each brief's `reference`, or --ref).
//
//   node tools/art/stage-prompts.mjs <raw dir> --only house --n 3 --ref hero-house.jpg
//   node tools/art/stage-prompts.mjs <raw dir> --only pv,inverter,… --n 2 --ref house-2.jpg
//
// The heat pump and the meter are too small in the wide shot to come back as close-ups, so their reference is a
// 640 × 360 crop of the chosen house around them, scaled to 2048 × 1152 (--ref crop.jpg).
//
// 2048 × 1152 with one 2048 × 1152 reference ≈ 12 output + 12 input tiles ≈ 380 neurons per image.
import { pathToFileURL } from 'node:url';
import { run } from './flux2.mjs';

const W = 2048;
const H = 1152;

/** The hero's look, repeated so every close-up is graded like the wide shot. */
const MOOD = [
  'Photorealistic cinematic photograph, blue-hour dusk in soft sage-grey mist, muted teal-grey sky, warm amber interior light,',
  'thin glowing orange LED edge lines on the house, shallow depth of field, 35 mm film look, fine grain, the same colour grade as the reference image.',
  'All equipment has plain unbranded surfaces. No text, no letters, no numbers, no logos, no brand names, no watermark, no people.',
].join(' ');

const close = (id, subject) => ({
  id,
  width: W,
  height: H,
  reference: true,
  prompt: `Cinematic close-up shot of the house in the reference image, the camera moved in close: ${subject} ${MOOD}`,
});

export const HOUSE = {
  id: 'house',
  width: W,
  height: H,
  reference: true,
  prompt: [
    'The exact same house, landscape, sky, camera angle and framing as in the reference image: the same glass gable facade with warm light inside,',
    'the same dark roof covered with solar panels, the same glowing orange edge lines, the same lone tree and misty hills.',
    'Add only this home energy equipment, plain and unbranded, all small and in scale with the house:',
    'on the long white side wall, left of the door, a white wall-mounted solar inverter and beside it a tall white home battery cabinet, lit by a small warm wall light;',
    'right of the door a small grey electricity meter cabinet;',
    'in front of the wall, on a short pale gravel driveway, a dark grey electric car parked and plugged with a black cable into a compact white wallbox charger on the wall, its small status ring glowing;',
    'on the grass at the right end of the house an air-to-water heat pump outdoor unit with a round black fan grille.',
    'Keep everything else unchanged.',
    MOOD,
  ].join(' '),
};

export const CLOSEUPS = [
  close('pv', 'looking along the dark roof slope at rows of black monocrystalline solar panels with thin silver frames, dew on the glass, the glowing orange LED line along the roof edge, the misty dusk sky behind.'),
  close('inverter', 'a white wall-mounted solar inverter on the white exterior side wall, a slim rectangular box with a small dark display glowing soft green, cables running down into a neat grey conduit, lit by a small warm wall light.'),
  close('battery', 'a tall white home battery cabinet of stacked modules on the white exterior side wall next to a white inverter, a thin glowing status light strip on its front, lit by a small warm wall light.'),
  close('heatpump', 'the air-to-water heat pump outdoor unit filling most of the frame, a white cabinet with one round black fan grille standing on the dark grass, faint warm vapour rising from it, the white wall and the car softly out of focus behind.'),
  close('ev', 'a compact white wallbox electric car charger on the white wall, its status ring glowing, a black charging cable running to a dark grey electric car parked on pale gravel, the car charging port glowing softly.'),
  close('meter', 'a small grey electricity meter cabinet filling most of the frame on the white exterior wall, its small window showing a white digital electricity meter with a softly glowing blank display, cables running into it, lit by the warm wall light.'),
  close('envelope', 'the corner of the large glass gable facade: thick triple-glazed windows in slim black frames with warm light inside, the thick white insulated wall beside them, the glowing orange edge line above.'),
];

export function briefs() {
  return [HOUSE, ...CLOSEUPS];
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) await run(briefs(), process.argv);
