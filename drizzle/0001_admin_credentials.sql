CREATE TABLE IF NOT EXISTS admin_credentials (
  key TEXT PRIMARY KEY NOT NULL,
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

INSERT OR IGNORE INTO admin_credentials (
  key,
  email,
  password_hash,
  created_at,
  updated_at
) VALUES (
  'primary',
  'ashleyjcarranza@gmail.com',
  'pbkdf2_sha256$100000$AqAnNcSjQ3Tg3iFFig2x2w$LhIFQFR8JJwRHLZPmU7OYQ54WzxsEdWmH0gjkJqgfFk',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);
