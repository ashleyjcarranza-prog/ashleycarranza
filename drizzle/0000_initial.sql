CREATE TABLE IF NOT EXISTS content_documents (
  key TEXT PRIMARY KEY NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS links (
  id TEXT PRIMARY KEY NOT NULL,
  group_name TEXT NOT NULL,
  slot_key TEXT,
  label TEXT NOT NULL,
  href TEXT NOT NULL,
  icon TEXT,
  style TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  visible INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS speaking_items (
  id TEXT PRIMARY KEY NOT NULL,
  type TEXT NOT NULL,
  date TEXT NOT NULL,
  display_date TEXT,
  city TEXT,
  venue TEXT,
  venue_address TEXT,
  venue_map_url TEXT,
  talk_title TEXT NOT NULL,
  topic TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS admin_sessions (
  id TEXT PRIMARY KEY NOT NULL,
  token_hash TEXT NOT NULL,
  email TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS admin_sessions_token_hash_idx
  ON admin_sessions(token_hash);

CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY NOT NULL,
  actor_email TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  action TEXT NOT NULL,
  summary TEXT NOT NULL,
  changed_fields TEXT,
  created_at TEXT NOT NULL
);
