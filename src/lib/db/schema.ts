import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const contentDocuments = sqliteTable('content_documents', {
  key: text('key').primaryKey(),
  body: text('body').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

export const links = sqliteTable('links', {
  id: text('id').primaryKey(),
  groupName: text('group_name').notNull(),
  slotKey: text('slot_key'),
  label: text('label').notNull(),
  href: text('href').notNull(),
  icon: text('icon'),
  style: text('style'),
  sortOrder: integer('sort_order').notNull().default(0),
  visible: integer('visible', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

export const speakingItems = sqliteTable('speaking_items', {
  id: text('id').primaryKey(),
  type: text('type').notNull(),
  date: text('date').notNull(),
  displayDate: text('display_date'),
  city: text('city'),
  venue: text('venue'),
  venueAddress: text('venue_address'),
  venueMapUrl: text('venue_map_url'),
  talkTitle: text('talk_title').notNull(),
  topic: text('topic'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

export const adminSessions = sqliteTable('admin_sessions', {
  id: text('id').primaryKey(),
  tokenHash: text('token_hash').notNull(),
  email: text('email').notNull(),
  expiresAt: text('expires_at').notNull(),
  lastSeenAt: text('last_seen_at').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

export const adminCredentials = sqliteTable('admin_credentials', {
  key: text('key').primaryKey(),
  email: text('email').notNull(),
  passwordHash: text('password_hash').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

export const pages = sqliteTable('pages', {
  id: text('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  description: text('description').notNull().default(''),
  blocks: text('blocks').notNull().default('[]'),
  published: integer('published', { mode: 'boolean' }).notNull().default(false),
  showInNav: integer('show_in_nav', { mode: 'boolean' }).notNull().default(false),
  navOrder: integer('nav_order').notNull().default(99),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

export const auditLog = sqliteTable('audit_log', {
  id: text('id').primaryKey(),
  actorEmail: text('actor_email').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id'),
  action: text('action').notNull(),
  summary: text('summary').notNull(),
  changedFields: text('changed_fields'),
  createdAt: text('created_at').notNull()
});
