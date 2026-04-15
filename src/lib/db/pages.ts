import { asc, eq } from 'drizzle-orm';
import { getDb, nowIso, type AppBindings } from './index';
import { pages } from './schema';

export type PageRecord = typeof pages.$inferSelect;

export async function listPages(env: AppBindings) {
  const db = getDb(env);
  return db.select().from(pages).orderBy(asc(pages.navOrder), asc(pages.title));
}

export async function getPageById(env: AppBindings, id: string) {
  const db = getDb(env);
  const rows = await db.select().from(pages).where(eq(pages.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function getPublishedPageBySlug(env: AppBindings, slug: string) {
  const db = getDb(env);
  const normalized = slug.replace(/\/+$/, '') || '/';
  const rows = await db
    .select()
    .from(pages)
    .where(eq(pages.slug, normalized))
    .limit(1);
  const page = rows[0];
  if (!page || !page.published) return null;
  return page;
}

export async function getNavPages(env: AppBindings) {
  const db = getDb(env);
  return db
    .select({ slug: pages.slug, title: pages.title, navOrder: pages.navOrder })
    .from(pages)
    .where(eq(pages.showInNav, true))
    .orderBy(asc(pages.navOrder), asc(pages.title));
}

export async function createPage(
  env: AppBindings,
  data: { slug: string; title: string; description: string; blocks: string; published: boolean; showInNav: boolean; navOrder: number }
) {
  const db = getDb(env);
  const now = nowIso();
  const id = crypto.randomUUID();
  await db.insert(pages).values({
    id,
    slug: data.slug,
    title: data.title,
    description: data.description,
    blocks: data.blocks,
    published: data.published,
    showInNav: data.showInNav,
    navOrder: data.navOrder,
    createdAt: now,
    updatedAt: now
  });
  return id;
}

export async function updatePage(
  env: AppBindings,
  id: string,
  data: Partial<{ slug: string; title: string; description: string; blocks: string; published: boolean; showInNav: boolean; navOrder: number }>
) {
  const db = getDb(env);
  await db
    .update(pages)
    .set({ ...data, updatedAt: nowIso() })
    .where(eq(pages.id, id));
}

export async function deletePage(env: AppBindings, id: string) {
  const db = getDb(env);
  await db.delete(pages).where(eq(pages.id, id));
}
