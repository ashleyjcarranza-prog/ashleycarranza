const defaultNavigation = [
  { label: 'About', href: '/about/' },
  { label: 'My Work', href: '/my-work/' },
  { label: 'Speaking & Features', href: '/speaking-features/' },
  { label: 'News', href: '/news/' },
  { label: 'Contact', href: '/contact/' }
];

const jsonCache = new Map();
let siteDataPromise;
const apiOverrides = new Map([
  ['/data/site.json', '/api/content/site'],
  ['/data/about.json', '/api/content/about'],
  ['/data/events.json', '/api/content/events'],
  ['/data/products.json', '/api/content/products']
]);

export function getSiteBasePath() {
  if (!window.location.hostname.endsWith('github.io')) return '';

  const parts = window.location.pathname.split('/').filter(Boolean);
  return parts.length ? `/${parts[0]}` : '';
}

export function withBasePath(path = '/') {
  if (!path) return getSiteBasePath() || '/';
  if (/^[a-z][a-z0-9+.-]*:/i.test(path) || /^(https?:)?\/\//.test(path) || path.startsWith('#')) {
    return path;
  }

  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${getSiteBasePath()}${normalized}`;
}

export function assetUrl(path, fallback = '') {
  if (!path) return fallback;
  return withBasePath(path);
}

export function normalizePath(path) {
  return path.replace(/\/+$/, '') || '/';
}

export function stripBasePath(path) {
  const base = getSiteBasePath();
  return base && path.startsWith(base) ? path.slice(base.length) || '/' : path;
}

export async function getJson(path) {
  const cacheKey = withBasePath(path);

  if (!jsonCache.has(cacheKey)) {
    jsonCache.set(
      cacheKey,
      (async () => {
        const overridePath = apiOverrides.get(path);
        if (overridePath) {
          const overrideResponse = await fetch(withBasePath(overridePath), { cache: 'no-cache' });
          if (overrideResponse.ok) return overrideResponse.json();
        }

        const fallbackPath = withBasePath(path);
        const fallbackResponse = await fetch(fallbackPath, { cache: 'no-cache' });
        if (!fallbackResponse.ok) throw new Error(`Failed to fetch ${fallbackPath}`);
        return fallbackResponse.json();
      })()
    );
  }

  return jsonCache.get(cacheKey);
}

export async function getSiteData() {
  if (!siteDataPromise) {
    siteDataPromise = getJson('/data/site.json').catch(() => null);
  }

  return siteDataPromise;
}

export function getNavigation(site = {}) {
  const navigation = Array.isArray(site.navigation) && site.navigation.length ? site.navigation : defaultNavigation;
  return navigation.map((item) => ({
    ...item,
    href: withBasePath(item.href)
  }));
}
