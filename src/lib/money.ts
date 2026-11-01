// Prices are whole lekë with VAT included. Formatted by hand: Chrome ships no Albanian Intl data,
// so a client-side Intl.NumberFormat('sq') silently falls back to English separators.
import type { Lang } from './i18n';

const NBSP = ' ';
const THIN = ' ';

export const VAT_RATE = 0.2;

export function groupDigits(n: number, sep = THIN): string {
  const neg = n < 0;
  const s = Math.round(Math.abs(n)).toString();
  let out = '';
  for (let i = 0; i < s.length; i++) {
    if (i > 0 && (s.length - i) % 3 === 0) out += sep;
    out += s[i];
  }
  return (neg ? '−' : '') + out;
}

// The display currency. Amounts are always lekë; a visitor may choose to see euros (lib/currency.ts, cookie
// beed_cur). On the server the request's choice comes through currency.ts; in the browser from <html data-cur
// data-eur-rate> (Site.astro), so the basket and calculator scripts show the same currency as the page.
type Display = { cur: 'all' | 'eur'; rate: number };
let serverDisplay: (() => Display | undefined) | null = null;
export function setDisplaySource(fn: () => Display | undefined) {
  serverDisplay = fn;
}
/** The page's display currency (undefined = lekë), for formatters outside this file. */
export function displayCurrency(): Display | undefined {
  return display();
}
function display(): Display | undefined {
  if (typeof document !== 'undefined') {
    const d = document.documentElement.dataset;
    const rate = Number(d.eurRate);
    return d.cur === 'eur' && rate > 0 ? { cur: 'eur', rate } : undefined;
  }
  return serverDisplay?.();
}
/** € 1 249 — whole euros, cents under €100. */
function inEuro(all: number, rate: number, lang: Lang): string {
  const v = all / rate;
  if (v < 100) return `€${NBSP}${v.toFixed(2).replace('.', lang === 'sq' ? ',' : '.')}`;
  return `€${NBSP}${groupDigits(v, lang === 'sq' ? THIN : ',')}`;
}

/** 124 900 L — the short form Albanian price tags use (or euros, when the visitor chose them). */
export function lek(n: number, lang: Lang = 'sq'): string {
  const d = display();
  if (d?.cur === 'eur') return inEuro(n, d.rate, lang);
  return `${groupDigits(n, lang === 'sq' ? THIN : ',')}${NBSP}${lang === 'sq' ? 'L' : 'ALL'}`;
}

/** 124 900 lekë — the long form for sentences and totals (or euros, when the visitor chose them). */
export function lekLong(n: number, lang: Lang = 'sq'): string {
  const d = display();
  if (d?.cur === 'eur') return inEuro(n, d.rate, lang);
  return `${groupDigits(n, lang === 'sq' ? THIN : ',')}${NBSP}${lang === 'sq' ? 'lekë' : 'ALL'}`;
}

export function eur(n: number, decimals = 0): string {
  const fixed = n.toFixed(decimals);
  const [int, dec] = fixed.split('.');
  return `€${groupDigits(Number(int))}${dec ? ',' + dec : ''}`;
}

/** Decimal number with a comma in Albanian and a point in English. */
export function num(n: number | null | undefined, decimals = 0, lang: Lang = 'sq'): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  const fixed = Math.abs(n).toFixed(decimals);
  const [int, dec] = fixed.split('.');
  const grouped = groupDigits(Number(int), lang === 'sq' ? THIN : ',');
  return (n < 0 ? '−' : '') + grouped + (dec ? (lang === 'sq' ? ',' : '.') + dec : '');
}

/** VAT contained in a VAT-inclusive amount. */
export function vatOf(gross: number, rate = VAT_RATE): number {
  return Math.round(gross - gross / (1 + rate));
}

export function toEur(all: number, rate: number): number {
  return all / rate;
}
