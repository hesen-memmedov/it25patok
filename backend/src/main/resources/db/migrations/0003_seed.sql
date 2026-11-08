-- 0003_seed.sql — qruplar, çat otaqları və default sistem ayarları
INSERT OR IGNORE INTO groups (id, code, name) VALUES
  ('grp_a1', 'IT25A1', 'İT25A1'),
  ('grp_a2', 'IT25A2', 'İT25A2');

INSERT OR IGNORE INTO chat_rooms (id, type, group_id, name) VALUES
  ('room_global', 'GLOBAL', NULL, 'Ümumi çat'),
  ('room_a1', 'GROUP', 'grp_a1', 'İT25A1 çatı'),
  ('room_a2', 'GROUP', 'grp_a2', 'İT25A2 çatı');

INSERT OR IGNORE INTO app_settings (key, value, updated_at) VALUES
  ('daily_email_time', '09:00', 0),
  ('daily_email_enabled', 'true', 0),
  ('max_file_size_mb', '50', 0),
  ('blocked_extensions', 'exe,msi,bat,cmd,scr,com,vbs', 0),
  ('remember_device_enabled', 'true', 0),
  ('teacher_group_chat_enabled', 'true', 0),
  ('file_expiry_warning_days', '30', 0),
  ('email_change_enabled', 'true', 0),
  ('self_notification_toggle_enabled', 'true', 0);
