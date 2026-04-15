import { Hono } from 'hono';
import { getManagedAbout, getManagedEvents, getManagedLegal, getManagedProducts, getManagedSite } from '../lib/content';
import type { AppBindings } from '../lib/db';

type PublicEnv = {
  Bindings: AppBindings;
};

export const publicApi = new Hono<PublicEnv>();

publicApi.get('/site', async (c) => c.json(await getManagedSite(c.env, c.req.url), 200, { 'Cache-Control': 'no-store' }));
publicApi.get('/about', async (c) => c.json(await getManagedAbout(c.env, c.req.url), 200, { 'Cache-Control': 'no-store' }));
publicApi.get('/events', async (c) => c.json(await getManagedEvents(c.env, c.req.url), 200, { 'Cache-Control': 'no-store' }));
publicApi.get('/products', async (c) => c.json(await getManagedProducts(c.env, c.req.url), 200, { 'Cache-Control': 'no-store' }));
publicApi.get('/legal', async (c) => c.json(await getManagedLegal(c.env), 200, { 'Cache-Control': 'no-store' }));
