import { asc, eq } from 'drizzle-orm';
import { contentDocuments, links, speakingItems } from '../db/schema';
import { getDb, nowIso, type AppBindings } from '../db';
import { getNavPages } from '../db/pages';
import {
  aboutDocumentSchema,
  eventsMetaSchema,
  legalDocumentSchema,
  linkGroupSchema,
  productsDocumentSchema,
  siteDocumentSchema,
  type LinkGroup
} from '../validation';
import { defaultLegalDocument } from './legal';

type LinkRecord = typeof links.$inferSelect;

async function getAssetJson<T>(env: AppBindings, requestUrl: string, path: string): Promise<T> {
  const url = new URL(path, requestUrl);
  const response = await env.ASSETS.fetch(new Request(url.toString()));
  if (!response.ok) throw new Error(`Asset fetch failed: ${path}`);
  return response.json<T>();
}

async function readDocumentBody(env: AppBindings, key: string) {
  const db = getDb(env);
  const rows = await db.select().from(contentDocuments).where(eq(contentDocuments.key, key)).limit(1);
  return rows[0]?.body ?? null;
}

async function writeDocumentBody(env: AppBindings, key: string, body: string) {
  const db = getDb(env);
  const now = nowIso();
  await db
    .insert(contentDocuments)
    .values({ key, body, createdAt: now, updatedAt: now })
    .onConflictDoUpdate({
      target: contentDocuments.key,
      set: { body, updatedAt: now }
    });
}

async function getLinksByGroup(env: AppBindings, groupName: LinkGroup) {
  const db = getDb(env);
  return db
    .select()
    .from(links)
    .where(eq(links.groupName, groupName))
    .orderBy(asc(links.sortOrder), asc(links.label));
}

function heroLinksToPublic(records: LinkRecord[]) {
  return records
    .filter((record) => record.visible)
    .map((record) => ({
      label: record.label,
      href: record.href,
      icon: record.icon || '',
      style: record.style || 'outline'
    }));
}

function socialLinksToPublic(records: LinkRecord[], baseSocial: Record<string, string>) {
  const next = { ...baseSocial };
  for (const record of records) {
    if (!record.visible) continue;
    const key = (record.slotKey || record.label || '').trim().toLowerCase();
    if (key) next[key] = record.href;
  }
  return next;
}

function professionalLinksToPublic(records: LinkRecord[]) {
  return records
    .filter((record) => record.visible)
    .map((record) => ({
      label: record.label,
      href: record.href
    }));
}

export async function getManagedSite(env: AppBindings, requestUrl: string) {
  const raw = await readDocumentBody(env, 'site');
  const base = raw ? siteDocumentSchema.parse(JSON.parse(raw)) : siteDocumentSchema.parse(await getAssetJson(env, requestUrl, '/data/site.json'));
  const [heroLinks, socialLinks] = await Promise.all([
    getLinksByGroup(env, linkGroupSchema.enum.hero_cta),
    getLinksByGroup(env, linkGroupSchema.enum.social)
  ]);

  const navPages = await getNavPages(env);
  const pageNavItems = navPages.map((p) => ({ label: p.title, href: p.slug }));
  const mergedNav = [...(base.navigation || []), ...pageNavItems];

  return {
    ...base,
    navigation: mergedNav,
    home: {
      ...base.home,
      heroCTAs: heroLinks.length ? heroLinksToPublic(heroLinks) : base.home.heroCTAs
    },
    social: socialLinksToPublic(socialLinks, base.social as Record<string, string>)
  };
}

export async function getManagedAbout(env: AppBindings, requestUrl: string) {
  const raw = await readDocumentBody(env, 'about');
  const base = raw
    ? aboutDocumentSchema.parse(JSON.parse(raw))
    : aboutDocumentSchema.parse(await getAssetJson(env, requestUrl, '/data/about.json'));
  const professionalLinks = await getLinksByGroup(env, linkGroupSchema.enum.professional);

  return {
    ...base,
    professionalLinks: professionalLinks.length ? professionalLinksToPublic(professionalLinks) : base.professionalLinks
  };
}

export async function getManagedEvents(env: AppBindings, requestUrl: string) {
  const db = getDb(env);
  const eventRows = await db.select().from(speakingItems).orderBy(asc(speakingItems.date), asc(speakingItems.talkTitle));
  const metaRaw = await readDocumentBody(env, 'events_meta');
  const timezone = metaRaw
    ? eventsMetaSchema.parse(JSON.parse(metaRaw)).timezone
    : eventsMetaSchema.parse(await getAssetJson(env, requestUrl, '/data/events.json')).timezone;

  if (!eventRows.length) {
    const assetData = await getAssetJson<{ timezone: string; events: unknown[] }>(env, requestUrl, '/data/events.json');
    return assetData;
  }

  return {
    timezone,
    events: eventRows.map((row) => ({
      id: row.id,
      type: row.type,
      date: row.date,
      displayDate: row.displayDate || undefined,
      city: row.city || undefined,
      venue: row.venue || undefined,
      venueAddress: row.venueAddress || undefined,
      venueMapUrl: row.venueMapUrl || undefined,
      talkTitle: row.talkTitle,
      topic: row.topic || undefined
    }))
  };
}

export async function getManagedLegal(env: AppBindings) {
  const raw = await readDocumentBody(env, 'legal');
  return raw ? legalDocumentSchema.parse(JSON.parse(raw)) : defaultLegalDocument;
}

export async function getManagedProducts(env: AppBindings, requestUrl: string) {
  const raw = await readDocumentBody(env, 'products');
  return raw
    ? productsDocumentSchema.parse(JSON.parse(raw))
    : productsDocumentSchema.parse(await getAssetJson(env, requestUrl, '/data/products.json'));
}

export async function upsertDocument<T>(env: AppBindings, key: string, value: T) {
  await writeDocumentBody(env, key, JSON.stringify(value));
}
