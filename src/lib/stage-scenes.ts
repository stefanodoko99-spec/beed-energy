// The home stage's film (public/scenes/stage-*.webp, ASSETS.md "Stage scenes"): the hero's dusk house with its
// energy equipment as the wide shot, and one close-up per piece of equipment that the camera cuts to. Shared by
// Home.astro (markup) and scripts/home.ts (the camera).
import type { Part } from '../content/story';

export type ShotId = 'pv' | 'inverter' | 'battery' | 'heatpump' | 'ev' | 'meter' | 'envelope';

/** The wide shot is drawn in a 1600 × 900 frame (16:9, the image's own ratio). */
export const FRAME = { w: 1600, h: 900 };
export const HOUSE_WIDTHS = [960, 1440, 2048];
export const SHOT_WIDTHS = [1024, 2048];
/** Upright close-ups (stage-<id>-tall-<w>.webp, 9:16) for screens taller than they are wide: the 16:9 one was blown
 *  up about 2.2 times to cover an upright phone. The same media query picks them in Home.astro and home.ts. */
export const TALL_SHOTS = '(max-aspect-ratio: 4/5)';
export const TALL_WIDTHS = [720, 1152];
/** `tallY` above: how far down its upright close-up the equipment sits (0–1). Upright screens show that close-up in
 *  the top 62 % of the screen, cropped around it, so it stays clear of the card below (home.css). */

/** Per close-up: the equipment's centre on the wide shot (frame units), how far the camera zooms in on it, where
 *  the equipment sits in its own 16:9 close-up (0–1 of the image), so the cut lands on it, and in the upright one. */
export const SHOTS: Record<ShotId, { spot: [number, number]; zoom: number; focus: [number, number]; tallY: number }> = {
  pv: { spot: [844, 300], zoom: 2, focus: [0.5, 0.35], tallY: 0.45 },
  inverter: { spot: [872, 556], zoom: 3, focus: [0.47, 0.42], tallY: 0.45 },
  battery: { spot: [809, 600], zoom: 3, focus: [0.72, 0.6], tallY: 0.68 },
  heatpump: { spot: [1398, 614], zoom: 3, focus: [0.6, 0.5], tallY: 0.62 },
  ev: { spot: [741, 594], zoom: 2.8, focus: [0.38, 0.45], tallY: 0.62 },
  meter: { spot: [653, 529], zoom: 3.2, focus: [0.48, 0.6], tallY: 0.62 },
  envelope: { spot: [489, 444], zoom: 2.2, focus: [0.5, 0.5], tallY: 0.45 },
};

/** The close-up a chapter cuts to: the one of its first part (the heat chapter's solar water heater has none). */
const OF_PART: Record<Part, ShotId> = { pv: 'pv', inverter: 'inverter', battery: 'battery', heatpump: 'heatpump', swh: 'heatpump', ev: 'ev', meter: 'meter', envelope: 'envelope' };
export const shotOf = (parts: readonly Part[]): ShotId | null => (parts.length ? OF_PART[parts[0]] : null);

export const sceneSrcset = (name: string, widths: number[]) => widths.map((w) => `/scenes/${name}-${w}.webp ${w}w`).join(', ');
