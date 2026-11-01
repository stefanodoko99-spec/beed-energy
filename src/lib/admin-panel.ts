// Read side and small write helpers for the admin panel pages (T5). The big writes live in lib/admin.ts;
// this file adds the scoped list queries, form parsing and the few writes admin.ts has no function for.
// Every query that a seller can reach is filtered by the seller's id.
import type { AstroGlobal, AstroCookies } from 'astro';
import { all, audit, get, run, saveSetting } from './db';
import type { User } from './auth';
import { Forbidden, isAdmin, postMessage, requireAdmin, slugify, type AttrInput } from './admin';
import type { Lang } from './i18n';
import { hasAngle } from './html';
import { secureCookies } from './origin';
import { ta, type AdminWords } from '../i18n/admin';

export const ADMIN_LANG_COOKIE = 'beed_admin_lang';

export type NavKey = 'dashboard' | 'orders' | 'products' | 'categories' | 'sellers' | 'offers' | 'monitor' | 'quotes' | 'applications' | 'messages' | 'reviews' | 'alerts' | 'projects' | 'settings';
/** The rail, in sheet order (A-01 … A-14). Admin-only sections are hidden from sellers and refused by their pages. */
export const NAV: { key: NavKey; href: string; adminOnly: boolean }[] = [
  { key: 'dashboard', href: '/admin', adminOnly: false },
  { key: 'orders', href: '/admin/orders', adminOnly: false },
  { key: 'products', href: '/admin/products', adminOnly: false },
  { key: 'categories', href: '/admin/categories', adminOnly: true },
  { key: 'sellers', href: '/admin/sellers', adminOnly: true },
  { key: 'offers', href: '/admin/offers', adminOnly: false },
  { key: 'monitor', href: '/admin/monitor', adminOnly: true },
  { key: 'quotes', href: '/admin/quotes', adminOnly: false },
  { key: 'applications', href: '/admin/applications', adminOnly: true },
  { key: 'messages', href: '/admin/messages', adminOnly: true },
  { key: 'reviews', href: '/admin/reviews', adminOnly: true },
  { key: 'alerts', href: '/admin/alerts', adminOnly: true },
  { key: 'projects', href: '/admin/projects', adminOnly: true },
  { key: 'settings', href: '/admin/settings', adminOnly: true },
];
export const PAGE_SIZE = 50;

export function adminLang(cookies: AstroCookies): Lang {
  return cookies.get(ADMIN_LANG_COOKIE)?.value === 'en' ? 'en' : 'sq';
}

export type Ctx = { lang: Lang; t: AdminWords; user: User; flash: string | null; path: string; url: URL };

/**
 * Page prelude. Handles the language toggle (?lang=en sets the cookie, then redirects to the clean URL)
 * and reads the flash message (?ok=key). Middleware guarantees a user on every page except login/logout.
 */
export function adminCtx(Astro: AstroGlobal): Ctx | { redirect: string } {
  const url = new URL(Astro.url);
  const want = url.searchParams.get('lang');
  if (want === 'sq' || want === 'en') {
    Astro.cookies.set(ADMIN_LANG_COOKIE, want, { path: '/', sameSite: 'lax', httpOnly: true, secure: secureCookies(url), maxAge: 60 * 60 * 24 * 365 });
    url.searchParams.delete('lang');
    return { redirect: url.pathname + (url.search || '') };
  }
  const lang = adminLang(Astro.cookies);
  const t = ta(lang);
  const ok = url.searchParams.get('ok');
  return { lang, t, user: Astro.locals.user as User, flash: ok ? (t.flash[ok] ?? null) : null, path: url.pathname, url };
}

/** The current URL with ?lang= set, for the toggle link. */
export function langHref(url: URL, lang: Lang) {
  const u = new URL(url);
  u.searchParams.delete('ok');
  u.searchParams.set('lang', lang);
  return u.pathname + u.search;
}

export function withQuery(path: string, q: Record<string, string | number | null | undefined>) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(q)) if (v !== null && v !== undefined && v !== '') p.set(k, String(v));
  const s = p.toString();
  return s ? `${path}?${s}` : path;
}

// ---------- form parsing ----------

export type Errors = Record<string, string>;

export const fstr = (f: FormData, k: string, max = 2000) => String(f.get(k) ?? '').trim().slice(0, max);

/** null when empty, NaN when not a number. Accepts "21,5", "1 200" and "1.200,5"-free simple forms. */
export function fnum(f: FormData, k: string): number | null {
  const raw = String(f.get(k) ?? '').trim();
  if (!raw) return null;
  const n = Number(raw.replace(/[\s  ]/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : NaN;
}

export const fbool = (f: FormData, k: string) => {
  const all = f.getAll(k).map(String);
  const last = all[all.length - 1];
  return last === '1' || last === 'on' || last === 'true';
};

export function idParam(v: string | undefined): number | null {
  if (!v || v === 'new') return null;
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : -1;
}

export const pageParam = (url: URL) => Math.max(1, Math.floor(Number(url.searchParams.get('page')) || 1));

// ---------- navigation counts ----------

export async function navCounts(u: User) {
  const sellerOrders = isAdmin(u) ? '' : 'AND EXISTS (SELECT 1 FROM order_items oi WHERE oi.order_id = o.id AND oi.seller_id = ?)';
  const sp = isAdmin(u) ? [] : [u.seller_id!];
  return {
    orders: (await get<{ n: number }>(`SELECT COUNT(*) AS n FROM orders o WHERE o.status = 'new' ${sellerOrders}`, ...sp))!.n,
    quotes: (await get<{ n: number }>("SELECT COUNT(*) AS n FROM quote_requests WHERE status = 'open'"))!.n,
    applications: isAdmin(u) ? (await get<{ n: number }>("SELECT COUNT(*) AS n FROM seller_applications WHERE status = 'new'"))!.n : 0,
    messages: isAdmin(u) ? (await get<{ n: number }>('SELECT COUNT(*) AS n FROM contact_messages WHERE handled = 0'))!.n : 0,
    reviews: isAdmin(u) ? (await get<{ n: number }>("SELECT COUNT(*) AS n FROM reviews WHERE status = 'pending'"))!.n : 0,
    // alerts whose target the lowest live price has reached, not yet marked as sent
    alerts: isAdmin(u)
      ? (await get<{ n: number }>(
          `SELECT COUNT(*) AS n FROM price_alerts a WHERE a.notified_at IS NULL AND a.target_all >= (
             SELECT MIN(o.price_all) FROM offers o JOIN sellers s ON s.id = o.seller_id WHERE o.product_id = a.product_id AND o.active = 1 AND s.status = 'active')`,
        ))!.n
      : 0,
  };
}

export async function sellerName(u: User): Promise<string | null> {
  if (!u.seller_id) return null;
  return (await get<{ name: string }>('SELECT name FROM sellers WHERE id = ?', u.seller_id))?.name ?? null;
}

// ---------- orders ----------

export async function ordersList(u: User, f: { status: string; q: string; page: number }) {
  const where: string[] = [];
  const params: (string | number)[] = [];
  const sellerScope = !isAdmin(u);
  if (sellerScope) {
    where.push('EXISTS (SELECT 1 FROM order_items oi WHERE oi.order_id = o.id AND oi.seller_id = ?)');
    params.push(u.seller_id!);
  }
  const base = [...where];
  const baseParams = [...params];
  if (f.status) {
    where.push('o.status = ?');
    params.push(f.status);
  }
  if (f.q) {
    const digits = f.q.replace(/\D/g, '');
    where.push(`(o.code LIKE ? ${digits.length >= 4 ? "OR replace(replace(o.phone, ' ', ''), '+355', '0') LIKE ? OR o.phone LIKE ?" : ''})`);
    params.push(`%${f.q.toUpperCase()}%`);
    if (digits.length >= 4) params.push(`%${digits.replace(/^355/, '0')}%`, `%${digits}%`);
  }
  const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const scopeLines = sellerScope ? 'AND oi.seller_id = ?' : '';
  const lineParams = sellerScope ? [u.seller_id!, u.seller_id!] : [];
  const total = (await get<{ n: number }>(`SELECT COUNT(*) AS n FROM orders o ${w}`, ...params))!.n;
  const rows = await all<any>(
    `SELECT o.id, o.code, o.status, o.payment_method, o.payment_status, o.name, o.phone, o.total_all, o.created_at,
            c.name_sq AS city_sq, c.name_en AS city_en,
            (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id ${scopeLines}) AS lines,
            (SELECT COALESCE(SUM(oi.line_total_all), 0) FROM order_items oi WHERE oi.order_id = o.id ${scopeLines}) AS part
       FROM orders o LEFT JOIN cities c ON c.id = o.city_id ${w}
      ORDER BY o.created_at DESC, o.id DESC LIMIT ? OFFSET ?`,
    ...lineParams,
    ...params,
    PAGE_SIZE,
    (f.page - 1) * PAGE_SIZE,
  );
  const byStatus = await all<{ status: string; n: number }>(
    `SELECT o.status, COUNT(*) AS n FROM orders o ${base.length ? `WHERE ${base.join(' AND ')}` : ''} GROUP BY o.status`,
    ...baseParams,
  );
  return { rows, total, byStatus: Object.fromEntries(byStatus.map((r) => [r.status, r.n])) as Record<string, number> };
}

export async function orderDetail(u: User, id: number) {
  const o = await get<any>(
    `SELECT o.*, c.name_sq AS city_sq, c.name_en AS city_en, c.zone AS city_zone FROM orders o LEFT JOIN cities c ON c.id = o.city_id WHERE o.id = ?`,
    id,
  );
  if (!o) return null;
  const items = await all<any>(
    `SELECT oi.*, p.slug AS product_slug FROM order_items oi LEFT JOIN products p ON p.id = oi.product_id
      WHERE oi.order_id = ? ${isAdmin(u) ? '' : 'AND oi.seller_id = ?'} ORDER BY oi.seller_id, oi.id`,
    ...(isAdmin(u) ? [id] : [id, u.seller_id!]),
  );
  if (!isAdmin(u) && !items.length) throw new Forbidden('order');
  const events = await all<any>('SELECT * FROM order_events WHERE order_id = ? ORDER BY created_at, id', id);
  return { ...o, items, events, internal: await threadMessages(u, 'order', id) };
}

export async function addOrderNote(u: User, orderId: number, body: string) {
  if (!isAdmin(u)) {
    const mine = await get('SELECT 1 AS x FROM order_items WHERE order_id = ? AND seller_id = ?', orderId, u.seller_id!);
    if (!mine) throw new Forbidden('order');
  }
  await postMessage(u, 'order', orderId, body, null);
}

// ---------- messages (order notes and quote threads) ----------

export async function threadMessages(u: User, type: 'rfq' | 'order', id: number) {
  return await all<any>(
    `SELECT m.*, s.name AS seller_name FROM messages m LEFT JOIN sellers s ON s.id = m.seller_id
      WHERE m.thread_type = ? AND m.thread_id = ? ${isAdmin(u) ? '' : "AND (m.author_role IN ('buyer', 'admin') OR m.seller_id = ?)"}
      ORDER BY m.created_at, m.id`,
    ...(isAdmin(u) ? [type, id] : [type, id, u.seller_id!]),
  );
}

// ---------- products ----------

export async function productsList(f: { cat: number | null; status: string; q: string; page: number; photo?: '' | 'none' | 'some' }, sellerId: number | null) {
  const where: string[] = [];
  const params: (string | number)[] = [];
  if (f.cat) {
    where.push('p.category_id = ?');
    params.push(f.cat);
  }
  if (f.status) {
    where.push('p.status = ?');
    params.push(f.status);
  }
  if (f.q) {
    where.push("(p.brand || ' ' || p.model || ' ' || p.slug || ' ' || p.name_sq || ' ' || p.name_en) LIKE ?");
    params.push(`%${f.q}%`);
  }
  if (f.photo) where.push(`${f.photo === 'none' ? 'NOT ' : ''}EXISTS (SELECT 1 FROM product_images pi WHERE pi.product_id = p.id)`);
  const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const total = (await get<{ n: number }>(`SELECT COUNT(*) AS n FROM products p ${w}`, ...params))!.n;
  const rows = await all<any>(
    `SELECT p.id, p.slug, p.brand, p.model, p.name_sq, p.name_en, p.status, p.featured, p.updated_at, p.width_mm, p.height_mm, p.depth_mm,
            c.name_sq AS cat_sq, c.name_en AS cat_en, c.slug_en AS cat_slug,
            (SELECT COUNT(*) FROM offers o WHERE o.product_id = p.id AND o.active = 1) AS offers,
            (SELECT MIN(o.price_all) FROM offers o WHERE o.product_id = p.id AND o.active = 1) AS low,
            (SELECT pi.path FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.sort, pi.id LIMIT 1) AS image,
            (SELECT COUNT(*) FROM product_images pi WHERE pi.product_id = p.id) AS photos,
            ${sellerId ? '(SELECT o.id FROM offers o WHERE o.product_id = p.id AND o.seller_id = ?)' : 'NULL'} AS my_offer
       FROM products p JOIN categories c ON c.id = p.category_id ${w}
      ORDER BY c.sort, p.brand, p.model LIMIT ? OFFSET ?`,
    ...(sellerId ? [sellerId] : []),
    ...params,
    PAGE_SIZE,
    (f.page - 1) * PAGE_SIZE,
  );
  return { rows, total };
}

export async function allCategories() {
  return await all<any>(
    `SELECT c.*, (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id) AS products,
            (SELECT COUNT(*) FROM spec_attributes a WHERE a.category_id = c.id) AS attrs
       FROM categories c ORDER BY c.sort, c.id`,
  );
}

export async function productSpecValues(productId: number): Promise<Record<string, string>> {
  const rows = await all<{ key: string; type: string; value_num: number | null; value_text: string | null }>(
    `SELECT a.key, a.type, ps.value_num, ps.value_text FROM product_specs ps JOIN spec_attributes a ON a.id = ps.attribute_id WHERE ps.product_id = ?`,
    productId,
  );
  const out: Record<string, string> = {};
  for (const r of rows) out[r.key] = r.type === 'number' || r.type === 'bool' ? (r.value_num === null ? '' : String(r.value_num)) : (r.value_text ?? '');
  return out;
}

export async function offersForProductAdmin(productId: number) {
  return await all<any>(
    `SELECT o.*, s.name AS seller_name, s.is_demo AS seller_demo FROM offers o JOIN sellers s ON s.id = o.seller_id WHERE o.product_id = ? ORDER BY o.price_all`,
    productId,
  );
}

// ---------- categories and templates ----------

export async function attrValueCounts(categoryId: number): Promise<Record<number, number>> {
  const rows = await all<{ id: number; n: number }>(
    `SELECT a.id, COUNT(ps.product_id) AS n FROM spec_attributes a LEFT JOIN product_specs ps ON ps.attribute_id = a.id WHERE a.category_id = ? GROUP BY a.id`,
    categoryId,
  );
  return Object.fromEntries(rows.map((r) => [r.id, r.n]));
}

export type CatInput = {
  slug_sq: string; slug_en: string; name_sq: string; name_en: string; group_key: string; intro_sq: string; intro_en: string;
  unit_basis: string | null; unit_label_sq: string | null; unit_label_en: string | null; sort: number; active: boolean;
};

export async function readCategory(f: FormData, id: number | null, t: AdminWords): Promise<{ v: CatInput; errors: Errors }> {
  const errors: Errors = {};
  const sort = fnum(f, 'sort');
  const v: CatInput = {
    slug_sq: await slugify(fstr(f, 'slug_sq', 80)),
    slug_en: await slugify(fstr(f, 'slug_en', 80)),
    name_sq: fstr(f, 'name_sq', 120),
    name_en: fstr(f, 'name_en', 120),
    group_key: fstr(f, 'group_key', 20),
    intro_sq: fstr(f, 'intro_sq', 2000),
    intro_en: fstr(f, 'intro_en', 2000),
    unit_basis: fstr(f, 'unit_basis', 60) || null,
    unit_label_sq: fstr(f, 'unit_label_sq', 20) || null,
    unit_label_en: fstr(f, 'unit_label_en', 20) || null,
    sort: sort === null || Number.isNaN(sort) ? 0 : Math.round(sort),
    active: fbool(f, 'active'),
  };
  for (const k of ['slug_sq', 'slug_en', 'name_sq', 'name_en'] as const) if (!v[k]) errors[k] = t.err.required;
  if (sort !== null && Number.isNaN(sort)) errors.sort = t.err.whole;
  if (!['energy', 'efficiency', 'build'].includes(v.group_key)) errors.group_key = t.err.required;
  if (v.slug_sq && await get('SELECT id FROM categories WHERE slug_sq = ? AND id != ?', v.slug_sq, id ?? 0)) errors.slug_sq = t.cat.slugTaken;
  if (v.slug_en && await get('SELECT id FROM categories WHERE slug_en = ? AND id != ?', v.slug_en, id ?? 0)) errors.slug_en = t.cat.slugTaken;
  if (v.unit_basis) {
    const ok = id ? await get("SELECT id FROM spec_attributes WHERE category_id = ? AND key = ? AND type = 'number'", id, v.unit_basis) : null;
    if (!ok) errors.unit_basis = t.cat.unitBasisErr;
  }
  return { v, errors };
}

/** One row of the template editor as typed (strings), so an invalid table can be re-rendered as the user left it. */
export type TplRow = {
  id: string; key: string; label_sq: string; label_en: string; unit: string; type: string; options: string;
  filterable: boolean; comparable: boolean; highlight: boolean; required: boolean; better: string; decimals: string;
};

export function rowsFromDb(attrs: { id: number; key: string; label_sq: string; label_en: string; unit: string; type: string; options: { value: string; sq: string; en: string }[]; filterable: boolean; comparable: boolean; highlight: boolean; required: boolean; better: string | null; decimals: number }[]): TplRow[] {
  return attrs.map((a) => ({
    id: String(a.id),
    key: a.key,
    label_sq: a.label_sq,
    label_en: a.label_en,
    unit: a.unit,
    type: a.type,
    options: a.options.map((o) => `${o.value}|${o.sq}|${o.en}`).join('\n'),
    filterable: a.filterable,
    comparable: a.comparable,
    highlight: a.highlight,
    required: a.required,
    better: a.better ?? 'none',
    decimals: String(a.decimals ?? 0),
  }));
}

export const emptyRow = (): TplRow => ({
  id: '', key: '', label_sq: '', label_en: '', unit: '', type: 'number', options: '', filterable: false, comparable: true, highlight: false, required: false, better: 'none', decimals: '0',
});

export function rowsFromForm(f: FormData): TplRow[] {
  const n = Math.min(200, Math.max(0, Math.floor(Number(f.get('rows')) || 0)));
  const rows: TplRow[] = [];
  for (let i = 0; i < n; i++) {
    const g = (k: string, max = 300) => fstr(f, `a${i}_${k}`, max);
    rows.push({
      id: g('id', 12),
      key: g('key', 60),
      label_sq: g('label_sq', 120),
      label_en: g('label_en', 120),
      unit: g('unit', 20),
      type: g('type', 10),
      options: g('options', 4000),
      filterable: fbool(f, `a${i}_filterable`),
      comparable: fbool(f, `a${i}_comparable`),
      highlight: fbool(f, `a${i}_highlight`),
      required: fbool(f, `a${i}_required`),
      better: g('better', 10),
      decimals: g('decimals', 4),
    });
  }
  return rows;
}

export function parseRows(rows: TplRow[], t: AdminWords): { attrs: AttrInput[]; errors: Errors } {
  const errors: Errors = {};
  const attrs: AttrInput[] = [];
  const seen = new Map<string, number>();
  rows.forEach((r, i) => {
    if (!/^[a-z][a-z0-9_]{0,59}$/.test(r.key)) errors[`a${i}_key`] = t.tpl.keyErr;
    else if (seen.has(r.key)) errors[`a${i}_key`] = t.tpl.dupKey;
    else seen.set(r.key, i);
    if (!r.label_sq) errors[`a${i}_label_sq`] = t.err.required;
    if (!r.label_en) errors[`a${i}_label_en`] = t.err.required;
    const type = (['number', 'text', 'enum', 'bool'].includes(r.type) ? r.type : 'number') as AttrInput['type'];
    const options = r.options
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => {
        const [value, sqL, enL] = l.split('|').map((s) => s.trim());
        return { value, sq: sqL || value, en: enL || sqL || value };
      })
      .filter((o) => o.value);
    if (type === 'enum' && !options.length) errors[`a${i}_options`] = t.tpl.optionsErr;
    const dec = r.decimals === '' ? 0 : Number(r.decimals);
    if (!Number.isInteger(dec) || dec < 0 || dec > 4) errors[`a${i}_decimals`] = t.tpl.decimalsErr;
    const id = Number(r.id);
    attrs.push({
      id: Number.isInteger(id) && id > 0 ? id : null,
      key: r.key,
      label_sq: r.label_sq,
      label_en: r.label_en,
      unit: r.unit,
      type,
      options: type === 'enum' ? options : [],
      filterable: r.filterable,
      comparable: r.comparable,
      highlight: r.highlight,
      required: r.required,
      better: type === 'number' && (r.better === 'higher' || r.better === 'lower') ? r.better : null,
      decimals: Number.isInteger(dec) ? dec : 0,
      sort: i,
    });
  });
  return { attrs, errors };
}

/** Existing attributes the posted table no longer has, with how many product values each would take with it. */
export async function removedAttrs(categoryId: number, keptIds: (number | null | undefined)[]) {
  const counts = await attrValueCounts(categoryId);
  const rows = await all<{ id: number; key: string; label_sq: string; label_en: string }>('SELECT id, key, label_sq, label_en FROM spec_attributes WHERE category_id = ?', categoryId);
  return rows.filter((a) => !keptIds.includes(a.id)).map((a) => ({ ...a, values: counts[a.id] ?? 0 }));
}

// ---------- sellers ----------

export async function sellersList() {
  return await all<any>(
    `SELECT s.*, c.name_sq AS city_sq, c.name_en AS city_en,
            (SELECT COUNT(*) FROM offers o WHERE o.seller_id = s.id AND o.active = 1) AS offers
       FROM sellers s LEFT JOIN cities c ON c.id = s.city_id ORDER BY s.status = 'active' DESC, s.name`,
  );
}

export const cities = () => all<{ id: number; name_sq: string; name_en: string; zone: number }>('SELECT id, name_sq, name_en, zone FROM cities ORDER BY sort, name_sq');

export async function readSeller(f: FormData, id: number | null, t: AdminWords) {
  const errors: Errors = {};
  const commission = fnum(f, 'commission_pct');
  const zones = ['1', '2', '3'].filter((z) => f.getAll('zones').map(String).includes(z));
  const v = {
    slug: await slugify(fstr(f, 'slug', 80) || fstr(f, 'name', 120)),
    name: fstr(f, 'name', 120),
    legal_name: fstr(f, 'legal_name', 160),
    nipt: fstr(f, 'nipt', 12).toUpperCase(),
    kind: fstr(f, 'kind', 20),
    city_id: Number(fstr(f, 'city_id', 6)) || null,
    address: fstr(f, 'address', 300),
    phone: fstr(f, 'phone', 40),
    email: fstr(f, 'email', 160),
    website: fstr(f, 'website', 300),
    about_sq: fstr(f, 'about_sq', 3000),
    about_en: fstr(f, 'about_en', 3000),
    verified: fbool(f, 'verified'),
    plan: fstr(f, 'plan', 10),
    commission_pct: commission ?? 0,
    delivery_zones: zones.join(','),
    status: fstr(f, 'status', 12),
  };
  if (!v.name) errors.name = t.err.required;
  else if (hasAngle(v.name)) errors.name = t.err.angle; // the name reaches public pages and their JSON-LD
  if (hasAngle(v.legal_name)) errors.legal_name = t.err.angle;
  if (!v.slug) errors.slug = t.err.required;
  else if (await get('SELECT id FROM sellers WHERE slug = ? AND id != ?', v.slug, id ?? 0)) errors.slug = t.sellers.slugTaken;
  if (!['supplier', 'installer', 'manufacturer', 'contractor'].includes(v.kind)) errors.kind = t.err.required;
  if (!['start', 'pro', 'partner'].includes(v.plan)) errors.plan = t.err.required;
  if (!['pending', 'active', 'suspended'].includes(v.status)) errors.status = t.err.required;
  if (commission === null || Number.isNaN(commission) || commission < 0 || commission > 50) errors.commission_pct = t.sellers.commissionErr;
  if (!zones.length) errors.zones = t.sellers.zonesErr;
  if (v.nipt && !/^[A-Z]\d{8}[A-Z]$/.test(v.nipt)) errors.nipt = t.err.nipt;
  if (v.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.email)) errors.email = t.err.email;
  if (v.website && !/^https?:\/\//.test(v.website)) errors.website = t.err.url;
  if (v.city_id && !await get('SELECT id FROM cities WHERE id = ?', v.city_id)) v.city_id = null;
  return { v, errors };
}

// ---------- offers ----------

export async function offersList(u: User, f: { q: string; seller: number | null; cat: number | null; page: number }) {
  const where: string[] = [];
  const params: (string | number)[] = [];
  if (!isAdmin(u)) {
    where.push('o.seller_id = ?');
    params.push(u.seller_id!);
  } else if (f.seller) {
    where.push('o.seller_id = ?');
    params.push(f.seller);
  }
  if (f.cat) {
    where.push('p.category_id = ?');
    params.push(f.cat);
  }
  if (f.q) {
    where.push("(p.brand || ' ' || p.model || ' ' || p.slug) LIKE ?");
    params.push(`%${f.q}%`);
  }
  const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const from = 'FROM offers o JOIN products p ON p.id = o.product_id JOIN sellers s ON s.id = o.seller_id';
  const total = (await get<{ n: number }>(`SELECT COUNT(*) AS n ${from} ${w}`, ...params))!.n;
  const rows = await all<any>(
    `SELECT o.id, o.price_all, o.stock_qty, o.updated_at, o.active, o.promoted, o.is_demo, o.compare_at_all,
            p.id AS product_id, p.slug, p.brand, p.model, s.id AS seller_id, s.name AS seller_name
       ${from} ${w} ORDER BY p.brand, p.model, o.price_all LIMIT ? OFFSET ?`,
    ...params,
    PAGE_SIZE,
    (f.page - 1) * PAGE_SIZE,
  );
  return { rows, total };
}

export async function offerForEdit(u: User, id: number) {
  const o = await get<any>(
    `SELECT o.*, p.slug, p.brand, p.model, s.name AS seller_name FROM offers o JOIN products p ON p.id = o.product_id JOIN sellers s ON s.id = o.seller_id WHERE o.id = ?`,
    id,
  );
  if (!o) return null;
  if (!isAdmin(u) && o.seller_id !== u.seller_id) throw new Forbidden('offer');
  const tiers = await all<{ min_qty: number; price_all: number }>('SELECT min_qty, price_all FROM offer_tiers WHERE offer_id = ? ORDER BY min_qty', id);
  const history = await all<{ price_all: number; recorded_at: string }>('SELECT price_all, recorded_at FROM price_history WHERE offer_id = ? ORDER BY recorded_at DESC, id DESC LIMIT 60', id);
  return { ...o, tiers, history };
}

export async function productOptions() {
  return await all<{ id: number; brand: string; model: string; status: string; cat_sq: string; cat_en: string; category_id: number }>(
    `SELECT p.id, p.brand, p.model, p.status, p.category_id, c.name_sq AS cat_sq, c.name_en AS cat_en FROM products p JOIN categories c ON c.id = p.category_id
      WHERE p.status != 'archived' ORDER BY c.sort, p.brand, p.model`,
  );
}

// ---------- quotes ----------

export async function quotesList(status: string) {
  return await all<any>(
    `SELECT q.id, q.code, q.status, q.project_type, q.name, q.created_at, q.budget_all, c.name_sq AS city_sq, c.name_en AS city_en,
            (SELECT COUNT(*) FROM messages m WHERE m.thread_type = 'rfq' AND m.thread_id = q.id AND m.author_role != 'buyer') AS replies
       FROM quote_requests q LEFT JOIN cities c ON c.id = q.city_id ${status ? 'WHERE q.status = ?' : ''}
      ORDER BY q.created_at DESC, q.id DESC LIMIT 200`,
    ...(status ? [status] : []),
  );
}

export async function quoteDetail(id: number) {
  const q = await get<any>('SELECT q.*, c.name_sq AS city_sq, c.name_en AS city_en FROM quote_requests q LEFT JOIN cities c ON c.id = q.city_id WHERE q.id = ?', id);
  if (!q) return null;
  let items: { productId: number; qty: number }[] = [];
  try {
    items = JSON.parse(q.items_json || '[]');
  } catch {
    items = [];
  }
  const ids = items.map((i) => Number(i.productId)).filter((n) => Number.isInteger(n) && n > 0);
  const prods = ids.length ? await all<any>(`SELECT id, slug, brand, model FROM products WHERE id IN (${ids.map(() => '?').join(',')})`, ...ids) : [];
  return { ...q, items: items.map((i) => ({ ...i, product: prods.find((p) => p.id === Number(i.productId)) ?? null })) };
}

export async function setQuoteStatus(u: User, id: number, status: string) {
  requireAdmin(u);
  if (!['open', 'answered', 'won', 'closed'].includes(status)) return false;
  await run('UPDATE quote_requests SET status = ? WHERE id = ?', status, id);
  await audit(u.id, 'quote.status', 'rfq', id, status);
  return true;
}

// ---------- applications and contact messages ----------

export const applications = () => all<any>("SELECT * FROM seller_applications ORDER BY status = 'new' DESC, created_at DESC, id DESC LIMIT 300");

export async function rejectApplication(u: User, id: number) {
  requireAdmin(u);
  const r = await run("UPDATE seller_applications SET status = 'rejected' WHERE id = ? AND status = 'new'", id);
  if (r.changes) await audit(u.id, 'application.reject', 'application', id);
  return r.changes === 1;
}

export const contactMessages = async (state: string) =>
  await all<any>(`SELECT * FROM contact_messages ${state === 'open' ? 'WHERE handled = 0' : state === 'handled' ? 'WHERE handled = 1' : ''} ORDER BY handled, created_at DESC, id DESC LIMIT 300`);

export async function setHandled(u: User, id: number, handled: boolean) {
  requireAdmin(u);
  await run('UPDATE contact_messages SET handled = ? WHERE id = ?', handled ? 1 : 0, id);
  await audit(u.id, handled ? 'contact.handled' : 'contact.reopen', 'contact', id);
}

// ---------- settings ----------

export async function saveSettingAs(u: User, key: string, value: unknown) {
  requireAdmin(u);
  await saveSetting(key, value);
  await audit(u.id, 'setting.save', 'setting', undefined, key);
}

/** Renders the 403 page in place. A fresh GET request, because a POST whose body was read cannot be rewritten. */
export function forbiddenPage(Astro: AstroGlobal) {
  return Astro.rewrite(new Request(new URL('/admin/forbidden', Astro.url), { method: 'GET', headers: new Headers(Astro.request.headers) }));
}
