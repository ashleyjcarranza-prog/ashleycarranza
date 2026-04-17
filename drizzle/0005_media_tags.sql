CREATE TABLE media_tags (
  id TEXT PRIMARY KEY,
  path TEXT NOT NULL,
  tag TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_media_tags_path ON media_tags(path);
CREATE INDEX idx_media_tags_tag ON media_tags(tag);
CREATE UNIQUE INDEX idx_media_tags_unique ON media_tags(path, tag);
