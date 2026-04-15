import { execFileSync } from 'node:child_process';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defaultLegalDocument } from '../src/lib/content/legal';
import { aboutDocumentSchema, eventsMetaSchema, productsDocumentSchema, siteDocumentSchema } from '../src/lib/validation';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = resolve(rootDir, 'public/data');
const tempSqlPath = resolve(rootDir, 'tmp/seed.sql');

type JsonObject = Record<string, unknown>;

function sqlString(value: string) {
  return `'${value.replace(/'/g, "''")}'`;
}

function sqlValue(value: unknown) {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'boolean') return value ? '1' : '0';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'NULL';
  return sqlString(String(value));
}

function insert(table: string, row: Record<string, unknown>) {
  const columns = Object.keys(row).join(', ');
  const values = Object.values(row)
    .map((value) => sqlValue(value))
    .join(', ');

  return `INSERT INTO ${table} (${columns}) VALUES (${values});`;
}

async function readJson<T>(name: string): Promise<T> {
  const raw = await readFile(resolve(dataDir, name), 'utf8');
  return JSON.parse(raw) as T;
}

export async function buildSeedSql() {
  const site = siteDocumentSchema.parse(await readJson<JsonObject>('site.json'));
  const about = aboutDocumentSchema.parse(await readJson<JsonObject>('about.json'));
  const products = productsDocumentSchema.parse(await readJson<JsonObject>('products.json'));
  const events = (await readJson<{ timezone: string; events: Array<Record<string, unknown>> }>('events.json')) ?? { timezone: 'America/Los_Angeles', events: [] };
  const timezone = eventsMetaSchema.parse({ timezone: events.timezone }).timezone;

  const now = new Date().toISOString();
  const statements = [
    'DELETE FROM audit_log;',
    'DELETE FROM admin_sessions;',
    'DELETE FROM speaking_items;',
    'DELETE FROM links;',
    'DELETE FROM content_documents;'
  ];

  const heroLinks = (site.home.heroCTAs ?? []).map((item, index) =>
    insert('links', {
      id: crypto.randomUUID(),
      group_name: 'hero_cta',
      slot_key: null,
      label: item.label,
      href: item.href,
      icon: item.icon || null,
      style: item.style || null,
      sort_order: index,
      visible: 1,
      created_at: now,
      updated_at: now
    })
  );

  const socialLinks = Object.entries(site.social ?? {})
    .filter(([, href]) => typeof href === 'string' && href.trim())
    .map(([slotKey, href], index) =>
      insert('links', {
        id: crypto.randomUUID(),
        group_name: 'social',
        slot_key: slotKey,
        label: slotKey.replace(/[-_]/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()),
        href,
        icon: null,
        style: null,
        sort_order: index,
        visible: 1,
        created_at: now,
        updated_at: now
      })
    );

  const professionalLinks = (about.professionalLinks ?? []).map((item, index) =>
    insert('links', {
      id: crypto.randomUUID(),
      group_name: 'professional',
      slot_key: null,
      label: item.label,
      href: item.href,
      icon: null,
      style: null,
      sort_order: index,
      visible: 1,
      created_at: now,
      updated_at: now
    })
  );

  const speakingRows = (events.events ?? []).map((item) =>
    insert('speaking_items', {
      id: item.id || crypto.randomUUID(),
      type: item.type,
      date: item.date,
      display_date: item.displayDate || null,
      city: item.city || null,
      venue: item.venue || null,
      venue_address: item.venueAddress || null,
      venue_map_url: item.venueMapUrl || null,
      talk_title: item.talkTitle,
      topic: item.topic || null,
      created_at: now,
      updated_at: now
    })
  );

  const documents = [
    insert('content_documents', {
      key: 'site',
      body: JSON.stringify(site),
      created_at: now,
      updated_at: now
    }),
    insert('content_documents', {
      key: 'about',
      body: JSON.stringify(about),
      created_at: now,
      updated_at: now
    }),
    insert('content_documents', {
      key: 'events_meta',
      body: JSON.stringify({ timezone }),
      created_at: now,
      updated_at: now
    }),
    insert('content_documents', {
      key: 'products',
      body: JSON.stringify(products),
      created_at: now,
      updated_at: now
    }),
    insert('content_documents', {
      key: 'legal',
      body: JSON.stringify(defaultLegalDocument),
      created_at: now,
      updated_at: now
    })
  ];

  statements.push(...documents, ...heroLinks, ...socialLinks, ...professionalLinks, ...speakingRows);
  statements.push(
    insert('audit_log', {
      id: crypto.randomUUID(),
      actor_email: 'system',
      entity_type: 'seed',
      entity_id: 'initial-import',
      action: 'seed_import',
      summary: 'Imported public JSON content into D1.',
      changed_fields: JSON.stringify(['site', 'about', 'products', 'events_meta', 'legal', 'links', 'speaking_items']),
      created_at: now
    })
  );

  return statements.join('\n');
}

async function main() {
  const mode = process.argv.includes('--remote') ? '--remote' : '--local';
  const sql = await buildSeedSql();

  if (process.argv.includes('--print-sql')) {
    console.log(sql);
    return;
  }

  await mkdir(dirname(tempSqlPath), { recursive: true });
  await writeFile(tempSqlPath, sql, 'utf8');

  try {
    execFileSync('npx', ['wrangler', 'd1', 'execute', 'DB', mode, '--file', tempSqlPath], {
      cwd: rootDir,
      stdio: 'inherit'
    });
  } finally {
    await rm(tempSqlPath, { force: true });
  }
}

void main();
