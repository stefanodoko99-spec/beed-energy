// Micro-interactions that need a script (the CSS ones are in global.css "micro-interactions"): a small burst of
// green and amber sparks from a pressed filled button, and the basket button's green tick once the server said yes.
import { motionOn } from './motion';

const COLOURS = ['var(--leaf-bright)', 'var(--sun)', 'var(--glow)'];

document.addEventListener('pointerdown', (e) => {
  if (e.button !== 0 || !motionOn() || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!(e.target as Element).closest('.btn:not(.btn--ghost), [data-spark]')) return;
  burst(e.clientX, e.clientY);
});

function burst(x: number, y: number, n = 9) {
  const box = document.createElement('span');
  box.className = 'spark-burst';
  box.setAttribute('aria-hidden', 'true');
  box.style.left = `${x}px`;
  box.style.top = `${y}px`;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + Math.random() * 0.5;
    const d = 16 + Math.random() * 18;
    const s = document.createElement('i');
    s.style.setProperty('--dx', `${(Math.cos(a) * d).toFixed(1)}px`);
    s.style.setProperty('--dy', `${(Math.sin(a) * d).toFixed(1)}px`);
    s.style.background = COLOURS[i % COLOURS.length];
    box.append(s);
  }
  document.body.append(box);
  setTimeout(() => box.remove(), 650);
}

/** The basket button turns green with a tick for a moment once the item is in (the colour shows with motion off too). */
export function confirmButton(btn: HTMLElement | null) {
  if (!btn) return;
  btn.classList.remove('is-done');
  void btn.offsetWidth; // restart the pop when added twice in a row
  btn.classList.add('is-done');
  setTimeout(() => btn.classList.remove('is-done'), 1400);
}
