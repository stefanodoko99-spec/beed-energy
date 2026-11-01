// POST /api/currency: show prices in lekë or euros (a preference cookie for a year), then back to the page.
import type { APIRoute } from 'astro';
import { CUR_COOKIE } from '../../lib/currency';
import { secureCookies } from '../../lib/origin';

export const POST: APIRoute = async ({ request, cookies, url, redirect }) => {
  let to = 'all';
  try {
    to = String((await request.formData()).get('to') ?? '') === 'eur' ? 'eur' : 'all';
  } catch { /* default */ }
  cookies.set(CUR_COOKIE, to, { path: '/', sameSite: 'lax', secure: secureCookies(url), maxAge: 60 * 60 * 24 * 365 });
  let back = '/';
  const ref = request.headers.get('referer');
  if (ref) {
    try {
      const r = new URL(ref);
      if (r.origin === url.origin) back = r.pathname + r.search;
    } catch { /* ignore */ }
  }
  return redirect(back, 303);
};
