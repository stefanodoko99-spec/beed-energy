// Content-Security-Policy for HTML pages. The only inline scripts are the two snippets that have to run
// before first paint; they live here as strings so the layouts emit exactly the text we hash.
// Every other script is a file ('self'): astro.config sets assetsInlineLimit 0 so the build never
// inlines a bundled script into the page. JSON and JSON-LD <script> blocks are data, not code.
import { createHash } from 'node:crypto';

/** Reads the Stop-animations choice (or reduced motion) and marks <html> before the first paint. */
export const MOTION_SCRIPT =
  "(function(){var d=document.documentElement;d.classList.add('js');var off=false;" +
  "try{off=localStorage.getItem('beed-motion')==='off'}catch(e){}" +
  "if(!off&&window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches)off=true;" +
  "d.setAttribute('data-motion',off?'off':'on')})();";

/**
 * On the page with the intro (home): decides before the first paint whether it plays, so the page is never
 * seen first and covered a moment later. Once per session, never with motion off or when the address
 * points into the page. Runs after MOTION_SCRIPT; src/scripts/site.ts plays it when <html data-preloader="on">.
 */
export const LOADER_SCRIPT =
  "(function(){var d=document.documentElement,s=false;if(d.getAttribute('data-motion')==='off'||location.hash)return;" +
  "try{s=sessionStorage.getItem('beed-loader')==='1';sessionStorage.setItem('beed-loader','1')}catch(e){}" +
  "if(!s)d.setAttribute('data-preloader','on')})();";

const sha = (s: string) => `'sha256-${createHash('sha256').update(s, 'utf8').digest('base64')}'`;
const SCRIPT_HASHES = [sha(MOTION_SCRIPT), sha(LOADER_SCRIPT)];

/** The POK card form is on pokpay.io; the checkout's 303 to it is a form submission redirect. */
export function contentSecurityPolicy(opts: { pok: boolean }): string {
  return [
    "default-src 'self'",
    `script-src 'self' ${SCRIPT_HASHES.join(' ')}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self'",
    `form-action 'self'${opts.pok ? ' https://pokpay.io https://*.pokpay.io' : ''}`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "object-src 'none'",
  ].join('; ');
}
