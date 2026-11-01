// The system builder (views/Builder.astro): add up the picked parts, check them against the makers' data and fill
// the basket form (one add-many request through site.ts).
import { lek, num } from '../lib/money';
import type { Lang } from '../lib/i18n';

type P = { slug: string; offer: number; price: number; cat: string; s: Record<string, number | string | null> };
const el = document.getElementById('bd-data');
const form = document.querySelector<HTMLFormElement>('[data-builder-form]');
if (el && form) {
  const d = JSON.parse(el.textContent ?? '{}') as { lang: Lang; products: Record<string, P>; pairs: [string, string][]; yieldTirana: number; words: any };
  const w = d.words;
  const lang = d.lang;
  const pairs = new Set(d.pairs.map(([i, b]) => `${i}|${b}`));
  const $ = <T extends HTMLElement>(s: string) => document.querySelector<T>(s)!;
  const val = (name: string) => (form.querySelector<HTMLInputElement>(`input[name="${name}"]:checked`)?.value ?? '');
  const qty = (name: string) => Math.max(1, Math.min(200, Math.round(Number(form.querySelector<HTMLInputElement>(`input[name="${name}"]`)?.value) || 1)));
  const n = (v: unknown) => (typeof v === 'number' ? v : Number(v) || 0);

  function update() {
    const supply = Number(val('supply')) || 1;
    const panel = d.products[val('panel')];
    const inv = d.products[val('inverter')];
    const bat = d.products[val('battery')];
    const mount = d.products[val('mount')];
    const pq = qty('panelQty');
    const bq = qty('batteryQty');
    const mq = qty('mountQty');
    const kwp = panel ? (pq * n(panel.s.power_wp)) / 1000 : 0;
    const ac = inv ? n(inv.s.rated_ac_power_kw) : 0;
    const checks: [boolean, string][] = [];
    if (!panel || !inv) checks.push([false, w.bad.empty]);
    else {
      const max = n(inv.s.max_pv_power_kwp);
      if (max && kwp > max) checks.push([false, w.bad.tooMuch.replace('{max}', num(max, 1, lang))]);
      else checks.push([true, w.ok.fits]);
      const ratio = ac ? kwp / ac : 0;
      if (ratio && ratio < 0.75) checks.push([false, w.bad.ratioLow]);
      else if (ratio > 1.4) checks.push([false, w.bad.ratioHigh]);
      else if (ratio) checks.push([true, w.ok.ratio]);
      const ph = n(inv.s.phases) || 1;
      if (ph === 3 && supply === 1) checks.push([false, w.bad.phases3on1]);
      else if (ph === 1 && supply === 3) checks.push([false, w.bad.phases1on3]);
      else checks.push([true, w.ok.phases]);
      if (bat) {
        const hybrid = n(inv.s.hybrid) === 1 || n(inv.s.battery_ready) === 1;
        if (!hybrid) checks.push([false, w.bad.noHybrid]);
        else if (!pairs.has(`${inv.slug}|${bat.slug}`)) checks.push([false, w.bad.notListed]);
        else checks.push([true, w.ok.battery]);
      }
    }
    const lines: [P, number][] = [];
    if (panel) lines.push([panel, pq]);
    if (inv) lines.push([inv, 1]);
    if (bat) lines.push([bat, bq]);
    if (mount) lines.push([mount, mq]);
    const total = lines.reduce((s, [p, q]) => s + p.price * q, 0);
    $('[data-b-kwp]').textContent = kwp ? `${num(kwp, 2, lang)} kWp` : '—';
    $('[data-b-ratio]').textContent = kwp && ac ? num(kwp / ac, 2, lang) : '—';
    $('[data-b-prod]').textContent = kwp ? w.production.replace('{y}', num(Math.round(kwp * d.yieldTirana), 0, lang)) : '';
    $('[data-b-total]').textContent = total ? lek(total, lang) : '—';
    $('[data-b-checks]').replaceChildren(...checks.map(([ok, text]) => {
      const li = document.createElement('li');
      li.className = ok ? 'is-ok' : 'is-bad';
      li.innerHTML = `<span aria-hidden="true">${ok ? '✓' : '!'}</span>`;
      li.append(text);
      return li;
    }));
    $('[data-b-lines]').replaceChildren(...lines.flatMap(([p, q]) => {
      const a = document.createElement('input');
      a.type = 'hidden'; a.name = 'offerId'; a.value = String(p.offer);
      const b = document.createElement('input');
      b.type = 'hidden'; b.name = 'qty'; b.value = String(q);
      return [a, b];
    }));
    $<HTMLButtonElement>('[data-b-add]').disabled = !panel || !inv;
  }
  // Enter in a quantity field must not submit the picks
  form.addEventListener('submit', (e) => e.preventDefault());
  form.addEventListener('change', update);
  form.addEventListener('input', update);
  update();
}
