// /sitemap.xml: every indexable public page in both languages, each with its hreflang alternates (xhtml:link).
// Static pages, the four renewable-energy routes among them, then active categories, published products and active
// sellers. Absolute URLs on the request's origin (or PUBLIC_ORIGIN when it is set, as the canonical tags in
// Site.astro do, so the two never disagree). Left out: basket, checkout, compare, search, orders, quote threads,
// /admin, /api and /dev (robots.txt.ts).
import type { APIRoute } from 'astro';
import { all } from '../lib/db';
import { href, type RouteKey } from '../lib/i18n';

const STATIC: RouteKey[] = ['home', 'shop', 'guide', 'packages', 'calculator', 'sellers', 'sell', 'quote', 'about', 'contact', 'terms', 'privacy', 'quiz', 'builder', 'installers', 'projects', 'track'];

type Entry = { sq: string; en: string; lastmod?: string | null };

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
/** "2026-10-27 09:12:00" (SQLite, UTC) → "2026-10-27"; anything else → none. */
const day = (v: string | null | undefined) => (v && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : null);

export const GET: APIRoute = async ({ url, site }) => {
  const origin = site?.origin ?? url.origin;
  const entries: Entry[] = STATIC.map((k) => ({ sq: href('sq', k), en: href('en', k) }));
  const [cats, products, sellers] = await Promise.all([
    all<{ slug_sq: string; slug_en: string }>('SELECT slug_sq, slug_en FROM categories WHERE active = 1 ORDER BY sort, id'),
    all<{ slug: string; updated_at: string | null }>("SELECT slug, updated_at FROM products WHERE status = 'published' ORDER BY id"),
    all<{ slug: string }>("SELECT slug FROM sellers WHERE status = 'active' ORDER BY id"),
  ]);
  for (const c of cats) entries.push({ sq: href('sq', 'category', { slug: c.slug_sq }), en: href('en', 'category', { slug: c.slug_en }) });
  for (const p of products) entries.push({ sq: href('sq', 'product', { slug: p.slug }), en: href('en', 'product', { slug: p.slug }), lastmod: day(p.updated_at) });
  for (const s of sellers) entries.push({ sq: href('sq', 'seller', { slug: s.slug }), en: href('en', 'seller', { slug: s.slug }) });
  const cities = await all<{ slug: string }>('SELECT slug FROM cities WHERE pv_yield IS NOT NULL ORDER BY sort');
  for (const c of cities) entries.push({ sq: href('sq', 'solarCity', { slug: c.slug }), en: href('en', 'solarCity', { slug: c.slug }) });

  const alternates = (e: Entry) =>
    `<xhtml:link rel="alternate" hreflang="sq" href="${esc(origin + e.sq)}"/>` +
    `<xhtml:link rel="alternate" hreflang="en" href="${esc(origin + e.en)}"/>` +
    `<xhtml:link rel="alternate" hreflang="x-default" href="${esc(origin + e.sq)}"/>`;
  const urls = entries.flatMap((e) =>
    [e.sq, e.en].map((path) => `<url><loc>${esc(origin + path)}</loc>${e.lastmod ? `<lastmod>${e.lastmod}</lastmod>` : ''}${alternates(e)}</url>`),
  );
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join('\n')}\n</urlset>\n`;
  return new Response(xml, { headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=3600' } });
};
