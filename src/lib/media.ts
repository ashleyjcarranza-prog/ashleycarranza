import { eq } from 'drizzle-orm';
import { contentDocuments } from './db/schema';
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

  return {
    items: deduped
  };
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
