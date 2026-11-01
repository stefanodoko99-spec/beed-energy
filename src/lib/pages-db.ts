// Reads and writes for the content pages (calculator, sellers, sell with us, quote requests, contact).
// Every query is a prepared statement with bound parameters.
import { all, batch, get, run, setting, stmt } from './db';
import { randomToken } from './auth';
import type { Lang } from './i18n';

export type City = { id: number; slug: string; name_sq: string; name_en: string; lat: number | null; lon: number | null; zone: number; pv_yield: number | null; pv_monthly_json: string | null };

export async function allCities(): Promise<City[]> {
  return await all<City>('SELECT id, slug, name_sq, name_en, lat, lon, zone, pv_yield, pv_monthly_json FROM cities ORDER BY sort, id');
}

export async function pvCities(): Promise<City[]> {
  return (await allCities()).filter((c) => c.pv_yield !== null && c.pv_monthly_json);
}

export function cityName(c: Pick<City, 'name_sq' | 'name_en'>, lang: Lang) {
  return lang === 'sq' ? c.name_sq : c.name_en;
}

// ---------- sellers ----------

export type SellerRow = {
  id: number;
  slug: string;
  name: string;
  legal_name: string | null;
  nipt: string | null;
  kind: 'supplier' | 'installer' | 'manufacturer' | 'contractor';
  city_id: number | null;
  city_slug: string | null;
  city_sq: string | null;
  city_en: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  about_sq: string;
  about_en: string;
  verified: number;
  plan: string;
  rating: number | null;
  rating_count: number;
  delivery_zones: string;
  is_demo: number;
  joined_at: string;
  offer_count: number;
};

const SELLER_SQL = `
  SELECT s.id, s.slug, s.name, s.legal_name, s.nipt, s.kind, s.city_id, c.slug AS city_slug, c.name_sq AS city_sq, c.name_en AS city_en,
         s.address, s.phone, s.email, s.website, s.about_sq, s.about_en, s.verified, s.plan, s.rating, s.rating_count,
         s.delivery_zones, s.is_demo, s.joined_at,
         (SELECT COUNT(*) FROM offers o JOIN products p ON p.id = o.product_id
           WHERE o.seller_id = s.id AND o.active = 1 AND p.status = 'published') AS offer_count
    FROM sellers s LEFT JOIN cities c ON c.id = s.city_id
   WHERE s.status = 'active'`;

export async function activeSellers(kind?: string | null): Promise<SellerRow[]> {
  if (kind) return await all<SellerRow>(`${SELLER_SQL} AND s.kind = ? ORDER BY s.verified DESC, offer_count DESC, s.name`, kind);
  return await all<SellerRow>(`${SELLER_SQL} ORDER BY s.verified DESC, offer_count DESC, s.name`);
}

export async function sellerBySlug(slug: string): Promise<SellerRow | undefined> {
  return await get<SellerRow>(`${SELLER_SQL} AND s.slug = ?`, slug);
}

export async function sellerKindCounts(): Promise<Record<string, number>> {
  const rows = await all<{ kind: string; n: number }>("SELECT kind, COUNT(*) AS n FROM sellers WHERE status = 'active' GROUP BY kind");
  return Object.fromEntries(rows.map((r) => [r.kind, r.n]));
}

export type SellerOffer = {
  offer_id: number;
  slug: string;
  brand: string;
  model: string;
  name_sq: string;
  name_en: string;
  cat_sq: string;
  cat_en: string;
  cat_slug_sq: string;
  cat_slug_en: string;
  price_all: number;
  compare_at_all: number | null;
  stock_qty: number;
  lead_days: number;
  min_qty: number;
  is_demo: number;
};

export async function sellerOffers(sellerId: number): Promise<SellerOffer[]> {
  return await all<SellerOffer>(
    `SELECT o.id AS offer_id, p.slug, p.brand, p.model, p.name_sq, p.name_en, c.name_sq AS cat_sq, c.name_en AS cat_en,
            c.slug_sq AS cat_slug_sq, c.slug_en AS cat_slug_en, o.price_all, o.compare_at_all, o.stock_qty, o.lead_days, o.min_qty, o.is_demo
       FROM offers o JOIN products p ON p.id = o.product_id JOIN categories c ON c.id = p.category_id
      WHERE o.seller_id = ? AND o.active = 1 AND p.status = 'published'
      ORDER BY c.sort, p.brand, p.model`,
    sellerId,
  );
}

export function zones(s: Pick<SellerRow, 'delivery_zones'>): number[] {
  return s.delivery_zones
    .split(',')
    .map((z) => Number(z.trim()))
    .filter((z) => z >= 1 && z <= 3);
}

// ---------- settings ----------

export type Plan = { key: string; name: string; monthly_all: number | null; commission_pct: number | null; features_sq: string[]; features_en: string[] };
export async function plans(): Promise<Plan[]> {
  return await setting<Plan[]>('plans', []);
}

export type Contact = { email: string | null; phone: string | null; address: string | null; hours_sq: string | null; hours_en: string | null };
export async function contactSettings(): Promise<Contact> {
  return await setting<Contact>('contact', { email: null, phone: null, address: null, hours_sq: null, hours_en: null });
}

export async function categoryOptions() {
  return await all<{ id: number; slug_sq: string; slug_en: string; name_sq: string; name_en: string }>(
    'SELECT id, slug_sq, slug_en, name_sq, name_en FROM categories WHERE active = 1 ORDER BY sort, id',
  );
}

export async function productForQuote(slug: string) {
  return await get<{ id: number; slug: string; brand: string; model: string; name_sq: string; name_en: string }>(
    "SELECT id, slug, brand, model, name_sq, name_en FROM products WHERE slug = ? AND status = 'published'",
    slug,
  );
}

// ---------- quote requests ----------

export type QuoteRow = {
  id: number;
  code: string;
  token: string;
  status: 'open' | 'answered' | 'won' | 'closed';
  project_type: string;
  city_id: number | null;
  city_sq: string | null;
  city_en: string | null;
  name: string;
  phone: string;
  email: string | null;
  company: string | null;
  nipt: string | null;
  details: string;
  budget_all: number | null;
  items_json: string;
  lang: string;
  created_at: string;
};

export async function createQuote(q: {
  project_type: string;
  city_id: number;
  name: string;
  phone: string;
  email: string | null;
  company: string | null;
  nipt: string | null;
  details: string;
  budget_all: number | null;
  items: { productId: number; qty: number }[];
  lang: Lang;
  /** A visit request from the installer finder: the one installer it is addressed to. */
  seller_id?: number | null;
}): Promise<{ code: string; token: string }> {
  const token = randomToken(18);
  const tmp = `TMP-${randomToken(9)}`;
  const now = new Date();
  const yymm = `${String(now.getUTCFullYear()).slice(2)}${String(now.getUTCMonth() + 1).padStart(2, '0')}`;

  // The real code contains the row's own id, which does not exist until the INSERT runs. SQL builds
  // it in the same batch rather than a second round trip, so no row is ever visible with the TMP code.
  const results = await batch([
    stmt(
      `INSERT INTO quote_requests (code, token, project_type, city_id, name, phone, email, company, nipt, details, budget_all, items_json, lang, seller_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      tmp, token, q.project_type, q.city_id, q.name, q.phone, q.email, q.company, q.nipt, q.details, q.budget_all, JSON.stringify(q.items), q.lang, q.seller_id ?? null,
    ),
    stmt(`UPDATE quote_requests SET code = 'RFQ-' || ? || '-' || printf('%05d', id) WHERE id = last_insert_rowid()`, yymm),
  ]);
  return { code: `RFQ-${yymm}-${String(results[0].id).padStart(5, '0')}`, token };
}

/** The thread only opens with the right token; compares in constant time. */
export async function quoteByCode(code: string, token: string | null): Promise<QuoteRow | undefined> {
  if (!token) return undefined;
  const q = await get<QuoteRow>(
    `SELECT q.*, c.name_sq AS city_sq, c.name_en AS city_en FROM quote_requests q LEFT JOIN cities c ON c.id = q.city_id WHERE q.code = ?`,
    code,
  );
  if (!q) return undefined;
  const a = Buffer.from(q.token);
  const b = Buffer.from(token);
  if (a.length !== b.length) return undefined;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0 ? q : undefined;
}

export type ThreadMessage = { id: number; author_role: 'buyer' | 'seller' | 'admin'; seller_name: string | null; seller_slug: string | null; seller_demo: number | null; body: string; price_all: number | null; created_at: string };

export async function quoteMessages(quoteId: number): Promise<ThreadMessage[]> {
  return await all<ThreadMessage>(
    `SELECT m.id, m.author_role, s.name AS seller_name, s.slug AS seller_slug, s.is_demo AS seller_demo, m.body, m.price_all, m.created_at
       FROM messages m LEFT JOIN sellers s ON s.id = m.seller_id
      WHERE m.thread_type = 'rfq' AND m.thread_id = ? ORDER BY m.created_at, m.id`,
    quoteId,
  );
}

export async function addBuyerMessage(quoteId: number, body: string): Promise<number> {
  return (await run("INSERT INTO messages (thread_type, thread_id, author_role, body) VALUES ('rfq', ?, 'buyer', ?)", quoteId, body)).id;
}

export async function quoteItems(q: Pick<QuoteRow, 'items_json'>) {
  let items: { productId: number; qty: number }[] = [];
  try {
    items = JSON.parse(q.items_json);
  } catch {
    items = [];
  }
  if (!items.length) return [];
  // Promise.all, not .map(async …): the array would otherwise be promises and .filter(Boolean) would
  // keep every one of them, since a pending promise is truthy.
  const rows = await Promise.all(
    items.map(async (it) => {
      const p = await get<{ slug: string; brand: string; model: string; name_sq: string; name_en: string }>(
        'SELECT slug, brand, model, name_sq, name_en FROM products WHERE id = ?',
        it.productId,
      );
      return p ? { ...p, qty: it.qty } : null;
    }),
  );
  return rows.filter(Boolean) as { slug: string; brand: string; model: string; name_sq: string; name_en: string; qty: number }[];
}

// ---------- applications and contact ----------

export async function createApplication(a: {
  company: string;
  nipt: string | null;
  kind: string;
  contact_name: string;
  phone: string;
  email: string;
  city: string | null;
  categories: string | null;
  plan: string | null;
  message: string | null;
}): Promise<number> {
  return (await run(
    `INSERT INTO seller_applications (company, nipt, kind, contact_name, phone, email, city, categories, plan, message)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    a.company, a.nipt, a.kind, a.contact_name, a.phone, a.email, a.city, a.categories, a.plan, a.message,
  )).id;
}

export async function createContactMessage(m: { name: string; email: string | null; phone: string | null; topic: string; body: string; lang: Lang }): Promise<number> {
  return (await run(
    'INSERT INTO contact_messages (name, email, phone, topic, body, lang) VALUES (?, ?, ?, ?, ?, ?)',
    m.name, m.email, m.phone, m.topic, m.body, m.lang,
  )).id;
}
