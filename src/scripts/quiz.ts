// The system quiz (views/Quiz.astro): one question at a time, then the calculator's result from /api/solar.
// Without this script the form is a plain GET to the calculator.
import { lek, num } from '../lib/money';
import type { Lang } from '../lib/i18n';

const root = document.querySelector<HTMLElement>('[data-quiz]');
const form = root?.querySelector<HTMLFormElement>('[data-quiz-form]');
if (root && form) {
  const lang = (root.dataset.lang === 'en' ? 'en' : 'sq') as Lang;
  const words = JSON.parse(root.dataset.words ?? '{}') as { step: string[]; loading: string; line: string; saving: string; payback: string };
  const steps = [...form.querySelectorAll<HTMLElement>('[data-step]')];
  const back = form.querySelector<HTMLButtonElement>('[data-quiz-back]')!;
  const next = form.querySelector<HTMLButtonElement>('[data-quiz-next]')!;
  const submit = form.querySelector<HTMLButtonElement>('[data-quiz-submit]')!;
  const progress = root.querySelector<HTMLElement>('[data-quiz-progress]')!;
  const result = root.querySelector<HTMLElement>('[data-quiz-result]')!;
  let at = 0;
  const show = (i: number) => {
    at = Math.max(0, Math.min(steps.length - 1, i));
    steps.forEach((s, k) => (s.hidden = k !== at));
    back.hidden = at === 0;
    next.hidden = at === steps.length - 1;
    submit.hidden = at !== steps.length - 1;
    progress.hidden = false;
    progress.textContent = words.step[at] ?? '';
    root.style.setProperty('--qz', String((at + 1) / steps.length));
    steps[at].querySelector<HTMLElement>('input:checked, select, input')?.focus({ preventScroll: true });
  };
  next.addEventListener('click', () => show(at + 1));
  back.addEventListener('click', () => show(at - 1));
  // a choice moves on by itself (except the last question, which asks for the button)
  form.addEventListener('change', (e) => {
    const t = e.target as HTMLInputElement;
    if (t.type === 'radio' && at < steps.length - 1) setTimeout(() => show(at + 1), 220);
  });
  root.querySelector('[data-quiz-again]')?.addEventListener('click', () => {
    result.hidden = true;
    form.hidden = false;
    show(0);
  });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const q = new URLSearchParams(new FormData(form) as unknown as Record<string, string>);
    const details = `${form.action}?${q}`;
    form.hidden = true;
    progress.textContent = words.loading;
    try {
      const r = await fetch(`/api/solar?${q}`, { headers: { accept: 'application/json' } });
      const out = await r.json();
      if (!out.ok) throw new Error('calc');
      const set = (sel: string, text: string) => { const el = result.querySelector<HTMLElement>(sel); if (el) { el.textContent = text; el.hidden = !text; } };
      set('[data-r-line]', words.line.replace('{kwp}', num(out.kwp, 1, lang)).replace('{panels}', String(out.panels)));
      set('[data-r-saving]', out.annualSaving != null ? words.saving.replace('{s}', lek(Math.round(out.annualSaving), lang)) : '');
      set('[data-r-payback]', out.paybackYears != null ? words.payback.replace('{y}', num(out.paybackYears, 1, lang)) : '');
      set('[data-r-total]', out.kitTotal != null ? lek(out.kitTotal, lang) : '—');
      const kit = result.querySelector<HTMLElement>('[data-r-kit]');
      kit?.replaceChildren(...(out.kit as { name: string; qty: number }[]).map((k) => { const li = document.createElement('li'); li.textContent = `${k.qty} × ${k.name}`; return li; }));
      result.querySelector<HTMLAnchorElement>('[data-r-details]')!.href = details;
      progress.hidden = true;
      result.hidden = false;
      result.querySelector<HTMLElement>('h2')?.focus();
    } catch {
      // the calculator page shows the same result, and the errors next to the fields
      location.href = details;
    }
  });
  show(0);
}
