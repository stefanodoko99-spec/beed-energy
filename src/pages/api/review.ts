// POST /api/review from a delivered order's page: store the review (pending approval), then back to the order.
import type { APIRoute } from 'astro';
import { clientKey, isBot, rateLimited, str } from '../../lib/forms';
import { href } from '../../lib/i18n';
import { saveReview } from '../../lib/reviews';

export const POST: APIRoute = async ({ request, redirect, clientAddress }) => {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return new Response('Bad request', { status: 400 });
  }
  const lang = str(form, 'lang', 2) === 'en' ? 'en' : 'sq';
  const code = str(form, 'code', 24);
  const token = str(form, 'k', 64);
  const back = (q: string) => redirect(`${href(lang, 'order', { code }, { k: token, vleresim: q })}#vleresime`, 303);
  if (isBot(form)) return back('ok');
  if (rateLimited(`review:${clientKey(request, clientAddress)}`, 12)) return back('gabim');
  const result = await saveReview({ code, token, productId: Number(str(form, 'productId', 12)), rating: Number(str(form, 'rating', 2)), body: str(form, 'body', 1200), name: str(form, 'name', 60), lang });
  if (result === 'denied') return new Response('Not found', { status: 404 });
  return back(result === 'ok' ? 'ok' : 'gabim');
};
