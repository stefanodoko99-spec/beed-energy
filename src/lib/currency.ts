// The visitor's display currency (server side). Prices are lekë everywhere in the data and in every payment; a
// visitor may choose euros for orientation (cookie beed_cur, set by /api/currency). The middleware runs each page
// inside this request's choice (AsyncLocalStorage, nodejs_compat), so every lek() call on that page formats in it
// without being passed anything. Checkout, order pages and the admin always show lekë: that is what is paid.
import { AsyncLocalStorage } from 'node:async_hooks';
import type { AstroCookies } from 'astro';
import { setting } from './db';
import { setDisplaySource } from './money';

export const CUR_COOKIE = 'beed_cur';
type Display = { cur: 'all' | 'eur'; rate: number };
const als = new AsyncLocalStorage<Display>();
setDisplaySource(() => als.getStore());

const LEK_ONLY = /^(?:\/admin|\/api|\/arka|\/en\/checkout|\/porosia\/|\/en\/order\/)/;

let cached: { rate: number; at: number } | null = null;
/** Lekë per euro from the admin settings ('currency'.eurAll), cached for five minutes. */
export async function eurRate(): Promise<number> {
  if (cached && Date.now() - cached.at < 300_000) return cached.rate;
  const c = await setting<{ eurAll?: number }>('currency', { eurAll: 100 });
  const rate = Number(c?.eurAll) > 0 ? Number(c.eurAll) : 100;
  cached = { rate, at: Date.now() };
  return rate;
}

export async function displayFor(cookies: AstroCookies, pathname: string): Promise<Display> {
  if (cookies.get(CUR_COOKIE)?.value !== 'eur' || LEK_ONLY.test(pathname)) return { cur: 'all', rate: 0 };
  return { cur: 'eur', rate: await eurRate() };
}

export function withDisplay<T>(d: Display, fn: () => Promise<T>): Promise<T> {
  return d.cur === 'eur' ? als.run(d, fn) : fn();
}
