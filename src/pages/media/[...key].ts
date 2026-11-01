// Serves product photos (p/) and project photos (j/) stored by src/lib/media.ts. Keys are content hashes, so a response never changes
// and browsers may keep it for a year without asking again.
import type { APIRoute } from 'astro';
import { getMedia } from '../../lib/media';

const KEY = /^[pj]\/\d+\/[0-9a-f]{20}\.(?:jpg|png|webp)$/;

export const GET: APIRoute = async ({ params, request }) => {
  const key = params.key ?? '';
  if (!KEY.test(key)) return new Response('Not found', { status: 404 });
  const etag = `"${key.split('/').pop()}"`;
  if (request.headers.get('if-none-match') === etag) return new Response(null, { status: 304, headers: { etag } });
  const m = await getMedia(key);
  if (!m) return new Response('Not found', { status: 404 });
  return new Response(m.body, {
    headers: {
      'content-type': m.type,
      'cache-control': 'public, max-age=31536000, immutable',
      etag,
      'x-content-type-options': 'nosniff',
    },
  });
};
