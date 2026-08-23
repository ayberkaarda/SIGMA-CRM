# SIGMA-CRM

SIGMA-CRM, kapalı devre (yalnızca davetle erişilen) bir kurumsal CRM sistemidir. Laravel 12 + React 18 tabanlı bir monorepo olarak geliştirilir.

## Proje Yapısı

| Dizin | Açıklama |
| --- | --- |
| `backend/` | Laravel 12 tabanlı REST API (Sanctum ile kimlik doğrulama, Reverb ile gerçek zamanlı olaylar). |
| `frontend/` | React 18 + Vite ile geliştirilen tek sayfa uygulama (SPA). |
| `docs/` | Yol haritası, ilerleme kaydı ve tasarım sistemi dokümanları. |

İlgili dokümanlar:
- [docs/ROADMAP.md](docs/ROADMAP.md)
- [docs/PROGRESS.md](docs/PROGRESS.md)

## Teknoloji Yığını

| Katman | Teknoloji | Sürüm / Not |
| --- | --- | --- |
| Backend | Laravel | 12.67.0 |
| Backend | Laravel Sanctum | Kimlik doğrulama (SPA cookie tabanlı) |
| Backend | spatie/laravel-permission | Rol ve yetki yönetimi |
| Backend | PHP | 8.2.12 |
| Frontend | React | 18.3.1 |
| Frontend | Vite | Build/dev sunucusu |
| Frontend | React Router | İstemci tarafı yönlendirme |
| Frontend | TanStack Query | Sunucu state yönetimi / veri çekme |
| Frontend | Zustand | İstemci state yönetimi |
| Frontend | Tailwind CSS | 4.3.3 |
| Veritabanı | MySQL / MariaDB | 10.4.32 (MariaDB), veritabanı adı: `sigma_crm` |
| Realtime | Laravel Reverb + Laravel Echo | WebSocket sunucusu ve istemci kütüphanesi |
| Queue / Cache | Redis | 8.0.5 (WSL2 üzerinde) |
| Araç | Node.js | 26.7.0 |

> **Not:** Proje başlangıçta Laravel 11 hedefliyordu. Laravel 11.x'te yamalanmamış güvenlik açıkları (CVE-2026-48019 dahil) bulunduğu ve 11.x hattında düzeltme olmadığı için Laravel 12'ye geçildi. Ayrıntı: `docs/PROGRESS.md` karar günlüğü.

## Ön Koşullar

Bu proje aşağıdaki ortamda doğrulanmıştır:

| Bileşen | Sürüm / Konum | Not |
| --- | --- | --- |
| PHP | 8.2.12 — `C:\xampp\php\php.exe` | `zip` ve `intl` eklentileri açık olmalı |
| Composer | 2.10.2 — `C:\xampp\php\composer.bat` | |
| MariaDB | 10.4.32 — `127.0.0.1:3306` | Kullanıcı `root`, şifre boş, utf8mb4. **Windows servisi olarak kurulu değildir**, XAMPP Control Panel'den başlatılmalıdır |
| Redis | 8.0.5 — WSL2 Ubuntu üzerinde, `127.0.0.1:6379` | Memurai kurulu değil |
| Node.js | v26.7.0 | |
| npm | 11.19.0 | |

Ek notlar:
- PHP için `redis` C eklentisi kurulu değildir; bu nedenle backend'de `predis/predis` paketi kullanılır (`REDIS_CLIENT=predis`).
- `C:\xampp\php` kullanıcı PATH'ine eklenmiştir. Bu değişiklik yalnızca **yeni açılan terminallerde** geçerlidir; eski terminallerde `php` komutu yerine tam yol (`C:\xampp\php\php.exe`) kullanılmalıdır.

### Kurulum Adımları (Ön Koşullar)

**XAMPP:** PHP 8.2 veya üzeri şarttır — daha düşük bir sürüm Laravel 12'yi çalıştıramaz. XAMPP kurulumundan sonra `php.ini` dosyasında aşağıdaki satırların başındaki `;` işaretini kaldırın:
```ini
extension=zip
extension=intl
```

**Composer:** XAMPP ile birlikte gelen `composer.bat` kullanılabilir veya [getcomposer.org](https://getcomposer.org/) üzerinden ayrıca kurulabilir.

**Redis (Windows'ta iki seçenek):**
- **(a) WSL2 + Ubuntu (bu projede kullanılan yöntem):**
  ```
  wsl --install
  sudo apt install redis-server
  sudo service redis-server start
  ```
  Windows tarafından `127.0.0.1:6379` üzerinden erişilebilir.
- **(b) Memurai:** Windows-native Redis servisi, WSL2 istemeyenler için alternatiftir.

## Kurulum

1. Repoyu klonlayın.
2. MySQL'i başlatın: XAMPP Control Panel → **MySQL** → **Start**. phpMyAdmin kullanacaksanız **Apache**'yi de başlatın.
3. Veritabanını oluşturun (veritabanı adı **`sigma_crm`** olmalıdır):
   - phpMyAdmin üzerinden, veya
   - komut satırından:
     ```
     mysql -u root -e "CREATE DATABASE sigma_crm CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
     ```
4. Redis'i başlatın (WSL içinden): `sudo service redis-server start`. Doğrulamak için: `redis-cli ping` → `PONG` dönmelidir.
5. Backend kurulumu:
   ```
   cd backend
   composer install
   cp .env.example .env
   php artisan key:generate
   php artisan migrate --seed
   ```
   (Faz 3'te hazır olacak — şu an migration'lar henüz yazılmadı)
6. Frontend kurulumu:
   ```
   cd frontend
   npm install
   cp .env.example .env
   ```
   Not: Tailwind v4 kullanıldığı için `tailwind.config.js` yoktur; tema `frontend/src/styles/tokens.css` içinde `@theme` ile tanımlanır.

## Çalıştırma

Uygulamanın tam çalışması için dört süreç, dört ayrı terminalde çalıştırılmalıdır:

| Süreç | Komut | Port |
| --- | --- | --- |
| API | `cd backend && php artisan serve` | 8000 |
| WebSocket (Reverb) | `cd backend && php artisan reverb:start` | 8080 |
| Queue worker | `cd backend && php artisan queue:work` | — |
| Frontend | `cd frontend && npm run dev` | 5173 |

Alternatif olarak, kök dizindeki **`dev.bat`** dosyası çalıştırılarak dört süreç de tek komutla, ayrı pencerelerde başlatılabilir.

## Sorun Giderme

- **`php` komutu bulunamıyor:** PATH değişikliği yalnızca yeni açılan terminallere yansır — yeni bir terminal açın veya `C:\xampp\php\php.exe` tam yolunu kullanın.
- **MySQL bağlantı hatası:** XAMPP Control Panel'de MySQL servisinin çalıştığından ve `sigma_crm` veritabanının oluşturulduğundan emin olun.
- **Redis bağlantı hatası:** WSL içinde `sudo service redis-server start` komutunu çalıştırın. `backend/.env` dosyasında `REDIS_CLIENT=predis` olmalıdır (phpredis C eklentisi kurulu değildir).
- **Reverb'e bağlanılamıyor:** `php artisan reverb:start` sürecinin çalıştığından, `backend/.env` ve `frontend/.env` dosyalarındaki `REVERB_*` / `VITE_REVERB_*` değerlerinin birbiriyle eşleştiğinden ve 8080 portunun boş olduğundan emin olun.
- **CORS / 419 hatası:** `backend/.env` içindeki `SANCTUM_STATEFUL_DOMAINS` ve `FRONTEND_URL` değerlerinin doğru olduğundan ve frontend isteklerinde `withCredentials: true` kullanıldığından emin olun.
- **`composer install` güvenlik uyarısıyla duruyor** → Composer 2.10+ güvenlik açığı olan sürümlerin kurulumunu engeller. Bu doğru davranıştır; bloğu kapatmak yerine paketi güvenli sürüme yükseltin (`composer audit` ile kontrol edin).

## API Endpoint Listesi

_Faz 13'te doldurulacak._

## ER Diyagramı

_Faz 3'te mermaid diyagramı olarak eklenecek._

## Varsayılan Hesaplar

_Faz 2'de Super Admin hesap bilgileri yazılacak._

## Güvenlik Notu

`.env` dosyaları asla repoya girmez; `.env.example` dosyaları eksiksiz tutulur. Sistem kapalı devredir — herkese açık kayıt (public registration) yoktur, kullanıcı hesapları yalnızca Super Admin tarafından oluşturulur.
