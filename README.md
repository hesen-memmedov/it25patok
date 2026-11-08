# İT25 PATOK

İT25A1 və İT25A2 tələbələri üçün qapalı, təhlükəsiz tədris platforması.
Təhvil tapşırıqları, yoxlanılmış təhvil prosesi, çatışmayan tapşırıqların izlənməsi,
qrup-əsaslı izolyasiya, şifrəli çat, fayl idarəetməsi (bütün fayl növləri, inline viewer-lər)
və OTP əsaslı giriş ilə tam platforma.

## Texnologiyalar

| Tərəf | Stack |
|---|---|
| Frontend | React 18 + TypeScript, Vite 5, Tailwind CSS 3, TanStack Query, Zustand, React Router 6, STOMP + SockJS, sonner, lucide-react |
| Backend | Spring Boot 3 + Java 21, Cloudflare D1 REST API (Variant A) / lokal SQLite, Google Drive storage (Variant A1 isolation) |
| DB | Cloudflare D1 (remote, prod) / lokal SQLite (`./.data/it25patok.db` dev) |
| Mail | Gmail SMTP (prod) / dev outbox faylı (`./.data/outbox` local) |
| Hosting | Cloudflare Pages (frontend), Java-hosted Docker konteyner (backend) |

## Repozitoriya strukturu

```
├── backend/          Spring Boot API (az.it25patok)
│   ├── src/main/java/.../auth, chat, assignment, submission, file, admin, me, notification, retention
│   ├── src/main/resources/db/migrations/   0001_init, 0002_extensions, 0003_seed, 0004_username
│   └── Dockerfile
├── frontend/         React SPA
│   ├── src/features/{student, teacher, admin, auth, chat, profile}
│   ├── src/components/{ui, files, common, ...}
│   └── src/test/                vitest + Testing Library
├── docs/             Əlavə sənədlər (drive-setup.md, deploy-backend.md)
└── .github/workflows/ci.yml
```

## Lokal işə salma

### Tələblər
- Java 21, Maven 3.9+, Node.js 20+

### Backend (port 8081)
```bash
cd backend
SPRING_PROFILES_ACTIVE=local PORT=8081 mvn spring-boot:run
```
İlk başlanğıcda lokal SQLite avtomatik yaradılır və miqrasiyalar idempotent şəkildə tətbiq olunur.
Lokal hesablar: **admin / Admin123!IT25** (`admin@it25patok.az` e-poçtu ilə də daxil olmaq olar; yalnız lokal inkişaf üçündür).
Giriş zamanı OTP lokal dev outbox-a yazılır: `backend/.data/outbox/*.html`.

### Frontend (port 5173)
```bash
cd frontend
npm install
cp .env.example .env.local     # lazım olsa VITE_API_URL/VITE_WS_URL uyğunlaşdırın
npm run dev
```

### Testlər və lint
```bash
cd backend && mvn -B -q test          # 15 test: auth, isolation, crypto, admin
cd frontend && npm test               # vitest: utils, i18n, komponentlər
cd frontend && npm run lint           # --max-warnings 0
cd frontend && npm run build          # tsc + vite build
```

## Hesab yaradılması və ilk giriş (onboarding)

Xarici qeydiyyat yoxdur — bütün hesabları **admin** yaradır:

1. Admin hesabı **istifadəçi adı + ilkin parol** ilə yaradır (e-poçt tələb olunmur).
2. İstifadəçi ilk dəfə həmin istifadəçi adı + parolla daxil olanda **parolu dəyişməyə məcburdur** — dəyişmədən heç bir funksiyaya çıxış yoxdur.
3. Parol dəyişdikdən sonra istifadəçi **öz gmail ünvanını** yazır və ora gələn **6-rəqəmli kodla** təsdiqləyir.
4. Bundan sonra giriş: **istifadəçi adı (və ya e-poçt) + parol + OTP**; e-poçt unikal olur.

Texniki detallar:
- Hesab yer tutucu e-poçt ilə saxlanılır: `<istifadəçi adı>@no-mail.it25patok.az` (OTP doğrulaması olmadan).
- Onboarding mərhələləri arasında JWT **setup token**-ləri gəzir (`setup:password-change`, `setup:email-setup`, 15 dəq ömrü) — adi access token verilmir.
- Admin panel-dəki **şifrə sıfırlama** yenidən məcburi parol dəyişmə tətbiq edir və bütün refresh token/etibarlı cihazları ləğv edir.

## Təhlükəsizlik

- **OTP əsaslı giriş** — giriş həmişə identifikator (istifadəçi adı/e-poçt) + parol + 6-rəqəmli birdəfəlik kod (5 dəq etibarlı, 5 cəhd, 15 dəq bloklanma, saatlıq limit)
- **JWT**: access token 15 dəq (memory-də), refresh token 7 gün (HttpOnly cookie, `/api/v1/auth` path)
- **Çat**: mesajlar AES-256-GCM ilə şifrələnir saxlanılır (AAD = roomId, köhnə açar versiyaları ilə rotasiya)
- **A1/A2 izolyasiya**: bütün fayl/tapşırıq/çat sorğuları `group_id` üzrə filtrlənir; sənəd və çat admin/müəllimlərə məhdud
- **Rate limiting**, **CSP**, **HSTS**, **Referrer-Policy**, **Clickjacking müdafiəsi** (CSP frame-ancestors)
- **Trusted device** opsiyası: 30 günlük cihaza OTP-siz giriş (istəyə bağlı, aktivləşdirmə girişi zamanı)

## Prod ünvanlar

| Misal | Status |
|---|---|
| Frontend (public SPA) | https://it25patok.pages.dev — backend ünvansız giriş işləmir (aşağıya baxın) |
| Backend | Docker image hazır (`backend/Dockerfile`) — istənilən Java-host-a deploy edilməlidir |
| Cloudflare D1 | Yaradılıb və miqrasiyalıdır: `it25patok` (ID: `49b97986-913b-4042-8c9f-5d74251d5713`) |

**Vacib**: Public SPA üçün backend public HTTPS ünvana deploy edilməlidir. Hazır
addımlar `docs/deploy-backend.md`-dədir. Backend deploy-dan sonra frontend-i
`VITE_API_URL` ilə yenidən build edib yenidən Pages-ə deploy edin.

## Fayllar barədə

- Bütün fayl növləri dəstəklənir; maksimum ölçü 50 MB (`max_file_size_mb`, DB ayardan dəyişilə bilir)
- Fayllar Google Drive-da saxlanılır, 1 il müddətinə; müddət bitməzdən 30 gün əvvəl sahiblərə e-poçt xəbərdarlığı
- Inline viewer: şəkil/video/audio/PDF (PDF.js), Office (PPT/PPTX — LibreOffice ilə PDF-ə konvertasiya), Word/Excel/CSV (docx-preview/SheetJS), arxiv siyahısı
