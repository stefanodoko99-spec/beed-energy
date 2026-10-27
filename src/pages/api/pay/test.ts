// Local test gateway: only in development or with PAY_TEST=1 (paymentMode() === 'test'), never in a
// production build without keys. It never touches a card: "Pay" marks the order paid in the local
// database, "Decline" leaves it unpaid. A cancelled order cannot be paid here either.
import type { APIRoute } from 'astro';
import { get, run } from '../../../lib/db';
import { failPayment, latestOpenPayment, markPaid, tokenMatches } from '../../../lib/orders';
import { paymentMode } from '../../../lib/payments';
import { href } from '../../../lib/i18n';
import { lek } from '../../../lib/money';

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const notFound = () => new Response('Not found', { status: 404, headers: { 'cache-control': 'no-store' } });

async function find(code: string, k: string) {
  const o = await get<any>('SELECT * FROM orders WHERE code = ?', code);
  return o && tokenMatches(o.token, k) && o.payment_method === 'card' ? o : null;
}

const back = (o: any, k: string, pagesa?: string) => href(o.lang, 'order', { code: o.code }, pagesa ? { k, pagesa } : { k });

export const GET: APIRoute = async ({ url, redirect }) => {
  if (paymentMode() !== 'test') return notFound();
  const code = url.searchParams.get('code') ?? '';
  const k = url.searchParams.get('k') ?? '';
  const o = await find(code, k);
  if (!o) return notFound();
  if (o.status === 'cancelled' || o.payment_status === 'paid') return redirect(back(o, k), 303);
  const sq = o.lang === 'sq';
  const html = `<!doctype html><html lang="${o.lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>${sq ? 'Pagesë provë' : 'Test payment'} · ${esc(o.code)}</title>
<style>body{font:16px/1.5 system-ui,sans-serif;margin:0;min-height:100svh;display:grid;place-items:center;background:#f3f8f5;color:#10262b}
main{max-width:28rem;padding:2rem;border:1px solid #0c4c37;border-top:4px solid #f5a524;background:#fff}h1{font-size:1.25rem;margin:0 0 .5rem}
.tag{display:inline-block;font:600 12px/1 ui-monospace,monospace;letter-spacing:.06em;padding:.4rem .6rem;background:#f5a524;color:#10262b;margin-bottom:1rem}
form{display:flex;gap:.75rem;margin-top:1.5rem}button{font:inherit;min-height:44px;padding:0 1.25rem;border:1px solid #0c4c37;color:#0c4c37;background:#fff;cursor:pointer}
button[value=pay]{background:#0c4c37;color:#f3f8f5}</style></head><body><main>
<span class="tag">${sq ? 'PORTË PROVE · ASNJË PARA NUK LËVIZ' : 'TEST GATEWAY · NO MONEY MOVES'}</span>
<h1>${sq ? 'Porosia' : 'Order'} ${esc(o.code)}</h1>
<p>${sq ? 'Shuma' : 'Amount'}: <strong>${lek(o.total_all, o.lang)}</strong></p>
<p>${sq ? 'Kjo faqe zëvendëson formularin e kartës së POK derisa të vendosen çelësat e tregtarit.' : 'This page stands in for POK’s card form until the merchant keys are set.'}</p>
<form method="post"><input type="hidden" name="code" value="${esc(o.code)}"><input type="hidden" name="k" value="${esc(k)}">
<button name="r" value="pay">${sq ? 'Paguaj (provë)' : 'Pay (test)'}</button><button name="r" value="fail">${sq ? 'Refuzo' : 'Decline'}</button></form>
</main></body></html>`;
  return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
};

export const POST: APIRoute = async ({ request, redirect }) => {
  if (paymentMode() !== 'test') return notFound();
  const f = await request.formData();
  const code = String(f.get('code') ?? '');
  const k = String(f.get('k') ?? '');
  const o = await find(code, k);
  if (!o) return notFound();
  if (o.status === 'cancelled') return redirect(back(o, k), 303);
  // The attempt this page stands in for: the latest one the checkout or a retry recorded.
  const attempt = await latestOpenPayment(o.id);
  const pay = f.get('r') === 'pay';
  if (pay && o.payment_status !== 'paid') await markPaid(o.id, attempt?.provider_id ?? `test-${o.code}`, 'test-gateway');
  else if (!pay && o.payment_status === 'pending') {
    if (attempt) await failPayment(o.id, attempt.provider_id);
    await run("UPDATE orders SET payment_status = 'failed', updated_at = datetime('now') WHERE id = ? AND payment_status = 'pending'", o.id);
  }
  return redirect(back(o, k, pay ? 'ok' : 'deshtoi'), 303);
};
