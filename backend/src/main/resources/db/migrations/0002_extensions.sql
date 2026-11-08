-- 0002_extensions.sql — tətbiq ayarları, cihaz etimadı, oxunma vəziyyəti və əlavə sahələr

ALTER TABLE users ADD COLUMN otp_locked_until INTEGER;
ALTER TABLE users ADD COLUMN notification_enabled INTEGER NOT NULL DEFAULT 1;
ALTER TABLE users ADD COLUMN chat_muted_until INTEGER;

ALTER TABLE assignments ADD COLUMN allow_late INTEGER NOT NULL DEFAULT 1;

ALTER TABLE otp_codes ADD COLUMN purpose TEXT NOT NULL DEFAULT 'LOGIN';
ALTER TABLE otp_codes ADD COLUMN target TEXT;

ALTER TABLE notification_log ADD COLUMN ref_id TEXT;

CREATE TABLE trusted_devices (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  token_hash TEXT NOT NULL,
  device_info TEXT,
  expires_at INTEGER NOT NULL,
  revoked_at INTEGER,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_trusted_hash ON trusted_devices(token_hash);
CREATE INDEX idx_trusted_user ON trusted_devices(user_id);

CREATE TABLE chat_reads (
  user_id TEXT NOT NULL REFERENCES users(id),
  room_id TEXT NOT NULL REFERENCES chat_rooms(id),
  last_read_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, room_id)
);

CREATE TABLE app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE converted_previews (
  file_id TEXT PRIMARY KEY REFERENCES files(id) ON DELETE CASCADE,
  local_path TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE scheduler_locks (
  name TEXT PRIMARY KEY,
  locked_until INTEGER NOT NULL
);

CREATE INDEX idx_assignments_archived ON assignments(is_archived);
CREATE INDEX idx_files_deleted ON files(deleted_at);
CREATE INDEX idx_notification_ref ON notification_log(ref_id);
