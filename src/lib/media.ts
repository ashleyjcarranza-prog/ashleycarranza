import { and, eq, inArray } from 'drizzle-orm';
import { contentDocuments, mediaTags, pages } from './db/schema';
import { getDb, nowIso, type AppBindings } from './db';
import { mediaLibraryDocumentSchema } from './validation';

type ImageLibraryItem = {
  id: string;
  label: string;
  path: string;
  source: string;
};

type ImageLibraryDocument = {
  items?: ImageLibraryItem[];
};

async function getAssetJson<T>(env: AppBindings, requestUrl: string, path: string): Promise<T> {
  const url = new URL(path, requestUrl);
  const response = await env.ASSETS.fetch(new Request(url.toString()));
  if (!response.ok) throw new Error(`Asset fetch failed: ${path}`);
  return response.json<T>();
}

async function readSavedLibrary(env: AppBindings) {
  const db = getDb(env);
  const rows = await db.select().from(contentDocuments).where(eq(contentDocuments.key, 'media_library')).limit(1);
  if (!rows[0]?.body) return { items: [] };
  return mediaLibraryDocumentSchema.parse(JSON.parse(rows[0].body));
}

async function writeSavedLibrary(env: AppBindings, value: ImageLibraryDocument) {
  const db = getDb(env);
  const now = nowIso();
  await db
    .insert(contentDocuments)
    .values({
      key: 'media_library',
      body: JSON.stringify(mediaLibraryDocumentSchema.parse(value)),
      createdAt: now,
      updatedAt: now
    })
    .onConflictDoUpdate({
      target: contentDocuments.key,
      set: {
        body: JSON.stringify(mediaLibraryDocumentSchema.parse(value)),
        updatedAt: now
      }
    });
}

function sanitizeBaseName(fileName: string) {
  const name = fileName.replace(/\.[^.]+$/, '').toLowerCase();
  const cleaned = name.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return cleaned || 'image';
}

function toBase64(value: ArrayBuffer) {
  let binary = '';
  const bytes = new Uint8Array(value);
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function buildDataUrl(file: File, buffer: ArrayBuffer) {
  const type = file.type || 'image/png';
  return `data:${type};base64,${toBase64(buffer)}`;
}

function objectLabel(idOrName: string) {
  return idOrName
    .split('/')
    .pop()
    ?.replace(/\.[^.]+$/, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase()) || 'Uploaded Image';
}

export async function listImageLibrary(env: AppBindings, requestUrl: string) {
  const baseLibrary = await getAssetJson<ImageLibraryDocument>(env, requestUrl, '/data/image-library.json').catch(() => ({ items: [] }));
  const savedLibrary = await readSavedLibrary(env);
  const uploadedItems: ImageLibraryItem[] = [];

  if (env.MEDIA) {
    let cursor: string | undefined;

    do {
      const page = await env.MEDIA.list({ prefix: 'uploads/', limit: 100, cursor });
      uploadedItems.push(
        ...page.objects.map((object) => ({
          id: object.key,
          label: objectLabel(object.key),
          path: `/media/${object.key}`,
          source: 'Uploads'
        }))
      );
      cursor = page.truncated ? page.cursor : undefined;
    } while (cursor);
  }

  const merged = [...(baseLibrary.items || []), ...(savedLibrary.items || []), ...uploadedItems];
  const deduped = merged.filter((item, index) => merged.findIndex((entry) => entry.path === item.path) === index);

  const [tagMap, usageMap] = await Promise.all([
    readAllTagsMap(env, deduped.map((m) => m.path)),
    computeUsageMap(env, deduped.map((m) => m.path))
  ]);

  const items = deduped.map((m) => ({
    ...m,
    tags: tagMap.get(m.path) || [],
    usageCount: usageMap.get(m.path) || 0
  }));

  const tagSet = new Set<string>();
  for (const tags of tagMap.values()) for (const t of tags) tagSet.add(t);

  return {
    items,
    tags: Array.from(tagSet).sort()
  };
}

async function readAllTagsMap(env: AppBindings, paths: string[]) {
  const map = new Map<string, string[]>();
  if (!paths.length) return map;
  const db = getDb(env);
  const rows = await db.select().from(mediaTags).where(inArray(mediaTags.path, paths));
  for (const row of rows) {
    const list = map.get(row.path) || [];
    list.push(row.tag);
    map.set(row.path, list);
  }
  return map;
}

async function computeUsageMap(env: AppBindings, paths: string[]) {
  const map = new Map<string, number>();
  if (!paths.length) return map;
  const pathSet = new Set(paths);
  const db = getDb(env);
  const rows = await db.select({ blocks: pages.blocks }).from(pages);
  for (const row of rows) {
    try {
      const blocks = JSON.parse(row.blocks || '[]');
      const touched = new Set<string>();
      for (const block of blocks) {
        collectImagePathsFromBlock(block, touched);
      }
      for (const path of touched) {
        if (pathSet.has(path)) map.set(path, (map.get(path) || 0) + 1);
      }
    } catch { /* skip bad JSON */ }
  }
  return map;
}

function collectImagePathsFromBlock(block: unknown, out: Set<string>) {
  if (!block || typeof block !== 'object') return;
  const data = (block as { data?: Record<string, unknown> }).data || {};
  const push = (v: unknown) => { if (typeof v === 'string' && v) out.add(v); };
  push(data.image);
  push(data.src);
  if (Array.isArray(data.images)) for (const img of data.images) push((img as { src?: unknown })?.src);
  if (Array.isArray(data.cards)) for (const card of data.cards) push((card as { image?: unknown })?.image);
}

export async function addMediaTag(env: AppBindings, path: string, tag: string) {
  const db = getDb(env);
  const trimmed = tag.trim().toLowerCase();
  if (!trimmed) throw new Error('Tag cannot be empty.');
  if (trimmed.length > 40) throw new Error('Tags must be 40 characters or fewer.');
  try {
    await db.insert(mediaTags).values({
      id: crypto.randomUUID(),
      path,
      tag: trimmed,
      createdAt: nowIso()
    });
  } catch {
    /* duplicate; ignore */
  }
  return { path, tag: trimmed };
}

export async function removeMediaTag(env: AppBindings, path: string, tag: string) {
  const db = getDb(env);
  await db.delete(mediaTags).where(and(eq(mediaTags.path, path), eq(mediaTags.tag, tag.trim().toLowerCase())));
}

export async function listAllMediaTags(env: AppBindings) {
  const db = getDb(env);
  const rows = await db.select().from(mediaTags);
  const tagSet = new Set<string>();
  for (const row of rows) tagSet.add(row.tag);
  return Array.from(tagSet).sort();
}

export async function uploadImage(env: AppBindings, file: File) {
  if (!file.type.startsWith('image/')) throw new Error('Only image files can be uploaded.');

  if (env.MEDIA) {
    if (file.size > 10 * 1024 * 1024) throw new Error('Image is too large. Use a file under 10 MB.');

    const extension = file.name.match(/(\.[a-z0-9]+)$/i)?.[1]?.toLowerCase() || '.png';
    const stamp = new Date().toISOString().slice(0, 10);
    const key = `uploads/${stamp}/${Date.now()}-${sanitizeBaseName(file.name)}${extension}`;

    await env.MEDIA.put(key, await file.arrayBuffer(), {
      httpMetadata: {
        contentType: file.type || undefined
      }
    });

    return {
      id: key,
      label: objectLabel(key),
      path: `/media/${key}`,
      source: 'Uploads'
    };
  }

  if (file.size > 1.5 * 1024 * 1024) {
    throw new Error('Image is too large for built-in storage. Use a smaller file or paste image link.');
  }

  const buffer = await file.arrayBuffer();
  const item = {
    id: `saved-${crypto.randomUUID()}`,
    label: objectLabel(file.name),
    path: buildDataUrl(file, buffer),
    source: 'Saved Upload'
  };

  const existing = await readSavedLibrary(env);
  await writeSavedLibrary(env, { items: [item, ...(existing.items || [])] });

  return item;
}
