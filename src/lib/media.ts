// Product photos. The bytes live in the MEDIA KV namespace; product_images keeps the public path, size
// and alt text. Keys are content hashes, so a path never changes meaning and can be cached for a year.
//
// KV rather than R2 only because R2 is not enabled on the account. Switching means changing the three
// storage calls below (put, getWithMetadata, delete) to an R2 bucket; nothing outside this file knows.
import { env } from 'cloudflare:workers';

export const MEDIA_PREFIX = '/media/';
/** After the browser has resized it (src/scripts/admin/photos.ts) a photo is ~100–400 KB; this allows an unresized phone photo. */
export const MAX_BYTES = 8 * 1024 * 1024;

const TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' } as const;
type ImageType = keyof typeof TYPES;

export class MediaError extends Error {
  constructor(public code: 'type' | 'size' | 'empty') {
    super(code);
  }
}

/** The format the bytes actually are, whatever the upload claimed. */
function sniff(b: Uint8Array): ImageType | null {
  if (b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png';
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b.length > 12 && String.fromCharCode(...b.subarray(0, 4)) === 'RIFF' && String.fromCharCode(...b.subarray(8, 12)) === 'WEBP') return 'image/webp';
  return null;
}

/** Pixel size from the file header; null when the header is not one this reads. */
export function imageSize(b: Uint8Array, type: ImageType): { width: number; height: number } | null {
  const be16 = (i: number) => (b[i] << 8) | b[i + 1];
  const le16 = (i: number) => b[i] | (b[i + 1] << 8);
  const le24 = (i: number) => b[i] | (b[i + 1] << 8) | (b[i + 2] << 16);
  if (type === 'image/png') {
    const w = ((b[16] << 24) | (b[17] << 16) | (b[18] << 8) | b[19]) >>> 0;
    const h = ((b[20] << 24) | (b[21] << 16) | (b[22] << 8) | b[23]) >>> 0;
    return w && h ? { width: w, height: h } : null;
  }
  if (type === 'image/jpeg') {
    // Walk the segments to the first start-of-frame marker (C0–CF, except DHT C4, JPG C8 and DAC CC).
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) return null;
      const m = b[i + 1];
      if (m === 0xff) { i++; continue; }
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return { height: be16(i + 5), width: be16(i + 7) };
      i += 2 + be16(i + 2);
    }
    return null;
  }
  const chunk = String.fromCharCode(...b.subarray(12, 16));
  if (chunk === 'VP8 ') return { width: le16(26) & 0x3fff, height: le16(28) & 0x3fff };
  if (chunk === 'VP8L') {
    const [b0, b1, b2, b3] = [b[21], b[22], b[23], b[24]];
    return { width: 1 + (((b1 & 0x3f) << 8) | b0), height: 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6)) };
  }
  if (chunk === 'VP8X') return { width: 1 + le24(24), height: 1 + le24(27) };
  return null;
}

async function sha256Hex(data: ArrayBuffer): Promise<string> {
  const d = new Uint8Array(await crypto.subtle.digest('SHA-256', data));
  return [...d].map((x) => x.toString(16).padStart(2, '0')).join('');
}

/** Stores one product photo and returns what product_images needs. Throws MediaError on a bad file. */
export async function putProductImage(productId: number, file: File): Promise<{ path: string; width: number | null; height: number | null }> {
  return putImage(`p/${productId}`, file);
}

/** A project photo for the installation gallery (admin/projects): j/<project id>/<hash>. */
export async function putProjectImage(projectId: number, file: File): Promise<{ path: string; width: number | null; height: number | null }> {
  return putImage(`j/${projectId}`, file);
}

async function putImage(folder: string, file: File): Promise<{ path: string; width: number | null; height: number | null }> {
  if (!file.size) throw new MediaError('empty');
  if (file.size > MAX_BYTES) throw new MediaError('size');
  const data = await file.arrayBuffer();
  const bytes = new Uint8Array(data);
  const type = sniff(bytes);
  if (!type) throw new MediaError('type');
  const key = `${folder}/${(await sha256Hex(data)).slice(0, 20)}.${TYPES[type]}`;
  await env.MEDIA.put(key, data, { metadata: { type } });
  const size = imageSize(bytes, type);
  return { path: MEDIA_PREFIX + key, width: size?.width ?? null, height: size?.height ?? null };
}

export async function getMedia(key: string): Promise<{ body: ArrayBuffer; type: string } | null> {
  const r = await env.MEDIA.getWithMetadata<{ type?: string }>(key, 'arrayBuffer');
  if (!r.value) return null;
  return { body: r.value, type: r.metadata?.type ?? 'application/octet-stream' };
}

/** Removes the stored file behind a product_images path. Paths from elsewhere are left alone. */
export async function deleteMedia(path: string): Promise<void> {
  if (!path.startsWith(MEDIA_PREFIX)) return;
  await env.MEDIA.delete(path.slice(MEDIA_PREFIX.length));
}
