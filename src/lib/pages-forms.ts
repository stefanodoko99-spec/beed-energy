// Server side of the content-page forms: quote request, thread reply, seller application, contact.
// Each handler reads the posted form, checks the honeypot and the rate limit, validates, writes and
// returns either a redirect (PRG) or the values + errors to render next to the fields.
import { get } from './db';
import { hasAngle } from './html';
import { clientKey, EMAIL_RE, isBot, rateLimited, str } from './forms';
import { href, type Lang } from './i18n';
import { normalisePhone, validNipt } from './orders';
import { addBuyerMessage, createApplication, createContactMessage, createQuote, productForQuote, quoteByCode } from './pages-db';
import { KIND_KEYS, PROJECT_KEYS, TOPIC_KEYS, tp } from '../i18n/pages';

export type FormResult = {
  redirect?: string;
  status: number;
  values: Record<string, string>;
  errors: Record<string, string>;
  tooMany?: boolean;
};

type Ctx = { request: Request; clientAddress?: string };

function addr(ctx: Ctx) {
  try {
    return clientKey(ctx.request, ctx.clientAddress);
  } catch {
    return clientKey(ctx.request);
  }
}

function lekNumber(s: string): number | null | 'bad' {
  const v = s.replace(/[\s  .,]/g, '').replace(/(lek[eë]?|all|l)$/i, '');
  if (!v) return null;
  if (!/^\d{1,10}$/.test(v)) return 'bad';
  return Number(v);
}

async function cityId(slug: string): Promise<number | null> {
  return (await get<{ id: number }>('SELECT id FROM cities WHERE slug = ?', slug))?.id ?? null;
}

// ---------- request a quote ----------

export async function handleQuote(ctx: Ctx, lang: Lang): Promise<FormResult> {
  const form = await ctx.request.formData();
  const e = tp(lang).form.err;
  const values = {
    project: str(form, 'project', 40),
    city: str(form, 'city', 40),
    name: str(form, 'name', 120),
    phone: str(form, 'phone', 30),
    email: str(form, 'email', 160).toLowerCase(),
    business: form.get('business') ? '1' : '',
    company: str(form, 'company', 160),
    nipt: str(form, 'nipt', 20).toUpperCase().replace(/\s/g, ''),
    details: str(form, 'details', 4000),
    budget: str(form, 'budget', 20),
    produkt: str(form, 'produkt', 160),
    qty: str(form, 'qty', 6),
  };
  if (isBot(form)) return { status: 303, redirect: href(lang, 'quote', {}, { dergua: 1 }), values, errors: {} };
  if (rateLimited(`quote:${addr(ctx)}`, 6)) return { status: 429, values, errors: {}, tooMany: true };

  const errors: Record<string, string> = {};
  if (!(PROJECT_KEYS as string[]).includes(values.project)) errors.project = e.project;
  const city = await cityId(values.city);
  if (!city) errors.city = e.city;
  if (values.name.length < 3 || !/\s/.test(values.name)) errors.name = e.name;
  const phone = normalisePhone(values.phone);
  if (!phone) errors.phone = e.phone;
  if (values.email && !EMAIL_RE.test(values.email)) errors.email = e.email;
  if (values.business) {
    if (values.company.length < 2) errors.company = e.company;
    if (values.nipt && !validNipt(values.nipt)) errors.nipt = e.nipt;
  } else if (values.nipt && !validNipt(values.nipt)) errors.nipt = e.nipt;
  if (values.details.length < 20) errors.details = e.details;
  const budget = lekNumber(values.budget);
  if (budget === 'bad') errors.budget = e.budget;
  if (Object.keys(errors).length || !city || !phone) return { status: 422, values, errors };

  const product = values.produkt ? await productForQuote(values.produkt) : undefined;
  const qty = Math.max(1, Math.min(99999, Number(values.qty) || 1));
  const { code, token } = await createQuote({
    project_type: values.project,
    city_id: city,
    name: values.name,
    phone,
    email: values.email || null,
    company: values.company || null,
    nipt: values.nipt || null,
    details: values.details,
    budget_all: budget === 'bad' ? null : budget,
    items: product ? [{ productId: product.id, qty }] : [],
    lang,
  });
  return { status: 303, redirect: href(lang, 'quoteThread', { code }, { k: token, dergua: 1 }), values, errors: {} };
}

// ---------- buyer reply in a quote thread ----------

export async function handleReply(ctx: Ctx, lang: Lang, code: string, token: string | null): Promise<FormResult> {
  const form = await ctx.request.formData();
  const values = { body: str(form, 'body', 4000) };
  const q = await quoteByCode(code, token);
  if (!q) return { status: 404, values, errors: {} };
  const back = href(lang, 'quoteThread', { code }, { k: token });
  if (isBot(form)) return { status: 303, redirect: back, values, errors: {} };
  if (q.status === 'closed') return { status: 409, values, errors: { body: tp(lang).thread.closed } };
  if (rateLimited(`reply:${addr(ctx)}`, 20)) return { status: 429, values, errors: {}, tooMany: true };
  if (values.body.length < 2) return { status: 422, values, errors: { body: tp(lang).form.err.body } };
  const id = await addBuyerMessage(q.id, values.body);
  return { status: 303, redirect: `${href(lang, 'quoteThread', { code }, { k: token, shkruar: 1 })}#m-${id}`, values, errors: {} };
}

// ---------- seller application ----------

export async function handleApplication(ctx: Ctx, lang: Lang, planKeys: string[]): Promise<FormResult> {
  const form = await ctx.request.formData();
  const e = tp(lang).form.err;
  const cats = form.getAll('categories').map((c) => String(c).slice(0, 60)).filter(Boolean).slice(0, 20);
  const values = {
    company: str(form, 'company', 160),
    nipt: str(form, 'nipt', 20).toUpperCase().replace(/\s/g, ''),
    kind: str(form, 'kind', 20),
    contact_name: str(form, 'contact_name', 120),
    phone: str(form, 'phone', 30),
    email: str(form, 'email', 160).toLowerCase(),
    city: str(form, 'city', 40),
    categories: cats.join(','),
    plan: str(form, 'plan', 20),
    message: str(form, 'message', 3000),
  };
  if (isBot(form)) return { status: 303, redirect: href(lang, 'sell', {}, { dergua: 1 }) + '#aplikimi', values, errors: {} };
  if (rateLimited(`apply:${addr(ctx)}`, 5)) return { status: 429, values, errors: {}, tooMany: true };

  const errors: Record<string, string> = {};
  if (values.company.length < 2) errors.company = e.company;
  else if (hasAngle(values.company)) errors.company = e.angle; // the name reaches seller pages and their JSON-LD
  if (values.nipt && !validNipt(values.nipt)) errors.nipt = e.nipt;
  if (!(KIND_KEYS as string[]).includes(values.kind)) errors.kind = e.kind;
  if (values.contact_name.length < 3 || !/\s/.test(values.contact_name)) errors.contact_name = e.name;
  else if (hasAngle(values.contact_name)) errors.contact_name = e.angle;
  const phone = normalisePhone(values.phone);
  if (!phone) errors.phone = e.phone;
  if (!EMAIL_RE.test(values.email)) errors.email = e.email;
  if (values.city && !(await cityId(values.city))) errors.city = e.city;
  if (Object.keys(errors).length || !phone) return { status: 422, values, errors };

  await createApplication({
    company: values.company,
    nipt: values.nipt || null,
    kind: values.kind,
    contact_name: values.contact_name,
    phone,
    email: values.email,
    city: values.city || null,
    categories: values.categories || null,
    plan: planKeys.includes(values.plan) ? values.plan : null,
    message: values.message || null,
  });
  return { status: 303, redirect: href(lang, 'sell', {}, { dergua: 1 }) + '#aplikimi', values, errors: {} };
}

// ---------- contact ----------

export async function handleContact(ctx: Ctx, lang: Lang): Promise<FormResult> {
  const form = await ctx.request.formData();
  const e = tp(lang).form.err;
  const values = {
    name: str(form, 'name', 120),
    email: str(form, 'email', 160).toLowerCase(),
    phone: str(form, 'phone', 30),
    topic: str(form, 'topic', 20),
    body: str(form, 'body', 4000),
  };
  if (isBot(form)) return { status: 303, redirect: href(lang, 'contact', {}, { dergua: 1 }), values, errors: {} };
  if (rateLimited(`contact:${addr(ctx)}`, 5)) return { status: 429, values, errors: {}, tooMany: true };

  const errors: Record<string, string> = {};
  if (values.name.length < 2) errors.name = e.name;
  if (!(TOPIC_KEYS as string[]).includes(values.topic)) errors.topic = e.topic;
  const phone = values.phone ? normalisePhone(values.phone) : null;
  if (values.email && !EMAIL_RE.test(values.email)) errors.email = e.email;
  if (values.phone && !phone) errors.phone = e.phone;
  if (!values.email && !values.phone) errors.email = e.contact;
  if (values.body.length < 10) errors.body = e.body;
  if (Object.keys(errors).length) return { status: 422, values, errors };

  await createContactMessage({ name: values.name, email: values.email || null, phone, topic: values.topic, body: values.body, lang });
  return { status: 303, redirect: href(lang, 'contact', {}, { dergua: 1 }), values, errors: {} };
}

/** JSON answer for /api/* routes: same handlers, no page render. */
export function jsonResult(r: FormResult): Response {
  if (r.redirect) return Response.json({ ok: true, next: r.redirect }, { status: 200 });
  return Response.json({ ok: false, errors: r.errors, tooMany: !!r.tooMany }, { status: r.status });
}

/** A visit request from the installer finder (/instaluesit): a quote request addressed to one installer, answered in
 *  the same thread as any quote. */
export async function handleVisit(ctx: Ctx, lang: Lang): Promise<FormResult> {
  const form = await ctx.request.formData();
  const e = tp(lang).form.err;
  const values = {
    seller: str(form, 'seller', 12),
    city: str(form, 'city', 40),
    name: str(form, 'name', 120),
    phone: str(form, 'phone', 30),
    email: str(form, 'email', 160).toLowerCase(),
    details: str(form, 'details', 4000),
  };
  if (isBot(form)) return { status: 303, redirect: href(lang, 'installers', {}, { dergua: 1 }), values, errors: {} };
  if (rateLimited(`visit:${addr(ctx)}`, 6)) return { status: 429, values, errors: {}, tooMany: true };
  const errors: Record<string, string> = {};
  const installer = await get<{ id: number; name: string }>(
    "SELECT id, name FROM sellers WHERE id = ? AND status = 'active' AND kind IN ('installer', 'contractor')",
    Number(values.seller) || 0,
  );
  if (!installer) errors.seller = e.project;
  const city = await cityId(values.city);
  if (!city) errors.city = e.city;
  if (values.name.length < 3 || !/\s/.test(values.name)) errors.name = e.name;
  const phone = normalisePhone(values.phone);
  if (!phone) errors.phone = e.phone;
  if (values.email && !EMAIL_RE.test(values.email)) errors.email = e.email;
  if (values.details.length < 20) errors.details = e.details;
  if (Object.keys(errors).length || !city || !phone || !installer) return { status: 422, values, errors };
  const { code, token } = await createQuote({
    project_type: 'visit',
    city_id: city,
    name: values.name,
    phone,
    email: values.email || null,
    company: null,
    nipt: null,
    details: `${lang === 'sq' ? 'Vizitë nga' : 'Visit from'} ${installer.name}.\n\n${values.details}`,
    budget_all: null,
    items: [],
    lang,
    seller_id: installer.id,
  });
  return { status: 303, redirect: href(lang, 'quoteThread', { code }, { k: token, dergua: 1 }), values, errors: {} };
}

