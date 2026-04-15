import { Hono } from 'hono';
import { clearAdminCookie, getAdminSession, readAdminCookie } from './lib/auth/session';
import { writePageview } from './lib/analytics';
import type { AppBindings } from './lib/db';
import { adminApi } from './routes/admin';
import { mediaApi } from './routes/media';
import { publicApi } from './routes/public';

type AppEnv = {
  Bindings: AppBindings;
  Variables: {
    adminEmail: string;
    sessionToken: string;
  };
};

const app = new Hono<AppEnv>();

function isAdminPage(pathname: string) {
  return (
    pathname === '/admin' ||
    pathname === '/admin/' ||
    pathname === '/admin/login' ||
    pathname === '/admin/login/' ||
    pathname === '/admin/editor' ||
    pathname === '/admin/editor/'
  );
}

function shouldTrackPageview(request: Request, response: Response) {
  if (request.method !== 'GET') return false;
  if (response.status >= 400) return false;
  const { pathname } = new URL(request.url);
  if (pathname.startsWith('/api/') || pathname.startsWith('/assets/') || pathname.startsWith('/admin/')) return false;
  return !/\.[a-z0-9]+$/i.test(pathname) || pathname.endsWith('.html');
}

app.use('*', async (c, next) => {
  const pathname = new URL(c.req.url).pathname;

  if (c.req.method === 'GET' && isAdminPage(pathname)) {
    const token = readAdminCookie(c);
    const session = token ? await getAdminSession(c.env, token) : null;

    if (token && !session) clearAdminCookie(c);

    if ((pathname === '/admin' || pathname === '/admin/' || pathname === '/admin/editor' || pathname === '/admin/editor/') && !session) {
      return c.redirect('/admin/login/', 302);
    }

    if ((pathname === '/admin/login' || pathname === '/admin/login/') && session) {
      return c.redirect('/admin/', 302);
    }
  }

  await next();
  if (shouldTrackPageview(c.req.raw, c.res)) {
    c.executionCtx.waitUntil(writePageview(c.env, new URL(c.req.url).pathname));
  }
});

app.route('/api/content', publicApi);
app.route('/api/admin', adminApi);
app.route('/media', mediaApi);

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
