// Read side of the marketplace: categories, spec templates, product cards, product pages,
// offers from several sellers, price history and side-by-side comparison.
// The catalogue is small (hundreds of products), so filtering and facet counts run in JS
// over one query per category, which keeps every filter combinable.
import { all, get } from './db';
import type { Lang } from './i18n';
import { num } from './money';
import { specTextSq } from '../i18n/spec-values';

export type Option = { value: string; sq: string; en: string };
export type Attr = {
  id: number;
  category_id: number;
  key: string;
  label_sq: string;
  label_en: string;
  unit: string;
  type: 'number' | 'text' | 'enum' | 'bool';
  options: Option[];
  filterable: boolean;
  comparable: boolean;
  highlight: boolean;
  required: boolean;
  better: 'higher' | 'lower' | null;
  decimals: number;
  sort: number;
};

export type Category = {
  id: number;
  slug_sq: string;
  slug_en: string;
  name_sq: string;
  name_en: string;
  group_key: string;
  intro_sq: string;
  intro_en: string;
  unit_basis: string | null;
  unit_label_sq: string | null;
  unit_label_en: string | null;
  sort: number;
  product_count?: number;
  min_price?: number | null;
  /** A photo for the category's row in the shop: the main photo of one of its products. */
  cover?: string | null;
};

export type SpecValue = number | string | boolean | null;

export type ProductCard = {
  id: number;
  slug: string;
  brand: string;
  model: string;
  name_sq: string;
  name_en: string;
  summary_sq: string;
  summary_en: string;
  category_id: number;
  width_mm: number | null;
  height_mm: number | null;
  depth_mm: number | null;
  weight_kg: number | null;
  warranty_years: number | null;
  featured: number;
  created_at: string;
  offer_count: number;
  min_price: number | null;
  max_price: number | null;
  compare_at: number | null;
  total_stock: number;
  fastest_days: number | null;
  promoted: number;
  image: string | null;
  specs: Record<string, SpecValue>;
  unit_price: number | null;
};

const toAttr = (r: any): Attr => ({
  ...r,
  options: safeJson(r.options_json, []),
  filterable: !!r.filterable,
  comparable: !!r.comparable,
  highlight: !!r.highlight,
  required: !!r.required,
});

function safeJson<T>(s: string | null | undefined, fallback: T): T {
  if (!s) return fallback;
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}

export async function categories(): Promise<Category[]> {
  return await all<Category>(
    `SELECT c.*,
            (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.status = 'published') AS product_count,
            (SELECT MIN(o.price_all) FROM offers o JOIN products p ON p.id = o.product_id
              WHERE p.category_id = c.id AND p.status = 'published' AND o.active = 1) AS min_price,
            (SELECT pi.path FROM product_images pi JOIN products p ON p.id = pi.product_id
              WHERE p.category_id = c.id AND p.status = 'published' ORDER BY p.featured DESC, pi.sort, pi.id LIMIT 1) AS cover
       FROM categories c WHERE c.active = 1 ORDER BY c.sort, c.id`,
  );
}

export async function categoryBySlug(slug: string, lang: Lang): Promise<Category | undefined> {
  return await get<Category>(`SELECT * FROM categories WHERE ${lang === 'sq' ? 'slug_sq' : 'slug_en'} = ? AND active = 1`, slug);
}

export async function categoryById(id: number): Promise<Category | undefined> {
  return await get<Category>('SELECT * FROM categories WHERE id = ?', id);
}

export async function attributes(categoryId: number): Promise<Attr[]> {
  return (await all('SELECT * FROM spec_attributes WHERE category_id = ? ORDER BY sort, id', categoryId)).map(toAttr);
}

async function specsFor(productIds: number[]): Promise<Map<number, Record<string, SpecValue>>> {
  const out = new Map<number, Record<string, SpecValue>>();
  if (!productIds.length) return out;
  const rows = await all<{ product_id: number; key: string; type: string; value_num: number | null; value_text: string | null }>(
    `SELECT ps.product_id, a.key, a.type, ps.value_num, ps.value_text
       FROM product_specs ps JOIN spec_attributes a ON a.id = ps.attribute_id
      WHERE ps.product_id IN (${productIds.map(() => '?').join(',')})`,
    ...productIds,
  );
  for (const r of rows) {
    const m = out.get(r.product_id) ?? {};
    m[r.key] = r.type === 'number' ? r.value_num : r.type === 'bool' ? r.value_num === 1 : r.value_text;
    out.set(r.product_id, m);
  }
  return out;
}

const CARD_SQL = `
  SELECT p.id, p.slug, p.brand, p.model, p.name_sq, p.name_en, p.summary_sq, p.summary_en, p.category_id,
         p.width_mm, p.height_mm, p.depth_mm, p.weight_kg, p.warranty_years, p.featured, p.created_at,
         COUNT(o.id) AS offer_count,
         MIN(o.price_all) AS min_price,
         MAX(o.price_all) AS max_price,
         (SELECT o2.compare_at_all FROM offers o2 WHERE o2.product_id = p.id AND o2.active = 1 ORDER BY o2.price_all LIMIT 1) AS compare_at,
         COALESCE(SUM(o.stock_qty), 0) AS total_stock,
         MIN(CASE WHEN o.stock_qty > 0 THEN o.lead_days END) AS fastest_days,
         COALESCE(MAX(o.promoted), 0) AS promoted,
         (SELECT path FROM product_images i WHERE i.product_id = p.id ORDER BY sort LIMIT 1) AS image
    FROM products p
    LEFT JOIN offers o ON o.product_id = p.id AND o.active = 1
           AND o.seller_id IN (SELECT id FROM sellers WHERE status = 'active')`;

async function withSpecs(rows: Omit<ProductCard, 'specs' | 'unit_price'>[], unitBasis: (catId: number) => string | null): Promise<ProductCard[]> {
  const specs = await specsFor(rows.map((r) => r.id));
  return rows.map((r) => {
    const s = specs.get(r.id) ?? {};
    const basis = unitBasis(r.category_id);
    const v = basis ? s[basis] : null;
    const unit_price = basis && typeof v === 'number' && v > 0 && r.min_price ? r.min_price / v : null;
    return { ...r, specs: s, unit_price };
  });
}

async function basisLookup(): Promise<(id: number) => string | null> {
  const map = new Map((await all<{ id: number; unit_basis: string | null }>('SELECT id, unit_basis FROM categories')).map((c) => [c.id, c.unit_basis]));
  return (id) => map.get(id) ?? null;
}

export async function productsInCategory(categoryId: number): Promise<ProductCard[]> {
  const rows = await all<any>(`${CARD_SQL} WHERE p.category_id = ? AND p.status = 'published' GROUP BY p.id`, categoryId);
  return withSpecs(rows, await basisLookup());
}

export async function featuredProducts(limit = 8): Promise<ProductCard[]> {
  const rows = await all<any>(
    `${CARD_SQL} WHERE p.status = 'published' GROUP BY p.id HAVING offer_count > 0 ORDER BY p.featured DESC, offer_count DESC, p.id LIMIT ?`,
    limit,
  );
  return withSpecs(rows, await basisLookup());
}

export async function productCardsByIds(ids: number[]): Promise<ProductCard[]> {
  if (!ids.length) return [];
  const rows = await all<any>(`${CARD_SQL} WHERE p.id IN (${ids.map(() => '?').join(',')}) AND p.status = 'published' GROUP BY p.id`, ...ids);
  const cards = await withSpecs(rows, await basisLookup());
  return ids.map((id) => cards.find((c) => c.id === id)).filter(Boolean) as ProductCard[];
}

export async function searchProducts(q: string, limit = 40): Promise<ProductCard[]> {
  const terms = fold(q).split(/\s+/).filter((t) => t.length > 1).slice(0, 6);
  if (!terms.length) return [];
  const rows = await all<any>(`${CARD_SQL} WHERE p.status = 'published' GROUP BY p.id`);
  const cats = new Map((await all<Category>('SELECT * FROM categories')).map((c) => [c.id, c]));
  const hits = rows
    .map((r) => {
      const c = cats.get(r.category_id);
      const hay = fold([r.brand, r.model, r.name_sq, r.name_en, r.summary_sq, r.summary_en, c?.name_sq, c?.name_en].join(' '));
      const score = terms.reduce((s, t) => s + (hay.includes(t) ? (fold(r.brand + ' ' + r.model).includes(t) ? 3 : 1) : -100), 0);
      return { r, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.r);
  return withSpecs(rows.filter((r) => hits.includes(r)).sort((a, b) => hits.indexOf(a) - hits.indexOf(b)), await basisLookup());
}

/** Lower-case and strip diacritics so "ngrohes" finds "ngrohës" and "celes" finds "çelës". */
export function fold(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

// ---------- filters ----------

export type FilterState = {
  brands: string[];
  priceMin: number | null;
  priceMax: number | null;
  inStock: boolean;
  ranges: Record<string, { min: number | null; max: number | null }>;
  sets: Record<string, string[]>;
  sort: 'recommended' | 'price-asc' | 'price-desc' | 'unit-asc' | 'offers' | 'newest';
};

export function readFilters(params: URLSearchParams, attrs: Attr[]): FilterState {
  const n = (k: string) => {
    const v = params.get(k);
    if (v === null || v.trim() === '') return null;
    const x = Number(v.replace(',', '.'));
    return Number.isFinite(x) ? x : null;
  };
  const list = (k: string) => (params.get(k) ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  const f: FilterState = {
    brands: list('brand'),
    priceMin: n('min'),
    priceMax: n('max'),
    inStock: params.get('stock') === '1',
    ranges: {},
    sets: {},
    sort: (['recommended', 'price-asc', 'price-desc', 'unit-asc', 'offers', 'newest'] as const).includes(params.get('sort') as any)
      ? (params.get('sort') as FilterState['sort'])
      : 'recommended',
  };
  for (const a of attrs.filter((a) => a.filterable)) {
    if (a.type === 'number') {
      const min = n(`${a.key}_min`);
      const max = n(`${a.key}_max`);
      if (min !== null || max !== null) f.ranges[a.key] = { min, max };
    } else {
      const v = list(a.key);
      if (v.length) f.sets[a.key] = v;
    }
  }
  return f;
}

function valueKey(v: SpecValue): string {
  return typeof v === 'boolean' ? (v ? '1' : '0') : String(v ?? '');
}

function passes(p: ProductCard, f: FilterState, skip?: string): boolean {
  if (skip !== 'brand' && f.brands.length && !f.brands.includes(p.brand)) return false;
  if (f.priceMin !== null && (p.min_price ?? Infinity) < f.priceMin) return false;
  if (f.priceMax !== null && (p.min_price ?? Infinity) > f.priceMax) return false;
  if (f.inStock && p.total_stock <= 0) return false;
  for (const [k, r] of Object.entries(f.ranges)) {
    const v = p.specs[k];
    if (typeof v !== 'number') return false;
    if (r.min !== null && v < r.min) return false;
    if (r.max !== null && v > r.max) return false;
  }
  for (const [k, set] of Object.entries(f.sets)) {
    if (k === skip) continue;
    if (!set.includes(valueKey(p.specs[k] ?? null))) return false;
  }
  return true;
}

export type Facet = {
  attr: Attr | null; // null = brand
  key: string;
  values?: { value: string; label_sq: string; label_en: string; count: number; checked: boolean }[];
  range?: { lo: number; hi: number; min: number | null; max: number | null };
};

export function applyFilters(cards: ProductCard[], f: FilterState, attrs: Attr[]) {
  const items = cards.filter((p) => passes(p, f));
  const rank = (p: ProductCard) => (p.offer_count > 0 ? 0 : 1);
  const by: Record<FilterState['sort'], (a: ProductCard, b: ProductCard) => number> = {
    recommended: (a, b) => rank(a) - rank(b) || b.promoted - a.promoted || b.featured - a.featured || b.offer_count - a.offer_count || a.name_en.localeCompare(b.name_en),
    'price-asc': (a, b) => rank(a) - rank(b) || (a.min_price ?? 0) - (b.min_price ?? 0),
    'price-desc': (a, b) => rank(a) - rank(b) || (b.min_price ?? 0) - (a.min_price ?? 0),
    'unit-asc': (a, b) => rank(a) - rank(b) || (a.unit_price ?? Infinity) - (b.unit_price ?? Infinity),
    offers: (a, b) => b.offer_count - a.offer_count,
    newest: (a, b) => b.created_at.localeCompare(a.created_at),
  };
  items.sort(by[f.sort]);

  const facets: Facet[] = [];
  const brands = [...new Set(cards.map((c) => c.brand))].sort();
  facets.push({
    attr: null,
    key: 'brand',
    values: brands.map((b) => ({
      value: b,
      label_sq: b,
      label_en: b,
      checked: f.brands.includes(b),
      count: cards.filter((p) => p.brand === b && passes(p, f, 'brand')).length,
    })),
  });
  for (const a of attrs.filter((a) => a.filterable)) {
    if (a.type === 'number') {
      const vals = cards.map((c) => c.specs[a.key]).filter((v): v is number => typeof v === 'number');
      if (!vals.length) continue;
      const r = f.ranges[a.key];
      facets.push({ attr: a, key: a.key, range: { lo: Math.min(...vals), hi: Math.max(...vals), min: r?.min ?? null, max: r?.max ?? null } });
    } else {
      const seen = [...new Set(cards.map((c) => valueKey(c.specs[a.key] ?? null)).filter((v) => v !== '' && v !== 'null'))].sort();
      if (!seen.length) continue;
      facets.push({
        attr: a,
        key: a.key,
        values: seen.map((v) => {
          const opt = a.options.find((o) => o.value === v);
          const lbl = a.type === 'bool' ? (v === '1' ? ['Po', 'Yes'] : ['Jo', 'No']) : [opt?.sq ?? specTextSq(v), opt?.en ?? v];
          return {
            value: v,
            label_sq: lbl[0],
            label_en: lbl[1],
            checked: (f.sets[a.key] ?? []).includes(v),
            count: cards.filter((p) => valueKey(p.specs[a.key] ?? null) === v && passes(p, f, a.key)).length,
          };
        }),
      });
    }
  }
  return { items, facets };
}

// ---------- product page ----------

export type Offer = {
  id: number;
  product_id: number;
  seller_id: number;
  price_all: number;
  compare_at_all: number | null;
  stock_qty: number;
  lead_days: number;
  min_qty: number;
  delivery_fee_all: number;
  free_delivery_over_all: number | null;
  installation_available: number;
  note_sq: string;
  note_en: string;
  promoted: number;
  updated_at: string;
  seller_slug: string;
  seller_name: string;
  seller_kind: string;
  seller_verified: number;
  seller_rating: number | null;
  seller_rating_count: number;
  seller_phone: string | null;
  seller_city_sq: string | null;
  seller_city_en: string | null;
  seller_zones: string;
  tiers: { min_qty: number; price_all: number }[];
};

export async function productBySlug(slug: string) {
  return await get<any>("SELECT * FROM products WHERE slug = ? AND status = 'published'", slug);
}

export async function productSpecs(productId: number, categoryId: number) {
  const attrs = await attributes(categoryId);
  const vals = (await specsFor([productId])).get(productId) ?? {};
  return attrs.map((a) => ({ attr: a, value: vals[a.key] ?? null })).filter((x) => x.value !== null && x.value !== '');
}

export async function productImages(productId: number) {
  return await all<{ id: number; path: string; width: number | null; height: number | null; alt_sq: string; alt_en: string }>(
    'SELECT * FROM product_images WHERE product_id = ? ORDER BY sort, id',
    productId,
  );
}

export async function offersFor(productId: number): Promise<Offer[]> {
  const offers = await all<Offer>(
    `SELECT o.*, s.slug AS seller_slug, s.name AS seller_name, s.kind AS seller_kind, s.verified AS seller_verified,
            s.rating AS seller_rating, s.rating_count AS seller_rating_count, s.delivery_zones AS seller_zones, s.phone AS seller_phone,
            c.name_sq AS seller_city_sq, c.name_en AS seller_city_en
       FROM offers o JOIN sellers s ON s.id = o.seller_id LEFT JOIN cities c ON c.id = s.city_id
      WHERE o.product_id = ? AND o.active = 1 AND s.status = 'active'
      ORDER BY o.price_all`,
    productId,
  );
  const tiers = await all<{ offer_id: number; min_qty: number; price_all: number }>(
    `SELECT * FROM offer_tiers WHERE offer_id IN (SELECT id FROM offers WHERE product_id = ?) ORDER BY min_qty`,
    productId,
  );
  for (const o of offers) o.tiers = tiers.filter((t) => t.offer_id === o.id).map(({ min_qty, price_all }) => ({ min_qty, price_all }));
  return offers;
}

/** Unit price for a quantity, after volume tiers. */
export function unitPriceFor(offer: Pick<Offer, 'price_all' | 'tiers'>, qty: number): number {
  let p = offer.price_all;
  for (const t of offer.tiers ?? []) if (qty >= t.min_qty && t.price_all < p) p = t.price_all;
  return p;
}

/** Lowest active price per day for the last `days` days, for the product's price-history line. */
export async function priceHistory(productId: number, days = 90) {
  return await all<{ day: string; low: number; high: number }>(
    `SELECT date(h.recorded_at) AS day, MIN(h.price_all) AS low, MAX(h.price_all) AS high
       FROM price_history h JOIN offers o ON o.id = h.offer_id
      WHERE o.product_id = ? AND h.recorded_at >= datetime('now', ?)
      GROUP BY date(h.recorded_at) ORDER BY day`,
    productId,
    `-${days} days`,
  );
}

export async function related(product: { id: number; category_id: number }, limit = 4): Promise<ProductCard[]> {
  const rows = await all<any>(
    `${CARD_SQL} WHERE p.category_id = ? AND p.id != ? AND p.status = 'published' GROUP BY p.id HAVING offer_count > 0 ORDER BY p.featured DESC, offer_count DESC LIMIT ?`,
    product.category_id,
    product.id,
    limit,
  );
  return withSpecs(rows, await basisLookup());
}

// ---------- formatting ----------

export function attrLabel(a: Pick<Attr, 'label_sq' | 'label_en'>, lang: Lang) {
  return lang === 'sq' ? a.label_sq : a.label_en;
}

export function formatSpec(a: Attr, v: SpecValue, lang: Lang): string {
  if (v === null || v === undefined || v === '') return '—';
  if (a.type === 'bool') return v ? (lang === 'sq' ? 'Po' : 'Yes') : lang === 'sq' ? 'Jo' : 'No';
  if (a.type === 'enum') {
    const o = a.options.find((x) => x.value === String(v));
    return o ? o[lang] : String(v);
  }
  if (a.type === 'number' && typeof v === 'number') {
    const d = a.decimals ?? (Number.isInteger(v) ? 0 : 1);
    return `${num(v, d, lang)}${a.unit ? ' ' + a.unit : ''}`;
  }
  const text = lang === 'sq' && typeof v === 'string' ? specTextSq(v) : String(v);
  return `${text}${a.unit && a.type !== 'text' ? ' ' + a.unit : ''}`;
}

/** For comparison tables: which product ids hold the best value of a comparable numeric attribute. */
export function bestOf(a: Attr, values: { id: number; v: SpecValue }[]): Set<number> {
  if (!a.better || a.type !== 'number') return new Set();
  const nums = values.filter((x): x is { id: number; v: number } => typeof x.v === 'number');
  if (nums.length < 2) return new Set();
  const target = a.better === 'higher' ? Math.max(...nums.map((x) => x.v)) : Math.min(...nums.map((x) => x.v));
  if (nums.every((x) => x.v === target)) return new Set();
  return new Set(nums.filter((x) => x.v === target).map((x) => x.id));
}
