// Upright close-ups for phones (2026-11-01, "the quality is very shitty on the scroll part"): each chosen close-up
// (2048 × 1152, ASSETS.md "Stage scenes") goes back into FLUX.2 [klein] as the reference and comes out recomposed
// upright, 1152 × 2048. A phone held upright blew the 16:9 picture up about 2.2 times to fill its screen before the
// camera pushed in; the upright one fills an iPhone's screen at about 1.2. The model's limit is 2048 px a side, so
// wide screens keep the 2048 × 1152 pictures (re-encoded from these originals at high quality). The film's house has
// no upright version: the camera flies to spots measured on its 16:9 frame (lib/stage-scenes.ts). The home hero
// gets one (hero-tall, reference: the hero photo as hero.jpg). Asking for the equipment "in the upper half" did not
// move it, so phones show the upright close-up in the top 62 % of the screen instead (home.css).
//
//   node tools/art/stage-hires-prompts.mjs <raw dir> --refs <dir with pv.jpg, inverter.jpg, …> [--only pv-tall,…] [--n 2]
//
// 1152 × 2048 out with a 2048 × 1152 reference ≈ 12 output + 12 input tiles ≈ 380 neurons per picture.
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { run } from './flux2.mjs';
import { CLOSEUPS } from './stage-prompts.mjs';

const MOOD = [
  'Photorealistic cinematic photograph, blue-hour dusk in soft sage-grey mist, muted teal-grey sky, warm amber interior light,',
  'the same colour grade as the reference image, crisp fine detail, sharp edges, clean surfaces, no noise, no blur on the subject.',
  'All equipment has plain unbranded surfaces. No text, no letters, no numbers, no logos, no brand names, no watermark, no people.',
].join(' ');

export function briefs(refs) {
  const ref = (id) => path.join(refs, `${id}.jpg`);
  const subject = (c) => c.prompt.replace(/^.*?the camera moved in close: /, '').split(' Photorealistic')[0];
  // the home hero, upright: the same house whole in the middle, sky above it for the three words
  const hero = {
    id: 'hero-tall',
    width: 1152,
    height: 2048,
    reference: ref('hero'),
    prompt: `The same modern glass-gabled house at dusk as in the reference image, recomposed as a tall upright 9:16 photograph with the camera close to the house: the house is large and fills the whole width of the frame, cropped at both sides, its dark roof covered in solar panels rising from the left edge, its tall warm lit glass gable facade and its thin glowing orange edge lines filling the middle and lower part of the frame, misty teal-grey sky in the top quarter, a strip of dark grass at the bottom. ${MOOD}`,
  };
  return [hero, ...CLOSEUPS.map((c) => ({
    id: `${c.id}-tall`,
    width: 1152,
    height: 2048,
    reference: ref(c.id),
    prompt: `The same scene as the reference image, recomposed as a tall upright 9:16 photograph with the camera close: ${subject(c)} The equipment stands in the middle of the frame, large and in sharp focus. ${MOOD}`,
  }))];
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const i = process.argv.indexOf('--refs');
  if (i < 0) throw new Error('--refs <dir> is required');
  await run(briefs(process.argv[i + 1]), process.argv);
}
