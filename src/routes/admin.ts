import { asc, eq, sql } from 'drizzle-orm';
import { Hono, type MiddlewareHandler } from 'hono';
import { getResolvedAdminCredentials, upsertAdminCredentials } from '../lib/auth/credentials';
import { clearAdminCookie, getAdminSession, issueAdminSession, readAdminCookie, revokeAdminSession, setAdminCookie } from '../lib/auth/session';
import { createPasswordHash, verifyPassword } from '../lib/auth/password';
import { recordAudit } from '../lib/audit';
import { getAdminAnalytics } from '../lib/analytics';
import { getManagedAbout, getManagedLegal, getManagedProducts, getManagedSite, upsertDocument } from '../lib/content';
import { getDb, nowIso, type AppBindings } from '../lib/db';
import { adminSessions, links, speakingItems } from '../lib/db/schema';
import { listImageLibrary, uploadImage } from '../lib/media';
import {
  aboutDocumentSchema,
  authSettingsInputSchema,
  legalDocumentSchema,
  linkInputSchema,
  pageInputSchema,
  productsDocumentSchema,
  siteDocumentSchema,
  speakingInputSchema,
  validateBlocks
} from '../lib/validation';
import { createPage, deletePage, getPageById, listPages, updatePage } from '../lib/db/pages';

type AdminEnv = {
  Bindings: AppBindings;
  Variables: {
    adminEmail: string;
    sessionToken: string;
  };
};

const adminApi = new Hono<AdminEnv>();

function isTrustedOrigin(requestUrl: string, origin: string | null, siteUrl: string) {
  if (!origin) return false;
  try {
    const current = new URL(requestUrl);
    const incoming = new URL(origin);
    const configured = new URL(siteUrl);
    return incoming.origin === current.origin || incoming.origin === configured.origin;
  } catch {
    return false;
  }
}

async function enforceRateLimit(env: AppBindings, key: string) {
  const bindingResult = await env.LOGIN_LIMITER?.limit?.({ key });
  if (bindingResult) return bindingResult.success;

  const db = getDb(env);
  const response = await db.run(sql`
    SELECT COUNT(*) AS count
    FROM audit_log
    WHERE entity_type = 'auth'
      AND action = 'login_failed'
      AND entity_id = ${key}
      AND created_at >= datetime('now', '-15 minutes')
  `);

  const summary = (response.results?.[0] ?? {}) as Record<string, unknown>;
  return Number(summary.count ?? 0) < 5;
}

const requireAdmin: MiddlewareHandler<AdminEnv> = async (c, next) => {
  const token = readAdminCookie(c);
  if (!token) return c.json({ authenticated: false }, 401);

  const session = await getAdminSession(c.env, token);
  if (!session) {
    clearAdminCookie(c);
    return c.json({ authenticated: false }, 401);
  }

  c.set('adminEmail', session.email);
  c.set('sessionToken', token);
  await next();
};

adminApi.use('*', async (c, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(c.req.method)) {
    await next();
    return;
  }

  if (!isTrustedOrigin(c.req.url, c.req.header('origin') ?? null, c.env.SITE_URL)) {
    return c.json({ error: 'Untrusted origin.' }, 403);
  }

  await next();
});

adminApi.post('/auth/login', async (c) => {
  const body = await c.req.json<{ email?: string; password?: string }>().catch(() => null);
  if (!body?.email || !body?.password) return c.json({ error: 'Email and password are required.' }, 400);

  const normalizedEmail = body.email.trim().toLowerCase();
  const allowed = await enforceRateLimit(c.env, normalizedEmail);
  if (!allowed) return c.json({ error: 'Too many login attempts. Try again later.' }, 429);

  const credentials = await getResolvedAdminCredentials(c.env);

  if (normalizedEmail !== credentials.email) {
    await recordAudit(c.env, {
      actorEmail: normalizedEmail,
      entityType: 'auth',
      entityId: normalizedEmail,
      action: 'login_failed',
      summary: 'Rejected admin login attempt.'
    });
    return c.json({ error: 'Invalid email or password.' }, 401);
  }

  const validPassword = await verifyPassword(body.password, credentials.passwordHash);
  if (!validPassword) {
    await recordAudit(c.env, {
      actorEmail: normalizedEmail,
      entityType: 'auth',
      entityId: normalizedEmail,
      action: 'login_failed',
      summary: 'Rejected admin login attempt.'
    });
    return c.json({ error: 'Invalid email or password.' }, 401);
  }

  const { token, expiresAt } = await issueAdminSession(c.env, normalizedEmail);
  setAdminCookie(c, token, expiresAt);
  await recordAudit(c.env, {
    actorEmail: normalizedEmail,
    entityType: 'auth',
    action: 'login',
    summary: 'Admin logged in.'
  });
  return c.json({ authenticated: true, email: normalizedEmail });
});

adminApi.get('/session', async (c) => {
  const token = readAdminCookie(c);
  if (!token) return c.json({ authenticated: false });
  const session = await getAdminSession(c.env, token);
  if (!session) {
    clearAdminCookie(c);
    return c.json({ authenticated: false });
  }
  return c.json({ authenticated: true, email: session.email });
});

adminApi.post('/auth/logout', requireAdmin, async (c) => {
  const token = c.get('sessionToken');
  await revokeAdminSession(c.env, token);
  clearAdminCookie(c);
  await recordAudit(c.env, {
    actorEmail: c.get('adminEmail'),
    entityType: 'auth',
    action: 'logout',
    summary: 'Admin logged out.'
  });
  return c.json({ success: true });
});

adminApi.use('*', requireAdmin);

adminApi.get('/auth-settings', async (c) => {
  const credentials = await getResolvedAdminCredentials(c.env);
  return c.json({ email: credentials.email });
});

adminApi.get('/media', async (c) => c.json(await listImageLibrary(c.env, c.req.url)));

adminApi.post('/media', async (c) => {
  const formData = await c.req.formData().catch(() => null);
  const file = formData?.get('file');
  if (!(file instanceof File)) return c.json({ error: 'Image file is required.' }, 400);

  try {
    const item = await uploadImage(c.env, file);
    await recordAudit(c.env, {
      actorEmail: c.get('adminEmail'),
      entityType: 'media',
      entityId: item.id,
      action: 'upload',
      summary: `Uploaded image "${file.name}".`
    });
    return c.json({ success: true, item });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Unable to upload image.' }, 400);
  }
});

adminApi.patch('/auth-settings', async (c) => {
  const parsed = authSettingsInputSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  const credentials = await getResolvedAdminCredentials(c.env);
  const validPassword = await verifyPassword(parsed.data.currentPassword, credentials.passwordHash);
  if (!validPassword) return c.json({ error: 'Current password is incorrect.' }, 400);

  const nextEmail = parsed.data.email.trim().toLowerCase();
  const nextPasswordHash =
    parsed.data.newPassword.trim() !== ''
      ? await createPasswordHash(parsed.data.newPassword.trim())
      : credentials.passwordHash;

  await upsertAdminCredentials(c.env, nextEmail, nextPasswordHash);

  const db = getDb(c.env);
  await db.delete(adminSessions);

  const { token, expiresAt } = await issueAdminSession(c.env, nextEmail);
  setAdminCookie(c, token, expiresAt);

  await recordAudit(c.env, {
    actorEmail: c.get('adminEmail'),
    entityType: 'auth',
    entityId: nextEmail,
    action: 'credentials_updated',
    summary: 'Admin access settings updated.',
    changedFields: ['email', ...(parsed.data.newPassword.trim() !== '' ? ['password'] : [])]
  });

  return c.json({ success: true, email: nextEmail });
});

adminApi.get('/links', async (c) => {
  const db = getDb(c.env);
  const rows = await db.select().from(links).orderBy(asc(links.groupName), asc(links.sortOrder), asc(links.label));
  return c.json({ items: rows });
});

adminApi.post('/links', async (c) => {
  const parsed = linkInputSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  const db = getDb(c.env);
  const now = nowIso();
  const id = crypto.randomUUID();
  await db.insert(links).values({
    id,
    groupName: parsed.data.groupName,
    slotKey: parsed.data.slotKey ?? null,
    label: parsed.data.label,
    href: parsed.data.href,
    icon: parsed.data.icon ?? null,
    style: parsed.data.style ?? null,
    sortOrder: parsed.data.sortOrder,
    visible: parsed.data.visible,
    createdAt: now,
    updatedAt: now
  });

  await recordAudit(c.env, {
    actorEmail: c.get('adminEmail'),
    entityType: 'link',
    entityId: id,
    action: 'create',
    summary: `Created link "${parsed.data.label}".`,
    changedFields: Object.keys(parsed.data)
  });

  return c.json({ success: true, id });
});

adminApi.patch('/links/:id', async (c) => {
  const parsed = linkInputSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  const db = getDb(c.env);
  const existing = await db.select().from(links).where(eq(links.id, c.req.param('id'))).limit(1);
  if (!existing[0]) return c.json({ error: 'Link not found.' }, 404);

  await db
    .update(links)
    .set({
      groupName: parsed.data.groupName,
      slotKey: parsed.data.slotKey ?? null,
      label: parsed.data.label,
      href: parsed.data.href,
      icon: parsed.data.icon ?? null,
      style: parsed.data.style ?? null,
      sortOrder: parsed.data.sortOrder,
      visible: parsed.data.visible,
      updatedAt: nowIso()
    })
    .where(eq(links.id, c.req.param('id')));

  await recordAudit(c.env, {
    actorEmail: c.get('adminEmail'),
    entityType: 'link',
    entityId: c.req.param('id'),
    action: 'update',
    summary: `Updated link "${parsed.data.label}".`,
    changedFields: Object.keys(parsed.data)
  });

  return c.json({ success: true });
});

adminApi.delete('/links/:id', async (c) => {
  const id = c.req.param('id');
  const db = getDb(c.env);
  const rows = await db.select().from(links).where(eq(links.id, id)).limit(1);
  if (!rows[0]) return c.json({ error: 'Link not found.' }, 404);

  await db.delete(links).where(eq(links.id, id));
  await recordAudit(c.env, {
    actorEmail: c.get('adminEmail'),
    entityType: 'link',
    entityId: id,
    action: 'delete',
    summary: `Deleted link "${rows[0].label}".`
  });
  return c.json({ success: true });
});

adminApi.get('/speaking', async (c) => {
  const db = getDb(c.env);
  const rows = await db.select().from(speakingItems).orderBy(asc(speakingItems.date), asc(speakingItems.talkTitle));
  return c.json({ items: rows });
});

adminApi.post('/speaking', async (c) => {
  const parsed = speakingInputSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  const db = getDb(c.env);
  const id = crypto.randomUUID();
  const now = nowIso();
  await db.insert(speakingItems).values({
    id,
    type: parsed.data.type,
    date: parsed.data.date,
    displayDate: parsed.data.displayDate ?? null,
    city: parsed.data.city ?? null,
    venue: parsed.data.venue ?? null,
    venueAddress: parsed.data.venueAddress ?? null,
    venueMapUrl: parsed.data.venueMapUrl ?? null,
    talkTitle: parsed.data.talkTitle,
    topic: parsed.data.topic ?? null,
    createdAt: now,
    updatedAt: now
  });

  await recordAudit(c.env, {
    actorEmail: c.get('adminEmail'),
    entityType: 'speaking',
    entityId: id,
    action: 'create',
    summary: `Created speaking item "${parsed.data.talkTitle}".`,
    changedFields: Object.keys(parsed.data)
  });

  return c.json({ success: true, id });
});

adminApi.patch('/speaking/:id', async (c) => {
  const parsed = speakingInputSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  const db = getDb(c.env);
  const existing = await db.select().from(speakingItems).where(eq(speakingItems.id, c.req.param('id'))).limit(1);
  if (!existing[0]) return c.json({ error: 'Speaking item not found.' }, 404);

  await db
    .update(speakingItems)
    .set({
      type: parsed.data.type,
      date: parsed.data.date,
      displayDate: parsed.data.displayDate ?? null,
      city: parsed.data.city ?? null,
      venue: parsed.data.venue ?? null,
      venueAddress: parsed.data.venueAddress ?? null,
      venueMapUrl: parsed.data.venueMapUrl ?? null,
      talkTitle: parsed.data.talkTitle,
      topic: parsed.data.topic ?? null,
      updatedAt: nowIso()
    })
    .where(eq(speakingItems.id, c.req.param('id')));

  await recordAudit(c.env, {
    actorEmail: c.get('adminEmail'),
    entityType: 'speaking',
    entityId: c.req.param('id'),
    action: 'update',
    summary: `Updated speaking item "${parsed.data.talkTitle}".`,
    changedFields: Object.keys(parsed.data)
  });

  return c.json({ success: true });
});

adminApi.delete('/speaking/:id', async (c) => {
  const id = c.req.param('id');
  const db = getDb(c.env);
  const rows = await db.select().from(speakingItems).where(eq(speakingItems.id, id)).limit(1);
  if (!rows[0]) return c.json({ error: 'Speaking item not found.' }, 404);

  await db.delete(speakingItems).where(eq(speakingItems.id, id));
  await recordAudit(c.env, {
    actorEmail: c.get('adminEmail'),
    entityType: 'speaking',
    entityId: id,
    action: 'delete',
    summary: `Deleted speaking item "${rows[0].talkTitle}".`
  });

  return c.json({ success: true });
});

adminApi.get('/blocks/:key', async (c) => {
  const key = c.req.param('key');
  if (key === 'site') return c.json(await getManagedSite(c.env, c.req.url));
  if (key === 'about') return c.json(await getManagedAbout(c.env, c.req.url));
  if (key === 'products') return c.json(await getManagedProducts(c.env, c.req.url));
  if (key === 'legal') return c.json(await getManagedLegal(c.env));
  return c.json({ error: 'Unknown block key.' }, 404);
});

adminApi.patch('/blocks/:key', async (c) => {
  const key = c.req.param('key');
  const payload = await c.req.json().catch(() => null);

  if (key === 'site') {
    const parsed = siteDocumentSchema.safeParse(payload);
    if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);
    await upsertDocument(c.env, 'site', parsed.data);
  } else if (key === 'about') {
    const parsed = aboutDocumentSchema.safeParse(payload);
    if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);
    await upsertDocument(c.env, 'about', parsed.data);
  } else if (key === 'products') {
    const parsed = productsDocumentSchema.safeParse(payload);
    if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);
    await upsertDocument(c.env, 'products', parsed.data);
  } else if (key === 'legal') {
    const parsed = legalDocumentSchema.safeParse(payload);
    if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);
    await upsertDocument(c.env, 'legal', parsed.data);
  } else {
    return c.json({ error: 'Unknown block key.' }, 404);
  }

  await recordAudit(c.env, {
    actorEmail: c.get('adminEmail'),
    entityType: 'document',
    entityId: key,
    action: 'update',
    summary: `Updated ${key} content.`,
    changedFields: payload && typeof payload === 'object' ? Object.keys(payload as Record<string, unknown>) : null
  });

  return c.json({ success: true });
});

// ── Pages CRUD ──

adminApi.get('/pages', async (c) => {
  const rows = await listPages(c.env);
  return c.json({ items: rows.map((r) => ({ ...r, blocks: JSON.parse(r.blocks) })) });
});

adminApi.post('/pages', async (c) => {
  const parsed = pageInputSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  const blockErrors = validateBlocks(parsed.data.blocks);
  if (blockErrors.length) return c.json({ error: blockErrors.join('; ') }, 400);

  const id = await createPage(c.env, {
    slug: parsed.data.slug,
    title: parsed.data.title,
    description: parsed.data.description,
    blocks: JSON.stringify(parsed.data.blocks),
    published: parsed.data.published,
    showInNav: parsed.data.showInNav,
    navOrder: parsed.data.navOrder
  });

  await recordAudit(c.env, {
    actorEmail: c.get('adminEmail'),
    entityType: 'page',
    entityId: id,
    action: 'create',
    summary: `Created page "${parsed.data.title}".`
  });

  return c.json({ success: true, id });
});

adminApi.get('/pages/:id', async (c) => {
  const page = await getPageById(c.env, c.req.param('id'));
  if (!page) return c.json({ error: 'Page not found.' }, 404);
  return c.json({ ...page, blocks: JSON.parse(page.blocks) });
});

adminApi.patch('/pages/:id', async (c) => {
  const existing = await getPageById(c.env, c.req.param('id'));
  if (!existing) return c.json({ error: 'Page not found.' }, 404);

  const parsed = pageInputSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  const blockErrors = validateBlocks(parsed.data.blocks);
  if (blockErrors.length) return c.json({ error: blockErrors.join('; ') }, 400);

  await updatePage(c.env, c.req.param('id'), {
    slug: parsed.data.slug,
    title: parsed.data.title,
    description: parsed.data.description,
    blocks: JSON.stringify(parsed.data.blocks),
    published: parsed.data.published,
    showInNav: parsed.data.showInNav,
    navOrder: parsed.data.navOrder
  });

  await recordAudit(c.env, {
    actorEmail: c.get('adminEmail'),
    entityType: 'page',
    entityId: c.req.param('id'),
    action: 'update',
    summary: `Updated page "${parsed.data.title}".`,
    changedFields: Object.keys(parsed.data)
  });

  return c.json({ success: true });
});

adminApi.delete('/pages/:id', async (c) => {
  const existing = await getPageById(c.env, c.req.param('id'));
  if (!existing) return c.json({ error: 'Page not found.' }, 404);

  await deletePage(c.env, c.req.param('id'));
  await recordAudit(c.env, {
    actorEmail: c.get('adminEmail'),
    entityType: 'page',
    entityId: c.req.param('id'),
    action: 'delete',
    summary: `Deleted page "${existing.title}".`
  });

  return c.json({ success: true });
});

adminApi.get('/analytics', async (c) => c.json(await getAdminAnalytics(c.env)));

export { adminApi };
