// Order tracking: the order code plus the phone given at checkout (the last 6 digits are enough) opens the order's
// own page, which otherwise needs the secret link from the confirmation (?k=token). Rate-limited per visitor, and
// the same answer for "no such code" and "wrong phone", so the form cannot be used to find codes.
import type { AstroGlobal } from 'astro';
import { get } from './db';
import { clientKey, isBot, rateLimited, str } from './forms';
import { href, type Lang } from './i18n';

export type TrackState = { code: string; phone: string; error: 'missing' | 'notFound' | 'tooMany' | null };

export async function handleTrack(ctx: AstroGlobal, lang: Lang): Promise<TrackState | Response> {
  const form = await ctx.request.formData();
  const code = str(form, 'code', 24).toUpperCase().replace(/\s+/g, '');
  const phone = str(form, 'phone', 30);
  const state: TrackState = { code, phone, error: null };
  if (isBot(form)) return { ...state, error: 'notFound' };
  if (rateLimited(`track:${clientKey(ctx.request, ctx.clientAddress)}`, 10)) return { ...state, error: 'tooMany' };
  const digits = phone.replace(/\D/g, '');
  if (!code || digits.length < 6) return { ...state, error: 'missing' };
  const o = await get<{ code: string; token: string; phone: string }>('SELECT code, token, phone FROM orders WHERE code = ?', code);
  if (!o || o.phone.replace(/\D/g, '').slice(-6) !== digits.slice(-6)) return { ...state, error: 'notFound' };
  return ctx.redirect(href(lang, 'order', { code: o.code }, { k: o.token }), 303);
}
