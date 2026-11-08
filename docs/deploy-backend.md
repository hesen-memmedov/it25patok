# Backend-in prod mühitə deploy-u

Backend Spring Boot tətbiqidir və istənilən Java 21 host-da (Render, Railway,
Fly.io, VPS, Docker-runner) işləyir. **Cloudflare Workers bu tətbiq üçün uyğun deyil.**

## 1. Hazır vəziyyət (artıq edilib)

- Cloudflare D1 bazası `it25patok` yaradılıb, miqrasiyalar (0001–0003) tətbiq olunub:
  - `groups`: `IT25A1`, `IT25A2`
  - çat otaqları: `room_global`, `room_a1`, `room_a2`
  - `app_settings` default-ları
  - **Database ID:** `49b97986-913b-4042-8c9f-5d74251d5713`
- Backend Dockerfile yazılıb və build olunur (LibreOffice pptx→pdf konvertasiya üçün daxildir)
- Frontend Cloudflare Pages-də: https://it25patok.pages.dev

## 2. Gmail SMTP (OTP məktubları)

1. Gmail hesabında 2-Step Verification aktiv olsun
2. [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords) → yeni app password yaradın (ad: `it25patok`)
3. 16-rəqəmli kodu `MAIL_APP_PASSWORD` dəyəri kimi götürün

## 3. Google Drive

Bax: `drive-setup.md` (service account + root qovluq paylaşımı).

## 4. Mühit dəyişənləri

`backend/.env.example` faylını `backend/.env` kimi kopyalayın və doldurun:

| Dəyişən | Qeyd |
|---|---|
| `JWT_SECRET` | `openssl rand -base64 48` ilə yaradın |
| `CHAT_ENCRYPTION_KEY` | `openssl rand -base64 32` |
| `CF_API_TOKEN` | D1 oxuma+yazma icazəli token |
| `CF_ACCOUNT_ID` / `CF_D1_DATABASE_ID` | hazırdır (example-də) |
| `DRIVE_ROOT_FOLDER_ID` | `drive-setup.md`-dən |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | ya da `..._FILE` |
| `MAIL_USERNAME`, `MAIL_APP_PASSWORD` | Gmail app password |
| `ADMIN_INITIAL_PASSWORD` | güclü başlanğıc parol (ilk girişdə dəyişin) |
| `CORS_ALLOWED_ORIGINS` | məs. `https://it25patok.pages.dev` |

## 5A. Docker ilə (tövsiyə)

```bash
cd backend
docker build -t it25patok-api:latest .
docker run -d --name it25patok-api \
  --env-file .env \
  -p 8080:8080 \
  -v it25-data:/app/.data \
  --restart unless-stopped \
  it25patok-api:latest
curl http://localhost:8080/actuator/health
```

Qeydlər:
- Konteyner `/app/.data` həcmini istifadə edir (lokal SQLite / dev mail üçün; prod `STORAGE_MODE=drive`)
- LibreOffice daxildir; PPT/PPTX inline önizləmə işləyir
- İstiqamət: istənilən Docker host (Render Docker, Fly.io, VPS)

## 5B. Adi JVM ilə

```bash
cd backend
mvn -B -DskipTests package
java -XX:MaxRAMPercentage=75.0 -jar target/it25patok-api-1.0.0.jar
```

## 6. İlk başlanğıc

1. `curl https://<backend-host>/actuator/health` → `{"status":"UP"}`
2. Brauzerdə https/<backend-host>/swagger-ui.html əlçatan olmalıdır
3. Public SPA-da admin ilə daxil olun: `ADMIN_EMAIL` / `ADMIN_INITIAL_PASSWORD`
   - E-poça OTP kod gəlir → daxil ol → **mütləq parolu dəyişdirin**
   - İstifadəçiləri admin panelindən yaradın (hamısı admin tərəfindən yaradılır; public qeydiyyat yoxdur)

## 7. Frontend-in yeni ünvana bağlanması

```bash
cd frontend
cat > .env.production <<EOF
VITE_API_URL=https://<backend-host>/api/v1
VITE_WS_URL=https://<backend-host>
EOF
npm ci && npm run build
npx wrangler pages deploy dist --project-name=it25patok
```

## 8. Yadda saxlamaq

- D1 `it25patok`-u silmək = bütün məlumatların itməsi. Daimi backup məsləhətdir:
  `npx wrangler d1 export it25patok --remote -o backup.sql`
- Fayllar Google Drive-dadır — Drive-dan silməyin
- Admin parolunu ilk girişdən sonra dəyişdirin
