import { Hono } from 'hono';
import { writePageview } from './lib/analytics';
import type { AppBindings } from './lib/db';
import { adminApi } from './routes/admin';
import { publicApi } from './routes/public';

type AppEnv = {
  Bindings: AppBindings;
  Variables: {
    adminEmail: string;
    sessionToken: string;
  };
};

const app = new Hono<AppEnv>();

function shouldTrackPageview(request: Request, response: Response) {
  if (request.method !== 'GET') return false;
  if (response.status >= 400) return false;
  const { pathname } = new URL(request.url);
  if (pathname.startsWith('/api/') || pathname.startsWith('/assets/') || pathname.startsWith('/admin/')) return false;
  return !/\.[a-z0-9]+$/i.test(pathname) || pathname.endsWith('.html');
}

app.use('*', async (c, next) => {
  await next();
  if (shouldTrackPageview(c.req.raw, c.res)) {
    c.executionCtx.waitUntil(writePageview(c.env, new URL(c.req.url).pathname));
  }
});

app.route('/api/content', publicApi);
app.route('/api/admin', adminApi);

app.onError((error, c) => {
  console.error(error);
  return c.json({ error: 'Unexpected server error.' }, 500);
});

app.all('*', async (c) => {
  const assetResponse = await c.env.ASSETS.fetch(c.req.raw);
  if (assetResponse.status !== 404) return assetResponse;

  const notFoundUrl = new URL('/404.html', c.req.url);
  const notFoundResponse = await c.env.ASSETS.fetch(new Request(notFoundUrl.toString(), c.req.raw));
  return new Response(notFoundResponse.body, {
    status: 404,
    headers: notFoundResponse.headers
  });
});

export default app;

