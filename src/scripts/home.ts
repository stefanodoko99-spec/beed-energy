// Home choreography. The stage is a film (public/scenes/stage-*, lib/stage-scenes.ts): the hero's dusk house with
// its equipment, pinned full screen, with the chapter cards pinned inside it. Scroll is the camera, and one timeline
// drives everything, so the picture, the card, the tag and the keys can never disagree: each chapter is one fixed
// step of scroll in which the camera flies in (scale and pan) to that chapter's equipment while its card rises,
// cuts to the close-up, which pushes in and orbits a few degrees in 3D while the card is read, then card and
// close-up leave together as the camera pulls back to the whole house. The finale switches the house on. Transform
// and opacity only, all through motion.ts (one GSAP ticker); scrubbed without lag, so it plays backwards too.
import { gsap, ScrollTrigger, motionOn, onMotionChange, getLenis } from './motion';
import { TALL_SHOTS } from '../lib/stage-scenes';

const stage = document.querySelector<HTMLElement>('[data-stage]');
const cine = document.querySelector<HTMLElement>('[data-cine]');
const view = cine?.querySelector<HTMLElement>('[data-view]') ?? null;
const cam = cine?.querySelector<HTMLElement>('[data-cam]') ?? null;
const frame = cine?.querySelector<HTMLElement>('[data-frame]') ?? null;
const glow = cine?.querySelector<HTMLElement>('[data-glow]') ?? null;
const mist = cine?.querySelector<HTMLElement>('[data-mist]') ?? null;
const dust = cine?.querySelector<HTMLElement>('[data-dust]') ?? null;
const spots = [...(frame?.querySelectorAll<HTMLElement>('.cine__spot') ?? [])]; // the chapters carry data-spot too
const shots = new Map([...(cine?.querySelectorAll<HTMLElement>('[data-shot]') ?? [])].map((el) => [Number(el.dataset.shot), el]));
const tags = new Map([...(cine?.querySelectorAll<HTMLElement>('[data-tag]') ?? [])].map((el) => [Number(el.dataset.tag), el]));
const chapters = [...document.querySelectorAll<HTMLElement>('[data-chapter]')];
const keys = [...document.querySelectorAll<HTMLAnchorElement>('[data-key-link]')];
const caption = document.querySelector<HTMLElement>('[data-caption-layer]');
const FINALE = Number(cine?.dataset.finale ?? chapters.length);
const FRAME_W = 1600;
const FRAME_H = 900;

let current = -1;
let triggers: ScrollTrigger[] = [];
let film: gsap.core.Timeline | null = null;
/** Where each chapter's step begins and where its card is fully read, in px of scroll from the moment the film
 *  pins (set by buildFilm, used by the keys, keyboard focus and #shtresa-N links). */
let steps = new Map<number, { from: number; read: number; to: number }>();
let unit = 1;

// ---------- the camera ----------
type Pose = { x: number; y: number; scale: number };
type Geo = { vw: number; vh: number; fw: number; fh: number; side: boolean };
const clamp = (v: number, a: number) => Math.max(-a, Math.min(a, v));

function geo(): Geo | null {
  if (!view || !frame) return null;
  // the cards cover the left of the shot on wide screens, the lower part on phones: what the camera looks at goes
  // right of them, or above them
  return { vw: view.clientWidth, vh: view.clientHeight, fw: frame.offsetWidth, fh: frame.offsetHeight, side: matchMedia('(min-width: 900.02px)').matches };
}

/** The whole house, a touch closer than the frame. */
const wide = (s = 1.06): Pose => ({ x: 0, y: 0, scale: s });

/** The camera on a spot of the wide shot (frame units): that spot moved to the screen's point of interest at
 *  `s` times, the frame always covering the view. 2D only: a 3D turn on a layer zoomed three times over is more
 *  than a compositor will draw (the page went blank in Chromium), so the 3D lives on the screen-sized close-ups. */
function pose(g: Geo, [sx, sy]: number[], s: number): Pose {
  const px = (sx / FRAME_W - 0.5) * g.fw;
  const py = (sy / FRAME_H - 0.5) * g.fh;
  const tx = (g.side ? 0.66 : 0.5) * g.vw - g.vw / 2;
  const ty = (g.side ? 0.46 : 0.3) * g.vh - g.vh / 2;
  return {
    x: clamp(tx - px * s, Math.max(0, (g.fw * s - g.vw) / 2)),
    y: clamp(ty - py * s, Math.max(0, (g.fh * s - g.vh) / 2)),
    scale: s,
  };
}

/** A close-up's push: scaled about its centre, slid so the equipment sits right of the cards (above them on
 *  phones) where it can, and turned `turn` degrees in perspective (the orbit). The slide keeps 8 % back, so the
 *  turned far edge never shows. */
function push(g: Geo, [fx, fy]: number[], s: number, turn: number) {
  const room = Math.max(0, (s - 1.08) / 2);
  const x = g.side ? (0.62 - fx * s - 0.5 * (1 - s)) * g.vw : 0;
  const y = g.side ? 0 : (0.3 - fy * s - 0.5 * (1 - s)) * g.vh;
  return { scale: s, x: clamp(x, room * g.vw), y: clamp(y, room * g.vh), rotationY: turn, rotationX: turn / -4, transformPerspective: 1400 };
}

// ---------- the live chapter: its key, its tag and the caption ----------
function setLayer(n: number) {
  if (n === current) return;
  current = n;
  stage?.setAttribute('data-active', String(n));
  if (n <= 0) stage?.removeAttribute('data-active');
  // only the live card takes clicks: the others are see-through and stacked in the same place
  chapters.forEach((c) => c.classList.toggle('is-active', Number(c.dataset.chapter) === n));
  keys.forEach((k) => (Number(k.dataset.keyLink) === n ? k.setAttribute('aria-current', 'step') : k.removeAttribute('aria-current')));
  // On narrow phones the key row scrolls sideways: bring the live key into view (scrollLeft only, no page scroll).
  const liveKey = keys.find((k) => Number(k.dataset.keyLink) === n);
  const row = liveKey?.parentElement;
  if (liveKey && row && row.scrollWidth > row.clientWidth) row.scrollLeft = liveKey.offsetLeft - (row.clientWidth - liveKey.offsetWidth) / 2;
  if (caption) {
    const ch = chapters.find((c) => Number(c.dataset.chapter) === n);
    const title = ch?.querySelector('h2')?.textContent ?? '';
    // chapters carry their key; the finale (the whole house switched on) is the title alone
    caption.textContent = !ch ? '' : n >= FINALE ? title : `${String(n).padStart(2, '0')} · ${title}`;
  }
  tags.forEach((tag, k) => {
    if (k === n) gsap.fromTo(tag, { autoAlpha: 0, y: 18, scale: 0.94 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.55, delay: 0.15, ease: 'back.out(1.6)', overwrite: true });
    else if (Number(gsap.getProperty(tag, 'opacity')) > 0) gsap.to(tag, { autoAlpha: 0, y: -10, duration: 0.25, ease: 'power1.in', overwrite: true });
  });
}

function buildFilm() {
  const g = geo();
  if (!g || !cine || !cam) return;
  // the pinned view is 100svh: a phone's toolbar coming and going does not change it, so the film keeps its length
  const vh = g.vh;
  unit = vh;
  // the film's length: a short establishing shot, one step per chapter, a longer step for the finale. Each step holds
  // its close-up and card for most of its length (2026-11-01, "it changes the product very fast"): 1.6 screens of
  // scroll on wide screens, 2.2 on phones, where one flick of the thumb travels several screens.
  const intro = 0.45 * vh;
  const step = (g.side ? 1.6 : 2.2) * vh;
  const ordered = chapters.map((c) => Number(c.dataset.chapter)).sort((a, b) => a - b);
  const total = intro + step * ordered.length + 0.3 * vh;
  cine.style.height = `${Math.round(total + vh)}px`;
  // every later tween starts from where the one before left it: none may render ahead of its turn
  const tl = gsap.timeline({ defaults: { ease: 'none', immediateRender: false } });
  const tall = matchMedia(TALL_SHOTS).matches; // the upright close-ups are showing (Home.astro <picture>)
  steps = new Map();

  // the establishing shot: a slow dolly in on the whole house, every spot lit, no card yet
  tl.fromTo(cam, { ...wide(1.16), x: -0.03 * g.vw }, { ...wide(), duration: intro, ease: 'power1.out', immediateRender: true }, 0);
  const cards = new Map(chapters.map((c) => [Number(c.dataset.chapter), c.querySelector<HTMLElement>('.chapter__card')]));
  gsap.set([...cards.values()].filter(Boolean), { autoAlpha: 0, y: 48 });
  if (glow) tl.set(glow, { opacity: 0 }, 0);
  // mist and dust drift against the camera at their own depths
  if (mist) tl.fromTo(mist, { xPercent: 6 }, { xPercent: -6, duration: total }, 0);
  if (dust) tl.fromTo(dust, { yPercent: 0 }, { yPercent: -18, duration: total }, 0);

  let from: Pose = wide();
  ordered.forEach((n, i) => {
    const a = intro + i * step;
    const ch = chapters.find((x) => Number(x.dataset.chapter) === n)!;
    const card = cards.get(n);
    const shot = shots.get(n);
    const last = i === ordered.length - 1;
    const end = last ? total : a + step;
    steps.set(n, { from: a, read: a + 0.55 * vh, to: end });
    // the card rises in as the camera arrives and leaves as it pulls back (the finale's stays)
    if (card) {
      tl.fromTo(card, { autoAlpha: 0, y: 48 }, { autoAlpha: 1, y: 0, duration: 0.28 * vh, ease: 'power2.out' }, a + 0.12 * vh);
      if (!last) tl.fromTo(card, { autoAlpha: 1, y: 0 }, { autoAlpha: 0, y: -40, duration: 0.22 * vh, ease: 'power1.in' }, end - 0.3 * vh);
    }
    if (n >= FINALE || !ch.dataset.spot || !shot) {
      // the finale: back to the whole house, which switches on, every spot lit
      tl.fromTo(cam, from, { ...wide(1.02), duration: 0.45 * vh, ease: 'power2.inOut' }, a);
      if (glow) tl.fromTo(glow, { opacity: 0 }, { opacity: 1, duration: 0.45 * vh, ease: 'power1.inOut' }, a + 0.1 * vh);
      tl.fromTo(spots, { scale: 0.4 }, { autoAlpha: 1, scale: 1, duration: 0.2 * vh, stagger: 0.04 * vh, ease: 'back.out(2)' }, a + 0.25 * vh);
      from = wide(1.02);
      return;
    }
    const spot = ch.dataset.spot.split(' ').map(Number);
    // phones: the house already fills an upright screen at about twice its pixels, so the flight stops short of
    // the wide-screen zoom and lets the sharp close-up do the rest
    const zoom = Math.min(Number(ch.dataset.zoom || 2.6), g.side ? 9 : 1.8);
    const focus = (ch.dataset.focus ?? '0.5 0.5').split(' ').map(Number);
    const near = pose(g, spot, zoom);
    const past = pose(g, spot, zoom * 1.22);
    // fly in on the equipment (the spots fade as the camera leaves the whole house)
    const cut = a + 0.4 * vh;
    tl.fromTo(cam, from, { ...near, duration: cut - a, ease: 'power2.inOut' }, a);
    tl.to(spots, { autoAlpha: 0, duration: 0.12 * vh }, a + 0.04 * vh);
    // keep going past it while the close-up cuts in over the top, then push in slowly while the card is read
    tl.fromTo(cam, near, { ...past, duration: 0.16 * vh, ease: 'power1.in' }, cut);
    tl.fromTo(shot, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.12 * vh }, cut);
    const out = end - 0.3 * vh;
    // the orbit turns the other way on every other chapter
    const turn = i % 2 ? -4 : 4;
    // upright screens: the close-up is already framed on its equipment (home.css), so it only pushes in, gently
    if (tall) tl.fromTo(shot, { scale: 1.02, rotationY: turn / 2, transformPerspective: 1400 }, { scale: 1.1, rotationY: turn * -0.3, transformPerspective: 1400, duration: out + 0.22 * vh - cut }, cut);
    else tl.fromTo(shot, push(g, focus, 1.12, turn), { ...push(g, focus, 1.24, turn * -0.6), duration: out + 0.22 * vh - cut }, cut);
    // close-up and card leave together, the camera pulls back to the whole house, spots on again
    tl.fromTo(shot, { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.22 * vh }, out);
    tl.fromTo(cam, past, { ...wide(1.1), duration: 0.3 * vh, ease: 'power2.out' }, out);
    tl.to(spots, { autoAlpha: 1, duration: 0.08 * vh }, out + 0.2 * vh);
    from = wide(1.1);
  });
  tl.set({}, {}, total);
  film = tl;
  // Touch screens scroll natively (motion.ts): when a swipe comes to rest, the film settles on the nearest card,
  // fully read, so a flick never leaves the picture between two chapters. Wheel scrolling (Lenis) stays free.
  const reads = [0, ...[...steps.values()].map((x) => x.read / total), 1];
  const snap = matchMedia('(hover: none) and (pointer: coarse)').matches ? { snapTo: reads, duration: { min: 0.25, max: 0.7 }, delay: 0.12, ease: 'power2.inOut' } : undefined;
  // no scrub lag: Lenis already smooths the scroll, and a second delay put the picture behind the words
  triggers.push(
    ScrollTrigger.create({
      trigger: cine,
      start: 'top top',
      end: () => `+=${total}`,
      scrub: true,
      snap,
      animation: tl,
      // the live chapter comes from the same clock as the camera
      onUpdate: (self) => setLayer(chapterAt(self.progress * total)),
      onLeaveBack: () => setLayer(0),
    }),
  );
}

/** The chapter whose step holds this point of the film (0 before the first card has risen). */
function chapterAt(t: number): number {
  let live = 0;
  for (const [n, s] of steps) if (t >= s.from + 0.1 * unit) live = n;
  return live;
}

/** Scroll the page to where a chapter's card is read (keys, keyboard focus, #shtresa-N links). */
function goTo(n: number, smooth = true) {
  const s = steps.get(n);
  if (!s || !cine) return;
  const top = cine.getBoundingClientRect().top + window.scrollY + s.read;
  const lenis = getLenis();
  if (lenis) lenis.scrollTo(top, { immediate: !smooth, duration: 1.4 });
  else window.scrollTo({ top, behavior: smooth ? 'smooth' : 'auto' });
}
keys.forEach((k) =>
  k.addEventListener('click', (e) => {
    if (!film) return;
    e.preventDefault();
    goTo(Number(k.dataset.keyLink));
  }),
);
// a keyboard user tabbing into a card that is not on screen yet: bring its chapter up
chapters.forEach((c) =>
  c.addEventListener('focusin', () => {
    const n = Number(c.dataset.chapter);
    if (film && n !== current) goTo(n, false);
  }),
);

/** Motion off: hand the film back to CSS (the still and the cards). */
function clearStage() {
  film?.kill();
  film = null;
  const cards = chapters.map((c) => c.querySelector<HTMLElement>('.chapter__card'));
  const els = [cam, glow, mist, dust, ...spots, ...shots.values(), ...tags.values(), ...cards].filter((e): e is HTMLElement => !!e);
  gsap.killTweensOf(els);
  gsap.set(els, { clearProps: 'transform,opacity,visibility' });
  cine?.style.removeProperty('height');
  steps = new Map();
  stage?.removeAttribute('data-active');
  chapters.forEach((c) => c.classList.remove('is-active'));
  keys.forEach((k) => k.removeAttribute('aria-current'));
  if (caption) caption.textContent = '';
  current = -1;
}

// ---------- "Pse tani": each number is a dimension line drawn from the left ----------
const dims = [...document.querySelectorAll<HTMLElement>('[data-dim]')];

function build() {
  triggers.forEach((t) => t.kill());
  triggers = [];
  clearStage();
  const dimEls = dims.flatMap((d) => [...d.querySelectorAll<HTMLElement>('[data-dim-rule], [data-dim-end], [data-dim-value], [data-dim-text]')]);
  if (!motionOn()) {
    // Static: the still of the house, every chapter a card with its close-up.
    gsap.killTweensOf(dimEls);
    gsap.set(dimEls, { clearProps: 'transform,opacity' });
    return;
  }
  buildFilm();
  setLayer(0);
  // Manifesto: words ink in as the paragraph crosses the screen.
  const words = gsap.utils.toArray<HTMLElement>('[data-manifesto] .w');
  if (words.length) {
    triggers.push(
      ScrollTrigger.create({
        trigger: '[data-manifesto]',
        start: 'top 80%',
        end: 'bottom 45%',
        scrub: true,
        onUpdate: (self) => {
          const lit = self.progress * words.length;
          words.forEach((w, i) => w.style.setProperty('--o', String(Math.min(1, Math.max(0.16, lit - i + 0.16)))));
        },
      }),
    );
  }
  // Dimension lines: the rule is drawn from its left tick, then the end tick, the value and the note appear.
  for (const d of dims) {
    const rule = d.querySelector('[data-dim-rule]');
    const end = d.querySelector('[data-dim-end]');
    const value = d.querySelector('[data-dim-value]');
    const text = d.querySelectorAll('[data-dim-text]');
    const tl = gsap.timeline({ scrollTrigger: { trigger: d, start: 'top 82%', once: true } });
    tl.fromTo(rule, { scaleX: 0 }, { scaleX: 1, duration: 0.9, ease: 'power2.inOut', immediateRender: true })
      .fromTo(end, { opacity: 0 }, { opacity: 1, duration: 0.15, ease: 'none', immediateRender: true }, '>-0.05')
      .fromTo(value, { opacity: 0 }, { opacity: 1, duration: 0.4, ease: 'power1.out', immediateRender: true }, 0.35)
      .fromTo(text, { opacity: 0 }, { opacity: 1, duration: 0.4, ease: 'power1.out', immediateRender: true }, 0.6);
    if (tl.scrollTrigger) triggers.push(tl.scrollTrigger);
  }
}

// The yearly production counter in the last chapter follows the chosen city.
const final = document.querySelector<HTMLElement>('[data-final]');
if (final) {
  const data: { s: string; y: number }[] = JSON.parse(final.dataset.cities ?? '[]');
  const sel = final.querySelector<HTMLSelectElement>('[data-final-city]');
  const out = final.querySelector<HTMLElement>('[data-final-num]');
  const sq = document.documentElement.lang === 'sq';
  // same grouping as the server render in Home.astro: a no-break space in Albanian, a comma in English
  const fmt = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, sq ? ' ' : ',');
  sel?.addEventListener('change', () => {
    const y = data.find((d) => d.s === sel.value)?.y ?? 0;
    if (!out) return;
    if (!motionOn()) {
      out.textContent = fmt(y);
      return;
    }
    const from = { v: Number(out.textContent?.replace(/\D/g, '') || 0) };
    gsap.to(from, { v: y, duration: 0.6, ease: 'power2.out', onUpdate: () => (out.textContent = fmt(from.v)) });
  });
}

// A new size (resize, rotation, the phone's toolbar): the camera's numbers are in pixels, so build it again.
if (view && 'ResizeObserver' in window) {
  let last = '';
  let timer = 0;
  new ResizeObserver(() => {
    const size = `${view.clientWidth}x${view.clientHeight}`;
    const first = !last;
    if (size === last) return;
    last = size;
    if (first || !motionOn()) return;
    clearTimeout(timer);
    timer = window.setTimeout(() => {
      const keep = current;
      build();
      ScrollTrigger.refresh();
      if (keep > 0) setLayer(keep);
    }, 150);
  }).observe(view);
}
document.addEventListener('beed:loaded', () => ScrollTrigger.refresh());
build();
onMotionChange(() => build());
// arriving on #shtresa-N: the chapters are stacked inside the pinned film, so go to where that card is read
const hashN = /^#shtresa-(\d+)$/.exec(location.hash);
if (hashN && film) requestAnimationFrame(() => goTo(Number(hashN[1]), false));
