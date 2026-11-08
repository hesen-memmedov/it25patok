-- 0001_init.sql — IT25 PATOK əsas sxemi (Cloudflare D1 / SQLite)
PRAGMA foreign_keys = ON;

CREATE TABLE groups (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL
);

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('ADMIN','TEACHER','STUDENT')),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  group_id TEXT REFERENCES groups(id),
  avatar_file_id TEXT,
  bio TEXT,
  theme TEXT DEFAULT 'system',
  is_active INTEGER NOT NULL DEFAULT 1,
  must_change_password INTEGER NOT NULL DEFAULT 0,
  failed_login_count INTEGER NOT NULL DEFAULT 0,
  locked_until INTEGER,
  last_login_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER
);
CREATE INDEX idx_users_group ON users(group_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_deleted ON users(deleted_at);

CREATE TABLE otp_codes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  code_hash TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  expires_at INTEGER NOT NULL,
  used_at INTEGER,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_otp_user ON otp_codes(user_id, created_at);

CREATE TABLE refresh_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  token_hash TEXT NOT NULL,
  device_info TEXT,
  expires_at INTEGER NOT NULL,
  revoked_at INTEGER,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_refresh_hash ON refresh_tokens(token_hash);
CREATE INDEX idx_refresh_user ON refresh_tokens(user_id);

CREATE TABLE subjects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT,
  description TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE teaching_assignments (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL REFERENCES users(id),
  subject_id TEXT NOT NULL REFERENCES subjects(id),
  group_id TEXT NOT NULL REFERENCES groups(id),
  UNIQUE (teacher_id, subject_id, group_id)
);
CREATE INDEX idx_teaching_teacher ON teaching_assignments(teacher_id);

CREATE TABLE assignments (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL REFERENCES users(id),
  subject_id TEXT NOT NULL REFERENCES subjects(id),
  type TEXT NOT NULL CHECK (type IN ('SERBEST_ISH','KOLLOKVIUM','LABORATORIYA')),
  title TEXT NOT NULL,
  description TEXT,
  deadline INTEGER,
  max_score REAL,
  is_archived INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX idx_assignments_teacher ON assignments(teacher_id);
CREATE INDEX idx_assignments_subject ON assignments(subject_id);

CREATE TABLE assignment_groups (
  assignment_id TEXT NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  group_id TEXT NOT NULL REFERENCES groups(id),
  PRIMARY KEY (assignment_id, group_id)
);

CREATE TABLE submissions (
  id TEXT PRIMARY KEY,
  assignment_id TEXT NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES users(id),
  status TEXT NOT NULL CHECK (status IN ('SUBMITTED','LATE','GRADED','RETURNED')),
  comment TEXT,
  score REAL,
  teacher_feedback TEXT,
  submitted_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE (assignment_id, student_id)
);
CREATE INDEX idx_submissions_student ON submissions(student_id);
CREATE INDEX idx_submissions_assignment ON submissions(assignment_id);

CREATE TABLE files (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES users(id),
  kind TEXT NOT NULL CHECK (kind IN ('ASSIGNMENT_ATTACHMENT','SUBMISSION','AVATAR')),
  assignment_id TEXT REFERENCES assignments(id) ON DELETE CASCADE,
  submission_id TEXT REFERENCES submissions(id) ON DELETE CASCADE,
  original_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  extension TEXT,
  drive_file_id TEXT NOT NULL,
  drive_folder_id TEXT,
  sha256 TEXT,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  deleted_at INTEGER
);
CREATE INDEX idx_files_expires ON files(expires_at);
CREATE INDEX idx_files_owner ON files(owner_id);
CREATE INDEX idx_files_assignment ON files(assignment_id);
CREATE INDEX idx_files_submission ON files(submission_id);

CREATE TABLE chat_rooms (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('GLOBAL','GROUP')),
  group_id TEXT REFERENCES groups(id),
  name TEXT NOT NULL
);

CREATE TABLE chat_messages (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL REFERENCES chat_rooms(id),
  sender_id TEXT NOT NULL REFERENCES users(id),
  ciphertext TEXT NOT NULL,
  iv TEXT NOT NULL,
  key_version INTEGER NOT NULL DEFAULT 1,
  reply_to_id TEXT,
  deleted_at INTEGER,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX idx_chat_room_time ON chat_messages(room_id, created_at);
CREATE INDEX idx_chat_expires ON chat_messages(expires_at);

CREATE TABLE notification_log (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  type TEXT NOT NULL,
  sent_at INTEGER NOT NULL,
  status TEXT NOT NULL,
  error TEXT
);
CREATE INDEX idx_notification_user ON notification_log(user_id, type, sent_at);

CREATE TABLE audit_log (
  id TEXT PRIMARY KEY,
  actor_id TEXT,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  ip TEXT,
  meta TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_audit_created ON audit_log(created_at);
