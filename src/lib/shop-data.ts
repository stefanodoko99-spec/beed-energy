// Shop helpers on top of catalog.ts: price text in lekë only (consumer law 9902 art. 9.4: no euro amounts on public pages),
// cities for the delivery select, one offer's delivered total to a city (same rules as cart.ts await quote()),
// filter-URL normalising, drawing numbers and page-title fitting.
import { all, setting } from './db';
import { DEFAULT_DELIVERY, type DeliverySettings } from './cart';
import { unitPriceFor, type Offer } from './catalog';
import { lek, lekLong, num, displayCurrency } from './money';
import type { Lang } from './i18n';

const NBSP = ' ';

/** Price tags, table cells and offer rows: "124 900 L" / "124,900 ALL" — money.ts lek(), the form the basket lines use. */
export function price(n: number, lang: Lang): string {
  return lek(n, lang);
}

/** Sentences and totals: "124 900 lekë" / "124,900 ALL" — money.ts lekLong(). */
export function priceLong(n: number, lang: Lang): string {
  return lekLong(n, lang);
}

/** Price per unit basis, e.g. "11,9 lekë/Wp". Small values keep decimals. */
export function unitPrice(v: number, label: string, lang: Lang): string {
  // in euros when the visitor chose them (lib/currency.ts): "0,13 €/Wp"
  const cur = displayCurrency();
  if (cur?.cur === 'eur') {
    const e = v / cur.rate;
    return `${num(e, e < 10 ? 2 : e < 100 ? 1 : 0, lang)}${NBSP}${label.replace(/^(lekë|ALL)/, '€')}`;
  }
  const d = v < 10 ? 2 : v < 100 ? 1 : 0;
  return `${num(v, d, lang)}${NBSP}${label}`;
}

export type City = { id: number; slug: string; name_sq: string; name_en: string; zone: number };

export async function cities(): Promise<City[]> {
  return await all<City>('SELECT id, slug, name_sq, name_en, zone FROM cities ORDER BY sort, name_sq');
}

/** The admin's delivery settings over the defaults: the same object cart.ts quote() prices the basket with. */
export async function deliverySettings(): Promise<DeliverySettings> {
  return { ...DEFAULT_DELIVERY, ...(await setting<Partial<DeliverySettings>>('delivery', {})) };
}

export type OfferRow = Offer & {
  qty: number; // quantity the total is computed for (the offer's minimum)
  unit: number; // per-piece price at that quantity (after tiers)
  goods: number;
  fee: number | null; // null = does not deliver to the chosen city's zone
  free: boolean;
  total: number | null;
  perUnit: number | null; // price per unit basis (lekë/Wp …)
  isDemo: boolean;
  best: boolean;
  fastest: boolean;
};

/** One parcel from one seller, as the basket prices it: base fee + zone surcharge, free above the seller's threshold. */
export async function offerRows(offers: Offer[], city: City | null, basisValue: number | null): Promise<OfferRow[]> {
  const d = await deliverySettings();
  const zone = city?.zone ?? 1;
  const rows: OfferRow[] = offers.map((o) => {
    const qty = Math.max(1, o.min_qty);
    const unit = unitPriceFor(o, qty);
    const goods = unit * qty;
    const zones = String(o.seller_zones ?? '1,2,3').split(',').map((s) => s.trim());
    const delivers = zones.includes(String(zone));
    const free = o.free_delivery_over_all !== null && o.free_delivery_over_all !== undefined && goods >= o.free_delivery_over_all;
    const fee = !delivers ? null : free ? 0 : o.delivery_fee_all + (d.zoneSurcharge[String(zone)] ?? 0);
    return {
      ...o,
      qty,
      unit,
      goods,
      fee,
      free,
      total: fee === null ? null : goods + fee,
      perUnit: basisValue && basisValue > 0 ? o.price_all / basisValue : null,
      isDemo: !!(o as any).is_demo,
      best: false,
      fastest: false,
    };
  });
  // Offers you can buy now come first (in stock, delivers to the zone), each group by total delivered.
  const buyable = (r: OfferRow) => (r.stock_qty > 0 && r.total !== null ? 0 : 1);
  rows.sort((a, b) => buyable(a) - buyable(b) || (a.total ?? Infinity) - (b.total ?? Infinity) || a.price_all - b.price_all);
  const deliverable = rows.filter((r) => r.total !== null && r.stock_qty > 0);
  if (deliverable.length > 1) deliverable[0].best = true;
  const inStock = rows.filter((r) => r.stock_qty > 0 && r.fee !== null);
  if (inStock.length > 1) {
    const min = Math.min(...inStock.map((r) => r.lead_days));
    const fast = inStock.filter((r) => r.lead_days === min);
    // Only a real distinction: one offer is strictly fastest.
    if (fast.length === 1) fast[0].fastest = true;
  }
  return rows;
}

/** Checkbox groups send brand=A&brand=B; catalog.readFilters reads comma lists. Join repeats, drop empties. */
export function normaliseParams(params: URLSearchParams): URLSearchParams {
  const out = new URLSearchParams();
  const seen = new Map<string, string[]>();
  for (const [k, v] of params) {
    // Numbers typed as "12 000" or "12.000" (thousands) still read: strip spaces; a dot followed by 3 digits is grouping.
    const isNum = /^(min|max)$|_(min|max)$/.test(k);
    const val = isNum ? v.replace(/[\s  ]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '') : v.trim();
    if (!val) continue;
    seen.set(k, [...(seen.get(k) ?? []), ...val.split(',').map((s) => s.trim()).filter(Boolean)]);
  }
  for (const [k, vs] of seen) out.set(k, [...new Set(vs)].join(','));
  return out;
}

export function drawingNo(categoryId: number, productId: number): string {
  return `BD-${String(categoryId).padStart(2, '0')}-${String(productId).padStart(4, '0')}`;
}

export type Source = { url: string; label: string };

export function parseSources(json: string | null | undefined): Source[] {
  let raw: unknown = [];
  try {
    raw = JSON.parse(json || '[]');
  } catch {
    return [];
  }
  if (!Array.isArray(raw)) return [];
  return raw
    .map((s: any) => {
      const url = typeof s === 'string' ? s : s?.url ?? s?.href ?? '';
      if (!/^https?:\/\//.test(url)) return null;
      let label = typeof s === 'string' ? '' : s?.label ?? s?.title ?? s?.name ?? '';
      if (!label) {
        try {
          label = new URL(url).hostname.replace(/^www\./, '');
        } catch {
          label = url;
        }
      }
      return { url, label: String(label) };
    })
    .filter(Boolean) as Source[];
}

/** First candidate whose full title (with " · BeeD Energy") fits 25–65 characters; else the shortest, cut. */
export function fitTitle(candidates: string[]): string {
  const suffix = ' · BeeD Energy'.length;
  for (const c of candidates) if (c.length + suffix <= 65 && c.length + suffix >= 25) return c;
  const s = [...candidates].sort((a, b) => a.length - b.length)[0] ?? '';
  return s.length + suffix > 65 ? s.slice(0, 65 - suffix - 1).trimEnd() + '…' : s;
}

/** Clamp a meta description to 160 characters on a word boundary. */
export function fitDesc(s: string, max = 160): string {
  const t = s.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  return cut.slice(0, cut.lastIndexOf(' ')).replace(/[,.;:]$/, '') + '…';
}
