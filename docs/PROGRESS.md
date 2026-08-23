# SIGMA-CRM — İlerleme Durumu (PROGRESS)

**Son güncelleme:** 2026-08-23
**Durum özeti:** Faz 0 tamamlandı — backend (Laravel 12) ve frontend (React 18 + Vite) iskeletleri kurulu ve doğrulandı. Sıradaki: Faz 1 (Design System) ve Faz 2 (Auth & RBAC).

> Ayrıntılı plan: `docs/ROADMAP.md`. Bu dosya her oturum başında okunur (docs/ENGINEERING-RULES.md kuralı).

---

## Faz Durum Tablosu

| Faz | İsim | Durum | Not |
|---|---|---|---|
| 0 | Ortam & İskelet | ✅ Bitti | Backend + frontend iskeleti kuruldu ve doğrulandı (2026-08-23). Laravel 12.67.0 (güvenlik kararı — bkz. karar günlüğü), React 18.3.1, Tailwind 4.3.3 |
| 1 | Design System | 🟨 Devam | Token'lar Figma'dan çıkarıldı → docs/DESIGN-SYSTEM.md. Kalan iş: `frontend/src/styles/tokens.css` (Tailwind v4 `@theme`) + UI primitive'leri. Açık tema karara bağlandı (DESIGN-SYSTEM §1.6, WCAG AA doğrulandı) |
| 2 | Auth & RBAC & Kullanıcı Yönetimi | ⬜ Bekliyor | Faz 0 sonrası |
| 3 | Veri Katmanı | ⬜ Bekliyor | Faz 2 sonrası; Faz 4 ile paralel yürütülebilir |
| 4 | Realtime Altyapı | ⬜ Bekliyor | Faz 2 sonrası; Faz 3 ile paralel yürütülebilir |
| 5 | Log & Audit | ⬜ Bekliyor | Faz 3 + 4 sonrası |
| 6 | Leads + Contacts/Companies | ⬜ Bekliyor | — |
| 7 | Deals & Kanban Pipeline | ⬜ Bekliyor | — |
| 8 | Tasks/Activities + Tickets | ⬜ Bekliyor | — |
| 9 | Products & Quotes | ⬜ Bekliyor | — |
| 10 | Notifications + Settings | ⬜ Bekliyor | Faz 11 ile paralel yürütülebilir |
| 11 | Reports + Dashboard | ⬜ Bekliyor | Faz 10 ile paralel yürütülebilir |
| 12 | Chat | ⬜ Bekliyor | — |
| 13 | Test, Sertleştirme & Teslim | ⬜ Bekliyor | Son faz |

Durum simgeleri: ⬜ Bekliyor · 🟨 Devam · ✅ Bitti · 🚫 Bloke

## Ortam Durumu (2026-08-23 doğrulandı)

| Bileşen | Sürüm | Durum | Not |
|---|---|---|---|
| PHP | 8.2.12 | ✅ | `C:\xampp\php\php.exe`, ZTS; `zip` + `intl` açıldı (yedek: `php.ini.bak-20260823`) |
| Composer | 2.10.2 | ✅ | `C:\xampp\php\composer.bat`, SHA-384 imza doğrulandı |
| MariaDB | 10.4.32 | ✅ çalışıyor | `127.0.0.1:3306`, root/şifresiz, utf8mb4 / utf8mb4_general_ci. Servis olarak kurulu değil — yeniden başlatmada XAMPP Control Panel'den başlatılmalı |
| Redis | 8.0.5 | ✅ çalışıyor | WSL2 Ubuntu üzerinde, `127.0.0.1:6379` (PONG doğrulandı). Memurai gerekmedi |
| Node / npm | 26.7.0 / 11.19.0 | ✅ | |
| Laravel | 12.67.0 | ✅ | `composer audit` temiz. Laravel 11 yerine 12 — güvenlik kararı |
| React / Tailwind | 18.3.1 / 4.3.3 | ✅ | Tailwind v4: `tailwind.config.js` yok, tema CSS'te `@theme` ile |
| PHP `redis` eklentisi | — | ❌ yok | `predis/predis` (saf PHP) kullanılacak |
| PATH | — | ✅ | `C:\xampp\php` kullanıcı PATH'inde (3 kez tekrarlı — zararsız). Açık terminaller oturum başındaki eski PATH'i taşır; `php`/`composer` bulunamazsa yeni terminal aç |

---

## Şu Anki Odak

Faz 0 tamamlandı (backend Laravel 12 + frontend React 18/Vite iskeletleri kuruldu ve doğrulandı). Odak şimdi Faz 1 (Design System) ve Faz 2 (Auth & RBAC) — bkz. Bir Sonraki Adım.

## Açık Bloklar

- Şu an açık blok yok.

## Bir Sonraki Adım

1. **Faz 1 — Design System:** `docs/DESIGN-SYSTEM.md` token'ları → `frontend/src/styles/tokens.css` (Tailwind v4 `@theme` bloğu + `:root` / `[data-theme="dark"]` custom property'leri) → UI primitive'leri (`frontend/src/components/ui/`) → `/showcase` sayfası → WCAG AA denetimi.
2. **Faz 2 — Auth & RBAC:** Sanctum SPA + CSRF akışı, roller/izinler, Super Admin seeder, Kullanıcı Yönetimi, session revoke.
3. Faz 1 ve Faz 2 paralel yürütülebilir (Faz 2'nin UI cilası Faz 1'in primitive'lerini bekler).
4. **Not:** `sigma_crm` veritabanı HENÜZ OLUŞTURULMADI ve hiçbir migration çalıştırılmadı — Faz 3'ün işi, ayrı onay gerektirir.

---

## Karar Günlüğü

| Tarih | Karar | Gerekçe |
|---|---|---|
| 2026-08-23 | Teknoloji yığını sabitlendi: Laravel 11 + Sanctum, React 18 + Vite + TanStack Query + Zustand + Tailwind, MySQL (XAMPP), Reverb + Echo + Redis, monorepo `backend/` + `frontend/` | `PRODUCT-BRIEF.md` "DEĞİŞTİRİLEMEZ" olarak tanımlıyor |
| 2026-08-23 | Windows'ta Redis için birincil öneri Memurai, alternatif WSL2 | Windows-native servis, XAMPP ortamıyla en az sürtünme (ROADMAP R1) |
| 2026-08-23 | Teklif PDF üretimi için `barryvdh/laravel-dompdf` | Saf PHP, Windows/XAMPP'ta harici binary gerektirmez (ROADMAP R7) |
| 2026-08-23 | Figma tasarımı kaynak alındı: DexignZone "Dashboard CRM" template'i (koyu tema) | Kullanıcı tarafından sağlandı; token'lar Figma REST API ile ölçülerek çıkarıldı (tahmin değil) |
| 2026-08-23 | Template'in görsel dili alınacak, bilgi mimarisi alınmayacak | Template genel admin teması (Employees/Core HR/Projects); menü yapısı CRM modül listemizle örtüşmüyor; modüller PRODUCT-BRIEF.md'den gelir |
| 2026-08-23 | Ana font Poppins, self-host edilecek | Kapalı devre sistemde Google Fonts CDN bağımlılığı istenmez |
| 2026-08-23 | Redis için WSL2 kullanılacak, Memurai kurulmayacak | Makinede WSL2 Ubuntu zaten çalışıyor ve Redis 8.0.5 `127.0.0.1:6379` üzerinden erişilebilir; ikinci bir Windows servisi gereksiz (ROADMAP R1 kapandı) |
| 2026-08-23 | Redis client olarak `predis/predis` kullanılacak (phpredis değil) | XAMPP PHP 8.2.12'de `redis` C eklentisi yok; predis saf PHP olduğu için ek derleme/DLL gerektirmez |
| 2026-08-23 | Açık tema paleti karara bağlandı: 4 accent + text-muted koyulaştırıldı | Figma'da yalnızca koyu tema çizilmiş; orijinal accent'ler beyaz zeminde WCAG AA'yı geçmiyordu (primary 2.99:1, success 2.14:1, danger 2.99:1, warning 2.06:1). 18 kontrast çifti doğrulandı — bkz. DESIGN-SYSTEM.md §1.6 |
| 2026-08-23 | **Laravel 11 yerine Laravel 12 kullanılacak** (kurulu: 12.67.0) | Laravel 11.x'te yamalanmamış 3 advisory var ve 11.x hattında düzeltme yok: CVE-2026-48019 varsayılan `email` validation kuralında CRLF injection (HIGH, yamalı 12.60.0+) ve Temporary Signed URL Path Confusion (MEDIUM, yamalı 12.61.1+). Bu CRM her modülde e-posta doğrulaması kullanacağı için doğrudan ilgili. `PRODUCT-BRIEF.md`'deki "Laravel 11 DEĞİŞTİRİLEMEZ" maddesi, aynı belgenin "GÜVENLİK KRİTİK" maddesi lehine bilinçli olarak terk edildi — kullanıcı onayladı. `composer audit` şu an temiz |
| 2026-08-23 | Tailwind CSS v4 kullanılacak (4.3.3) | v4'te `tailwind.config.js` yok; tema CSS'te `@theme` bloğuyla tanımlanıyor. Bu, token'ları CSS custom property olarak tutma stratejimizle doğrudan örtüşüyor (dark/light tek dosyada) |
| 2026-08-23 | React 18 pinlendi (18.3.1) | Vite şablonu varsayılan React 19 kuruyor; `PRODUCT-BRIEF.md` React 18 istiyor. `react`, `react-dom` ve `@types/*` `^18`'e sabitlendi |

---

## Güncelleme Kuralı

- Her faz sonunda teknik lider bu dosyayı günceller: durum tablosu, "son güncelleme" tarihi, odak/blok/sonraki adım bölümleri ve gerekiyorsa karar günlüğü.
- Şeritler bu dosyayı güncellemez; yalnızca teknik liderin görevlendirdiği dokümantasyon şeridi yazabilir, commit atılmaz; teknik lider commit mesajını hazırlayıp kullanıcıya verir.
