-- 0004_username.sql — istifadəçi adı (username) sahəsi
-- Hesablar yaradılarkən e-poçt yazılmadan username + parol ilə yaradılır;
-- istifadəçi ilk girişdə parolunu dəyişir, sonra gmailini qeydiyyatdan keçirir,
-- OTP ilə təsdiqləyir. Bundan sonra e-poçt + parol ilə giriş edir.

ALTER TABLE users ADD COLUMN username TEXT;

-- Mövcud istifadəçilərin username-ni e-poçtunun local-partından doldur
UPDATE users SET username = lower(substr(email, 1, instr(email, '@') - 1))
WHERE username IS NULL;

CREATE UNIQUE INDEX idx_users_username ON users(username);
