// Runs FLUX.2 [klein] 4B (@cf/black-forest-labs/flux-2-klein-4b, Apache 2.0 weights) on Cloudflare Workers AI
// with the logged-in wrangler account, inside the free daily allowance (10,000 neurons, resets 00:00 UTC; error
// 4006 when used up). The same runner as house-prompts.mjs, made reusable: a prompt module exports `briefs()`
// ({ id, width, height, prompt, reference? }) and calls `run(briefs(), process.argv)` when started directly.
//
//   node tools/art/<prompts>.mjs <raw dir> [--only id,id] [--n 2] [--ref image.jpg]
//
// Needs a live `npx wrangler login` (`npx wrangler whoami` renews an expired token). Saves <raw dir>/<id>-<n>.jpg
// and skips files already there. Reference images (`reference: true`) go in input_image_0: a brief's own
// `reference` path wins over --ref.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import https from 'node:https';

export const MODEL = '@cf/black-forest-labs/flux-2-klein-4b';

function wranglerToken() {
  // wrangler keeps its config in ~/.wrangler on Linux and in ~/Library/Preferences/.wrangler on macOS
  const candidates = [path.join(os.homedir(), 'Library', 'Preferences', '.wrangler', 'config', 'default.toml'), path.join(os.homedir(), '.wrangler', 'config', 'default.toml')];
  const file = candidates.find((f) => fs.existsSync(f));
  if (!file) throw new Error('no wrangler config: run `npx wrangler login`');
  const toml = fs.readFileSync(file, 'utf8');
  const token = toml.match(/^oauth_token\s*=\s*"([^"]+)"/m)?.[1];
  const expires = toml.match(/^expiration_time\s*=\s*"([^"]+)"/m)?.[1];
  if (!token || (expires && Date.parse(expires) < Date.now() + 60_000)) throw new Error('wrangler login missing or expired: run `npx wrangler whoami`');
  return token;
}

export async function run(briefs, argv) {
  const arg = (name) => { const i = argv.indexOf(name); return i > 0 ? argv[i + 1] : null; };
  const dir = argv[2];
  if (!dir || dir.startsWith('--')) throw new Error('usage: node <prompts>.mjs <raw dir> [--only id,id] [--n 2] [--ref image.jpg]');
  const only = arg('--only')?.split(',');
  const n = Number(arg('--n') || 2);
  const ref = arg('--ref');
  const token = wranglerToken();
  // CF_API_IP pins api.cloudflare.com to one IPv4 address where the resolver gives a bad one
  const ip = process.env.CF_API_IP;
  const lookup = ip ? (host, options, cb) => (options.all ? cb(null, [{ address: ip, family: 4 }]) : cb(null, ip, 4)) : undefined;
  const api = (method, url, body, type) => new Promise((resolve, reject) => {
    const req = https.request(url, { method, lookup, timeout: 180_000, headers: { authorization: `Bearer ${token}`, ...(type ? { 'content-type': type } : {}) } }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        let json;
        try { json = JSON.parse(Buffer.concat(chunks).toString()); } catch { return reject(new Error(`HTTP ${res.statusCode}`)); }
        if (res.statusCode !== 200 || json.success === false) reject(new Error(`HTTP ${res.statusCode}: ${JSON.stringify(json.errors ?? json).slice(0, 300)}`));
        else resolve(json.result);
      });
    });
    req.on('timeout', () => req.destroy(new Error('timed out')));
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
  // FLUX.2 on Workers AI takes multipart form data; reference images go in input_image_0…3
  const form = (fields) => {
    const b = '----flux2' + Math.random().toString(16).slice(2);
    const parts = Object.entries(fields).flatMap(([k, v]) => {
      if (!Buffer.isBuffer(v)) return [Buffer.from(`--${b}\r\nContent-Disposition: form-data; name="${k}"\r\n\r\n${v}\r\n`)];
      const png = v[0] === 0x89 && v[1] === 0x50;
      return [Buffer.from(`--${b}\r\nContent-Disposition: form-data; name="${k}"; filename="${k}.${png ? 'png' : 'jpg'}"\r\nContent-Type: image/${png ? 'png' : 'jpeg'}\r\n\r\n`), v, Buffer.from('\r\n')];
    });
    return { body: Buffer.concat([...parts, Buffer.from(`--${b}--\r\n`)]), type: `multipart/form-data; boundary=${b}` };
  };
  const [account] = await api('GET', 'https://api.cloudflare.com/client/v4/accounts');
  fs.mkdirSync(dir, { recursive: true });
  for (const brief of briefs) {
    if (only && !only.includes(brief.id)) continue;
    for (let i = 1; i <= n; i++) {
      if (['.jpg', '.png'].some((ext) => fs.existsSync(path.join(dir, `${brief.id}-${i}${ext}`)))) continue;
      const fields = { prompt: brief.prompt, width: String(brief.width), height: String(brief.height) };
      if (brief.reference) {
        const file = typeof brief.reference === 'string' ? brief.reference : ref;
        if (!file) throw new Error(`${brief.id} needs a reference image (--ref)`);
        fields.input_image_0 = fs.readFileSync(file);
      }
      const { body, type } = form(fields);
      try {
        const { image } = await api('POST', `https://api.cloudflare.com/client/v4/accounts/${account.id}/ai/run/${MODEL}`, body, type);
        const bytes = Buffer.from(image, 'base64');
        const file = path.join(dir, `${brief.id}-${i}${bytes[0] === 0x89 ? '.png' : '.jpg'}`);
        fs.writeFileSync(file, bytes);
        console.log(file);
      } catch (e) {
        console.log(`${brief.id}-${i}: ${e.message}`);
        if (/4006/.test(e.message)) return; // daily allowance used up
      }
    }
  }
}
