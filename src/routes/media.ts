import { Hono } from 'hono';
import type { AppBindings } from '../lib/db';

type MediaEnv = {
  Bindings: AppBindings;
};

export const mediaApi = new Hono<MediaEnv>();

mediaApi.get('/:key{.+}', async (c) => {
  if (!c.env.MEDIA) return c.notFound();

  const key = c.req.param('key');
  const object = await c.env.MEDIA.get(key);
  if (!object) return c.notFound();

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  headers.set('cache-control', 'public, max-age=31536000, immutable');

  return new Response(object.body, {
    headers
  });
});
