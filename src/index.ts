import { Hono } from 'hono';
import { clearAdminCookie, getAdminSession, readAdminCookie } from './lib/auth/session';
import { writePageview } from './lib/analytics';
import type { AppBindings } from './lib/db';
import { getPublishedPageBySlug, type PageRecord } from './lib/db/pages';
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

  if (c.req.method === 'GET') {
    const slug = new URL(c.req.url).pathname.replace(/\/+$/, '') || '/';
    const page = await getPublishedPageBySlug(c.env, slug);
    if (page) return buildPageResponse(c.req.url, page);
  }

  const notFoundUrl = new URL('/404.html', c.req.url);
  const notFoundResponse = await c.env.ASSETS.fetch(new Request(notFoundUrl.toString(), c.req.raw));
  return new Response(notFoundResponse.body, {
    status: 404,
    headers: notFoundResponse.headers
  });
});

function escapeAttr(v: string) {
  return v.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function buildPageResponse(requestUrl: string, page: PageRecord) {
  const origin = new URL(requestUrl).origin;
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <script>(function(){var t=localStorage.getItem('theme');if(!t){t=window.matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light'}document.documentElement.setAttribute('data-theme',t)})()</script>
  <title>${escapeAttr(page.title)} | Ashley Jae Carranza</title>
  <meta name="description" content="${escapeAttr(page.description)}" />
  <meta property="og:title" content="${escapeAttr(page.title)}" />
  <meta property="og:description" content="${escapeAttr(page.description)}" />
  <meta property="og:url" content="${escapeAttr(origin + page.slug)}" />
  <meta name="robots" content="index,follow" />
  <meta name="theme-color" content="#FAFAF8" />
  <link rel="icon" href="/assets/img/favicon.svg" type="image/svg+xml" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/css/bootstrap.min.css" rel="stylesheet" />
  <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css" rel="stylesheet" />
  <link rel="stylesheet" href="/assets/css/styles.css" />
  <link rel="stylesheet" href="/assets/css/blocks.css" />
</head>
<body data-page="custom" data-page-slug="${escapeAttr(page.slug)}">
  <a class="skip-link" href="#main-content">Skip to content</a>
  <div id="site-nav"></div>
  <main id="main-content" class="page-wrap">
    <div id="page-blocks" class="container py-4"></div>
  </main>
  <div id="site-footer"></div>
  <script defer src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/js/bootstrap.bundle.min.js"></script>
  <script type="module" src="/assets/js/main.js"></script>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }
  });
}

export default app;
