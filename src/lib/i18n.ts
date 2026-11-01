// Two languages: Albanian at the root, English under /en. Every public route has a localised path,
// so links are built from ROUTES and never typed by hand.
export type Lang = 'sq' | 'en';
export const LANGS: Lang[] = ['sq', 'en'];
export const LOCALE: Record<Lang, string> = { sq: 'sq-AL', en: 'en' };

export const ROUTES = {
  home: { sq: '/', en: '/en' },
  shop: { sq: '/dyqani', en: '/en/shop' },
  category: { sq: '/dyqani/:slug', en: '/en/shop/:slug' },
  product: { sq: '/produkt/:slug', en: '/en/product/:slug' },
  compare: { sq: '/krahaso', en: '/en/compare' },
  cart: { sq: '/shporta', en: '/en/cart' },
  checkout: { sq: '/arka', en: '/en/checkout' },
  order: { sq: '/porosia/:code', en: '/en/order/:code' },
  calculator: { sq: '/kalkulatori-diellor', en: '/en/solar-calculator' },
  guide: { sq: '/energji-e-rinovueshme', en: '/en/renewable-energy' },
  packages: { sq: '/paketa-diellore', en: '/en/solar-packages' },
  sellers: { sq: '/shitesit', en: '/en/sellers' },
  seller: { sq: '/shitesit/:slug', en: '/en/sellers/:slug' },
  sell: { sq: '/shit-me-ne', en: '/en/sell-with-us' },
  quote: { sq: '/kerko-oferte', en: '/en/request-a-quote' },
  quoteThread: { sq: '/oferta/:code', en: '/en/quote/:code' },
  search: { sq: '/kerko', en: '/en/search' },
  about: { sq: '/rreth-nesh', en: '/en/about' },
  contact: { sq: '/kontakt', en: '/en/contact' },
  terms: { sq: '/kushtet', en: '/en/terms' },
  privacy: { sq: '/privatesia', en: '/en/privacy' },
  track: { sq: '/gjurmo-porosine', en: '/en/track-order' },
  quiz: { sq: '/cili-sistem', en: '/en/which-system' },
  builder: { sq: '/nderto-sistemin', en: '/en/build-your-system' },
  installers: { sq: '/instaluesit', en: '/en/installers' },
  solarCity: { sq: '/energji-diellore/:slug', en: '/en/solar-energy/:slug' },
  projects: { sq: '/projekte', en: '/en/projects' },
} as const;

export type RouteKey = keyof typeof ROUTES;

export function href(lang: Lang, key: RouteKey, params: Record<string, string | number> = {}, query?: Record<string, string | number | undefined | null>): string {
  let path: string = ROUTES[key][lang];
  for (const [k, v] of Object.entries(params)) path = path.replace(`:${k}`, encodeURIComponent(String(v)));
  if (query) {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) if (v !== undefined && v !== null && v !== '') q.set(k, String(v));
    const s = q.toString();
    if (s) path += `?${s}`;
  }
  return path;
}

export function langFromPath(pathname: string): Lang {
  return pathname === '/en' || pathname.startsWith('/en/') ? 'en' : 'sq';
}

export function other(lang: Lang): Lang {
  return lang === 'sq' ? 'en' : 'sq';
}

/** Pick the field for a language from a row with name_sq / name_en style columns. */
export function pick<T extends Record<string, any>>(row: T, field: string, lang: Lang): string {
  return (row[`${field}_${lang}`] ?? row[`${field}_sq`] ?? '') as string;
}

/** Albanian month names, built here rather than with Intl in the browser (Chrome has no sq data). */
export const MONTHS: Record<Lang, string[]> = {
  sq: ['janar', 'shkurt', 'mars', 'prill', 'maj', 'qershor', 'korrik', 'gusht', 'shtator', 'tetor', 'nëntor', 'dhjetor'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
};
export const MONTHS_SHORT: Record<Lang, string[]> = {
  sq: ['jan', 'shk', 'mar', 'pri', 'maj', 'qer', 'kor', 'gus', 'sht', 'tet', 'nën', 'dhj'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
};

export function date(iso: string, lang: Lang, withTime = false): string {
  const d = new Date(iso.includes('T') || iso.endsWith('Z') ? iso : iso.replace(' ', 'T') + 'Z');
  // Show Tirana time: Europe/Tirane is UTC+1, UTC+2 in summer.
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Tirane', year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(d);
  const p = Object.fromEntries(parts.map((x) => [x.type, x.value]));
  const m = MONTHS[lang][Number(p.month) - 1];
  const day = lang === 'sq' ? `${Number(p.day)} ${m} ${p.year}` : `${Number(p.day)} ${m} ${p.year}`;
  return withTime ? `${day}, ${p.hour}:${p.minute}` : day;
}
