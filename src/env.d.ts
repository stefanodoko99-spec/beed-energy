/// <reference types="astro/client" />

// D1Database is imported, never referenced globally: @cloudflare/workers-types replaces lib.dom
// wholesale, and the browser scripts under src/scripts are type-checked in the same project.
type D1 = import('@cloudflare/workers-types').D1Database;
type KV = import('@cloudflare/workers-types').KVNamespace;

/** The bindings declared in wrangler.jsonc, plus the secrets set with `wrangler secret put`. */
interface Env {
  DB: D1;
  /** Product photos (src/lib/media.ts). */
  MEDIA: KV;
  POK_ENV?: string;
  POK_KEY_ID?: string;
  POK_KEY_SECRET?: string;
  POK_MERCHANT_ID?: string;
  PUBLIC_ORIGIN?: string;
  TRUST_PROXY?: string;
  PAY_TEST?: string;
  DEV_LOGIN?: string;
}

declare module 'cloudflare:workers' {
  export const env: Env;
}

declare namespace App {
  interface Locals {
    lang: import('./lib/i18n').Lang;
    user: import('./lib/auth').User | null;
    /** Lekë or euros on this page (lib/currency.ts, set by the middleware). */
    display?: { cur: 'all' | 'eur'; rate: number };
    /** The Worker's execution context, set by @astrojs/cloudflare. Absent outside a Worker. */
    cfContext?: { waitUntil(p: Promise<unknown>): void; passThroughOnException(): void };
  }
}

declare module '*.sql?raw' {
  const sql: string;
  export default sql;
}
