# Google Drive qurulması

Fayllar Google Drive-da saxlanılır (bütün növlər, 1 il müddət). Xidmət hesabı
(service account) istifadə olunur — heç bir istifadəçinin şəxsi Drive-ı mühüm deyil.

## 1. Google Cloud Console

1. [console.cloud.google.com](https://console.cloud.google.com) → **Select a project** → **New Project** (məs. `it25patok`)
2. Sol menyuda **APIs & Services → Library** → **Google Drive API** → **Enable**
3. **APIs & Services → Credentials** → **Create Credentials → Service account**
   - Name: `it25patok-storage` → **Create and Continue** → Role-suz davam → **Done**
4. Yaradılmış service account-a daxil olun → **Keys** tab → **Add Key → Create new key → JSON** → yüklə `.env` faylına salınacaq

## 2. Drive qovluğu

1. Google Drive-da root qovluq yaradın: məs. **İT25 PATOK Storage**
2. URL-dən **folder ID**-ni götürün: `https://drive.google.com/drive/folders/<FOLDER_ID>`
3. Qovluğu service account e-poçtu ilə **Editor** səviyyəsində paylaşın (sağ klik → Share → service account email-i yapışdırın → Editor)

## 3. Backend mühit dəyişənləri

```bash
DRIVE_ROOT_FOLDER_ID=<FOLDER_ID>
GOOGLE_SERVICE_ACCOUNT_JSON=<service-account.json-in bütün mətni, tək sətirdə>
# və ya fayl yolu ilə:
# GOOGLE_SERVICE_ACCOUNT_FILE=/secrets/service-account.json
```

## 4. Yoxlama

Backend işə düşdükdə `/actuator/health` `UP` dönməlidir; ilk fayl yükləməsində
service account qovluqda avtomatik `Tələbə tapşırıqları` / `Müəllim` / `Avatar`
qovluq strukturunu yaradır.

> Not: Service account-a Drive-da **Editor** kifayətdir — Delete/Settings hüquqları lazım deyil.
