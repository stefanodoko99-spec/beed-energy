// Home choreography. The stage is a film (public/scenes/stage-*, lib/stage-scenes.ts): the hero's dusk house with
// its equipment, pinned full screen while the chapter cards scroll over it. Scroll is the camera: for each chapter
// it flies in (scale and pan) to that chapter's equipment on the house, cuts to the close-up, which keeps pushing
// in and orbits a few degrees in 3D while the card is read, then dissolves back to the whole house as the camera
// pulls out for the next one. The live chapter's tag shows its shelf and that shelf's most-offered product. The
// finale pulls back and switches the house on. Transform and opacity only, all through motion.ts (one GSAP
// ticker); the camera is one timeline scrubbed by the scroll, so it plays backwards just as well.
import { gsap, ScrollTrigger, motionOn, onMotionChange } from './motion';

const stage = document.querySelector<HTMLElement>('[data-stage]');
const cine = document.querySelector<HTMLElement>('[data-cine]');
const view = cine?.querySelector<HTMLElement>('[data-view]') ?? null;
const cam = cine?.querySelector<HTMLElement>('[data-cam]') ?? null;
const frame = cine?.querySelector<HTMLElement>('[data-frame]') ?? null;
const glow = cine?.querySelector<HTMLElement>('[data-glow]') ?? null;
const mist = cine?.querySelector<HTMLElement>('[data-mist]') ?? null;
const dust = cine?.querySelector<HTMLElement>('[data-dust]') ?? null;
const spots = [...(frame?.querySelectorAll<HTMLElement>('.cine__spot') ?? [])]; // the chapters carry data-spot too
const shots = new Map([...(cine?.querySelectorAll<HTMLImageElement>('[data-shot]') ?? [])].map((el) => [Number(el.dataset.shot), el]));
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

// ---------- the camera ----------
type Pose = { x: number; y: number; scale: number };
type Geo = { vw: number; vh: number; fw: number; fh: number; side: boolean };
const clamp = (v: number, a: number) => Math.max(-a, Math.min(a, v));

function geo(): Geo | null {
  if (!view || !frame) return null;
  // the cards cover the left of the shot on wide screens: what the camera looks at goes right of them
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
  const ty = (g.side ? 0.46 : 0.5) * g.vh - g.vh / 2;
  return {
    x: clamp(tx - px * s, Math.max(0, (g.fw * s - g.vw) / 2)),
    y: clamp(ty - py * s, Math.max(0, (g.fh * s - g.vh) / 2)),
    scale: s,
  };
}

/** A close-up's push: scaled about its centre, slid so the equipment sits right of the cards where it can, and
 *  turned `turn` degrees in perspective (the orbit). The slide keeps 8 % back, so the turned far edge never shows. */
function push(g: Geo, fx: number, s: number, turn: number) {
  const want = g.side ? (0.62 - fx * s - 0.5 * (1 - s)) * g.vw : 0;
  return { scale: s, x: clamp(want, Math.max(0, (s - 1.08) / 2) * g.vw), rotationY: turn, rotationX: turn / -4, transformPerspective: 1400 };
}

// ---------- the live chapter: its key, its tag and the caption ----------
function setLayer(n: number) {
  if (n === current) return;
  current = n;
  stage?.setAttribute('data-active', String(n));
  if (n <= 0) stage?.removeAttribute('data-active');
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

/** Scroll positions (px from the moment the shot pins) at which each chapter card is in the middle of what is
 *  left of the screen: the whole screen beside the cards, the part under the pinned band on phones. */
function centres(g: Geo): Map<number, { c: number; h: number }> {
  const top = cine!.getBoundingClientRect().top;
  const eye = g.side ? window.innerHeight / 2 : (g.vh + window.innerHeight) / 2;
  return new Map(chapters.map((c) => {
    const card = c.querySelector<HTMLElement>('.chapter__card') ?? c;
    const r = card.getBoundingClientRect();
    return [Number(c.dataset.chapter), { c: r.top - top + r.height / 2 - eye, h: r.height }];
  }));
}

function buildFilm() {
  const g = geo();
  if (!g || !cine || !cam) return;
  const vh = window.innerHeight;
  const total = Math.max(1, cine.offsetHeight - vh);
  const at = centres(g);
  // the camera's beat: a screen on wide screens, the strip under the pinned band on phones
  const u = g.side ? vh : vh - g.vh;
  // every later tween on the camera starts from where the one before left it: none may render ahead of its turn
  const tl = gsap.timeline({ defaults: { ease: 'none', immediateRender: false } });
  const ordered = chapters.map((c) => Number(c.dataset.chapter)).sort((a, b) => a - b);
  const flyAt = (n: number) => Math.max(0, (at.get(n)?.c ?? 0) - 0.75 * u);

  // the establishing shot: a slow dolly in on the whole house while it waits for the first card
  tl.fromTo(cam, { ...wide(1.16), x: -0.03 * g.vw }, { ...wide(), duration: Math.max(1, flyAt(ordered[0])), ease: 'power1.out', immediateRender: true }, 0);
  if (glow) tl.set(glow, { opacity: 0 }, 0);
  // mist and dust drift against the camera at their own depths
  if (mist) tl.fromTo(mist, { xPercent: 6 }, { xPercent: -6, duration: total }, 0);
  if (dust) tl.fromTo(dust, { yPercent: 0 }, { yPercent: -18, duration: total }, 0);

  let from: Pose = wide();
  ordered.forEach((n, i) => {
    const { c = 0, h = 0 } = at.get(n) ?? {};
    const fly = flyAt(n);
    const next = ordered[i + 1];
    const nextFly = next !== undefined ? flyAt(next) : total;
    const ch = chapters.find((x) => Number(x.dataset.chapter) === n)!;
    const shot = shots.get(n);
    if (n >= FINALE || !ch.dataset.spot || !shot) {
      // the finale: back to the whole house, which switches on, every spot lit
      tl.fromTo(cam, from, { ...wide(1.02), duration: 0.5 * u, ease: 'power2.inOut' }, fly);
      if (glow) tl.fromTo(glow, { opacity: 0 }, { opacity: 1, duration: 0.5 * u, ease: 'power1.inOut' }, fly + 0.15 * u);
      tl.fromTo(spots, { scale: 0.4 }, { autoAlpha: 1, scale: 1, duration: 0.2 * u, stagger: 0.04 * u, ease: 'back.out(2)' }, fly + 0.3 * u);
      from = wide(1.02);
      return;
    }
    const spot = ch.dataset.spot.split(' ').map(Number);
    const zoom = Number(ch.dataset.zoom || 2.6);
    const [fx] = (ch.dataset.focus ?? '0.5 0.5').split(' ').map(Number);
    const near = pose(g, spot, zoom);
    const past = pose(g, spot, zoom * 1.22);
    // fly in on the equipment while the card comes up (the spots fade as the camera leaves the whole house)
    const cut = fly + 0.45 * u;
    tl.fromTo(cam, from, { ...near, duration: cut - fly, ease: 'power2.inOut' }, fly);
    tl.to(spots, { autoAlpha: 0, duration: 0.15 * u }, fly + 0.05 * u);
    // keep going past it while the close-up cuts in over the top, then push in slowly on the close-up
    tl.fromTo(cam, near, { ...past, duration: 0.2 * u, ease: 'power1.in' }, cut);
    tl.fromTo(shot, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.14 * u }, cut);
    // the close-up holds while the card is read (a tall card holds it longer), then dissolves into the whole
    // house as the camera pulls back
    const out = Math.max(cut + 0.4 * u, Math.min(c + Math.max(0.35 * u, h / 2 - 0.2 * u), nextFly - 0.24 * u));
    // the orbit turns the other way on every other chapter
    const turn = i % 2 ? -4 : 4;
    tl.fromTo(shot, push(g, fx, 1.12, turn), { ...push(g, fx, 1.24, turn * -0.6), duration: out + 0.2 * u - cut }, cut);
    tl.fromTo(shot, { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.2 * u }, out);
    tl.fromTo(cam, past, { ...wide(1.1), duration: 0.22 * u, ease: 'power2.out' }, out - 0.02 * u);
    tl.to(spots, { autoAlpha: 1, duration: 0.1 * u }, out + 0.12 * u);
    from = wide(1.1);
  });
  tl.set({}, {}, total);
  film = tl;
  triggers.push(ScrollTrigger.create({ trigger: cine, start: 'top top', end: 'bottom bottom', scrub: 0.7, animation: tl }));

  // the live chapter: the card in the middle of the screen
  let first: ScrollTrigger | null = null;
  for (const c of chapters) {
    const n = Number(c.dataset.chapter);
    const st = ScrollTrigger.create({
      trigger: c,
      start: 'top 55%',
      end: 'bottom 45%',
      onToggle: (self) => {
        if (self.isActive) setLayer(n);
        // back above the first chapter (also after a jump straight to the top): the whole house again
        else if (self.direction < 0 && first && self.scroll() < first.start) setLayer(0);
      },
    });
    first ??= st;
    triggers.push(st);
  }
}

/** Motion off: hand the film back to CSS (the still and the cards). */
function clearStage() {
  film?.kill();
  film = null;
  const els = [cam, glow, mist, dust, ...spots, ...shots.values(), ...tags.values()].filter((e): e is HTMLElement => !!e);
  gsap.killTweensOf(els);
  gsap.set(els, { clearProps: 'transform,opacity,visibility' });
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
    const size = `${view.clientWidth}x${window.innerHeight}`;
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
