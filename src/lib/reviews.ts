// Verified reviews: only from a delivered order's own page (its token proves the buyer), once per product per
// order, shown after the shop team approves them (admin/reviews). Product pages show the published ones.
import { all, get, run } from './db';

export type Review = { id: number; rating: number; body: string; name: string; created_at: string };

export async function productReviews(productId: number): Promise<{ avg: number | null; count: number; list: Review[] }> {
  const list = await all<Review>(
    "SELECT id, rating, body, name, created_at FROM reviews WHERE product_id = ? AND status = 'published' ORDER BY created_at DESC LIMIT 30",
    productId,
  );
  const agg = await get<{ avg: number | null; n: number }>("SELECT AVG(rating) AS avg, COUNT(*) AS n FROM reviews WHERE product_id = ? AND status = 'published'", productId);
  return { avg: agg?.avg ?? null, count: agg?.n ?? 0, list };
}

/** The review status per product of an order, for the order page's forms. */
export async function orderReviews(orderId: number): Promise<Map<number, string>> {
  const rows = await all<{ product_id: number; status: string }>('SELECT product_id, status FROM reviews WHERE order_id = ?', orderId);
  return new Map(rows.map((r) => [r.product_id, r.status]));
}

export async function saveReview(r: { code: string; token: string; productId: number; rating: number; body: string; name: string; lang: string }): Promise<'ok' | 'invalid' | 'denied'> {
  if (!(r.rating >= 1 && r.rating <= 5) || !r.name.trim()) return 'invalid';
  const o = await get<{ id: number; status: string }>('SELECT id, status FROM orders WHERE code = ? AND token = ?', r.code, r.token);
  if (!o || o.status !== 'delivered') return 'denied';
  const item = await get<{ seller_id: number | null }>('SELECT seller_id FROM order_items WHERE order_id = ? AND product_id = ? LIMIT 1', o.id, r.productId);
  if (!item) return 'denied';
  await run(
    `INSERT INTO reviews (order_id, product_id, seller_id, rating, body, name, lang) VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (order_id, product_id) DO NOTHING`,
    o.id, r.productId, item.seller_id, Math.round(r.rating), r.body.trim().slice(0, 1200), r.name.trim().slice(0, 60), r.lang,
  );
  return 'ok';
}
