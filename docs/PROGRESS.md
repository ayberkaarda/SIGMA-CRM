# Syncra — İlerleme Durumu (PROGRESS)

**Son güncelleme:** 2026-08-24
**Durum özeti:** Faz 0-12 tamamlandı — bildirim merkezi, ayarlar, raporlar, canlı dashboard ve chat (DM/grup, tik makinesi, mention, dosya paylaşımı, kayda bağlı panel) dahil. Sıradaki: Faz 13 (Denetim, Sertleştirme, i18n + Çoklu Para Birimi & Attio).

> Ayrıntılı plan: `docs/ROADMAP.md`. Bu dosya her oturum başında okunur (docs/ENGINEERING-RULES.md kuralı).

---

## Faz Durum Tablosu

| Faz | İsim | Durum | Not |
|---|---|---|---|
| 0 | Ortam & İskelet | ✅ Bitti | Backend + frontend iskeleti kuruldu ve doğrulandı (2026-08-23). Laravel 12.67.0 (güvenlik kararı — bkz. karar günlüğü), React 18.3.1, Tailwind 4.3.3 |
| 1 | Design System | ✅ Bitti | Token'lar + tema yönetimi + 15 UI primitive'i + /showcase (2026-08-23). Görsel doğrulama yapıldı ve onaylandı (2026-08-23) |
| 2 | Auth & RBAC & Kullanıcı Yönetimi | ✅ Bitti | 63 izin, 6 rol, 12 endpoint, zorunlu şifre değişimi. 50 test / 221 assertion (2026-08-23) |
| 3 | Veri Katmanı | ✅ Bitti | 39 tablo, 40 FK, 20 factory, 5 seeder, tutarlı demo veri. 24/24 tutarlılık kontrolü temiz (2026-08-23) |
| 4 | Realtime Altyapı | ✅ Bitti | Reverb v1.11.1 Windows'ta çalışıyor (R2 kapandı), 6 kanallı mimari, presence + online kullanıcı ucu, frontend Echo bağlantısı ve UI cilası tamamlandı |
| 5 | Log & Audit | ✅ Bitti | Oturum/gezinme/audit logları, canlı akış, 4 sekmeli Loglar sayfası, CSV/XLSX export, logs:prune. 162 test (2026-08-23) |
| 6 | Leads + Contacts/Companies | ✅ Bitti | Duplicate tespiti (4/4 gerçek veride doğrulandı), lead dönüşümü, CSV import, timeline. 279 test (2026-08-24) |
| 7 | Deals & Kanban Pipeline | ✅ Bitti | Fractional index, optimistic locking, 409 çakışma çözümü, realtime senkron. R4 kapandı. 357 test (2026-08-24) |
| 8 | Tasks/Activities + Tickets | ✅ Bitti | Görev/aktivite + takvim, in-app hatırlatıcı, SLA duraklama semantiği, durum makinesi, iç notlar activities üzerinden. 470 test (2026-08-24) |
| 9 | Products & Quotes | ✅ Bitti | KDV matrahı düzeltildi (demo veride 37.645 TL fazla KDV bulundu), fiyat listeleri, PDF (R7 kapandı). 646 test (2026-08-24) |
| 10 | Notifications + Settings | ✅ Bitti | Bildirim merkezi (11 tip, `database`+`broadcast` kanalı, `private-user.{id}`, okunmamış sayaç), Ayarlar (şirket profili, pipeline aşama editörü, özel alan yönetimi, e-posta şablonları, rol/izin matrisi). Tetikleyiciler observer/listener ile (2026-08-24) |
| 11 | Reports + Dashboard | ✅ Bitti | 4 rapor (satış performansı, kullanıcı performansı, kaynak analizi, dönüşüm) + CSV/XLSX export, 8 KPI'lı canlı dashboard (Recharts), `DashboardInvalidated` 3 sn debounce. 805 test / 7237 assertion (2026-08-24) |
| 12 | Chat | ✅ Bitti | DM + grup/kanal sohbeti, imleç bazlı tik makinesi (`TickState`, mesaj başına satır değil), whisper yazıyor göstergesi, presence, @mention (istemci taraflı seçim), dosya/görsel paylaşımı (allowlist + sunucu taraflı MIME), okunmamış sayaçları, deal/ticket detayında kayda bağlı sohbet paneli. 899 test / 7558 assertion (2026-08-24) |
| 13 | Denetim, Sertleştirme, Uluslararasılaştırma (i18n + Çoklu Para Birimi) & Attio | ⬜ Bekliyor | İz A kırmızı takım + F1–F6 + H1–H8; İz B 6-rol kabul; İz C Attio; İz D i18n tr/en/de/fr + README EN; İz E çoklu para birimi + TCMB kur. Detay: `docs/PHASE-AUDIT.md`. Faz büyüdü — bölme önerisi §12 (karar kullanıcıya) |
| 14 | Teslim & Final Kabul | ⬜ Bekliyor | Son faz (eski Faz 13, kaydırıldı). İşlevsel test kapsamı + README final + son kabul |

Durum simgeleri: ⬜ Bekliyor · 🟨 Devam · ✅ Bitti · 🚫 Bloke

## Ortam Durumu (2026-08-23 doğrulandı)

| Bileşen | Sürüm | Durum | Not |
|---|---|---|---|
| PHP | 8.2.12 | ✅ | `C:\xampp\php\php.exe`, ZTS; `zip` + `intl` açıldı (yedek: `php.ini.bak-20260823`) |
| Composer | 2.10.2 | ✅ | `C:\xampp\php\composer.bat`, SHA-384 imza doğrulandı |
| MariaDB | 10.4.32 | ✅ çalışıyor | `127.0.0.1:3306`, root/şifresiz, utf8mb4 / utf8mb4_general_ci. Servis olarak kurulu değil — yeniden başlatmada XAMPP Control Panel'den başlatılmalı |
| Redis | 8.0.5 | ✅ çalışıyor | WSL2 Ubuntu üzerinde, `127.0.0.1:6379` (PONG doğrulandı). Memurai gerekmedi. **Dikkat:** WSL2 dağıtımı boşta kalınca Windows tarafındaki `127.0.0.1:6379` localhost port aktarımı düşer; Redis WSL içinde `PONG` verirken bile Windows'tan bağlantı reddedilir — Faz 12 oturumunda 12 testin (LeadImportTest, NotificationTriggerTest) Redis bağlantı hatasıyla düşmesine yol açtı. Çözüm: uzun ömürlü bir WSL süreci dağıtımı pinlemeli (`dev.bat` bunu yapar) |
| Node / npm | 26.7.0 / 11.19.0 | ✅ | |
| Laravel | 12.67.0 | ✅ | `composer audit` temiz. Laravel 11 yerine 12 — güvenlik kararı |
| React / Tailwind | 18.3.1 / 4.3.3 | ✅ | Tailwind v4: `tailwind.config.js` yok, tema CSS'te `@theme` ile |
| PHP `redis` eklentisi | — | ❌ yok | `predis/predis` (saf PHP) kullanılacak |
| PATH | — | ✅ | `C:\xampp\php` kullanıcı PATH'inde (3 kez tekrarlı — zararsız). Açık terminaller oturum başındaki eski PATH'i taşır; `php`/`composer` bulunamazsa yeni terminal aç |
| UI bağımlılıkları | — | ✅ | @fontsource/poppins (self-host), clsx, tailwind-merge, lucide-react, sonner |
| Veritabanı | syncra_crm | ✅ | utf8mb4_unicode_ci. Test DB'si ayrı: syncra_crm_test (phpunit.xml'de sabit). 39 tablo, 40 FK, demo veri yüklü |
| Reverb | v1.11.1 | ✅ | Windows'ta yerel çalışıyor, ws://127.0.0.1:8080. WSL/pcntl gerekmedi. **Dikkat:** `BroadcastingTest` bilinçli olarak `reverb` sürücüsünü zorluyor; Reverb çalışmıyorken test paketi bu dosyada ASILIR (bağlantı `SYN_SENT`'te kalır, hata vermez) — testten önce Reverb ayakta olmalı |
| Zamanlanmış görevler | 3 komut | ✅ | logs:prune (03:17), tasks:dispatch-reminders (dakikalık), tickets:scan-sla (5 dk) — schedule:work gerekir |
| PDF | dompdf v3.1.2 | ✅ | DejaVu Sans, Türkçe + ₺ doğrulandı; font subsetting açık (860KB → 30KB) |

---

## Şu Anki Odak

Faz 13 — Denetim, Sertleştirme, Uluslararasılaştırma (i18n + Çoklu Para Birimi) & Attio: İz A kırmızı takım + F1–F6 ön bulgu kapatma + H1–H8 sertleştirme; İz B 6-rol kabul turu; İz C Attio kabul/red; İz D i18n (tr/en/de/fr) + README EN; İz E çoklu para birimi + TCMB güncel kur. Detay: `docs/PHASE-AUDIT.md`. Faz büyüdü — ikiye bölme önerisi §12, karar kullanıcı bekliyor.

## Açık Bloklar

- Şu an açık blok yok.

## Bir Sonraki Adım

1. **Faz 13 — Denetim, Sertleştirme, Uluslararasılaştırma (i18n + Çoklu Para Birimi) & Attio:** İz A–E ayrıntısı `docs/PHASE-AUDIT.md`'de (tehdit modeli, test matrisi, ön bulgular F1–F6, Attio, i18n, para birimi, sertleştirme H1–H8, paralelleştirme). Kapsam büyüdü — ikiye bölme önerisi §12, karar kullanıcı bekliyor.
2. Frontend lint'te Faz 10/11'den kalma bilinen borç: 4 hata + 1 uyarı (`RevenueTrendChart.tsx`, `SalesPerformanceChart.tsx`, `CompanyProfileTab.tsx`, `EmailTemplateFormModal.tsx` — sonuncusu `react/no-danger` kuralı tanımsız, F5 ön bulgusuyla ilişkili). `features/chat/` altında 0 hata.
3. `attachments:prune-orphans` komutu yazıldı ama `routes/console.php`'ye kaydedilmedi — zamanlama kararı docs/ENGINEERING-RULES.md §6 uyarınca kullanıcıda.
4. Frontend'de test altyapısı YOK (vitest/jest kurulu değil) — 899 backend testi var, frontend'de sıfır. Orijinal gereksinim yalnızca backend feature testleri istiyordu; Faz 14'te (işlevsel kapsama) değerlendirilebilir — Faz 13 güvenlik doğrulaması backend'de kilitlenir.
5. Deal timeline ucu YOK — Faz 6'da kişi/firma için yazıldı, deal için yazılmadı. Detay sayfası şu an bağlı kişinin timeline'ına bağlantı veriyor.
6. Etiket/aşama renkleri için components/shared/tokenBadgeVariant.ts hazır — pipeline_stages.color aynı token adlarını taşıyor.
7. Demo hesaplarla giriş: demo kullanıcıların şifresi Demo!2026Syncra, must_change_password=false — farklı rollerin UI'da ne gördüğünü test etmek için kullanılabilir.

**Uyarı:** Faz 3+ endpoint'leri `routes/api.php` içinde `password.changed` grubunun İÇİNE yazılmalı — dışına yazılan uç zorunlu şifre değişimini atlar.

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
| 2026-08-23 | Toast için Sonner kullanılacak | Projede kurulu `ask-sonner` skill'i ile API'si doğrulandı; erişilebilir, hafif, tema desteği var. Tokenlarımızla sarmalandı (`Toast.tsx`) |
| 2026-08-23 | İkon seti: lucide-react (Font Awesome 5 değil) | Tasarım FA5 kullanıyor ama React projesinde lucide tree-shake edilebilir ve tip güvenli; ikon isimleri eşlenerek kullanılıyor |
| 2026-08-23 | Poppins self-host (@fontsource/poppins) | Kapalı devre sistemde Google Fonts CDN bağımlılığı istenmiyor; 400/500/600/700 ağırlıkları bundle'a dahil |
| 2026-08-23 | Faz 1 görsel kabul verildi | Kullanıcı `/showcase` sayfasını açık ve koyu temada gözden geçirdi, düzeltme gerektiren bir sorun bulunmadı |
| 2026-08-23 | Zorunlu şifre değişimi sunucuda dayatılıyor (EnsurePasswordIsChanged) | must_change_password yazılıyordu ama dayatılmıyordu; geçici şifre kalıcılaşıyordu. Frontend guard'ı yetersiz — geçerli cookie ile curl/Postman API'ye doğrudan erişebilir. Muafiyet beyaz liste (fail-safe). Tasarım: docs/AUTH-FLOWS.md |
| 2026-08-23 | Diğer oturumların şifre değişiminde düşmesi için ek kod yazılmadı | config/sanctum.php'deki authenticate_session zinciri, session'daki password_hash_web ile güncel hash'i karşılaştırıp uyuşmazlıkta 401 veriyor. Garanti config'den geldiği için feature testiyle sabitlendi (config regresyonunda test alarm verir) |
| 2026-08-23 | Login rate limiting: e-posta+IP anahtarı, artan bekleme | Sadece IP: NAT arkasındaki kullanıcılar birbirini kilitler. Sadece e-posta: dağıtık deneme engellenmez. Artan bekleme 1→2→4→8→16→32→60 dk |
| 2026-08-23 | spatie/laravel-activitylog ^4.12 Faz 3'te kuruldu (Faz 5 yerine) | activity_log tablosu Faz 3 şema listesindeydi; paketi sonra kurmak şema değişikliği gerektirirdi. 5.x PHP 8.4 istiyor, ortamda 8.2 var |
| 2026-08-23 | Demo veri DemoDataSeeder'da izole, üretimde atlanıyor | migrate --seed tek komutla dolu demo sistem vermeli (ürün gereksinimi) ama üretimde sahte veri felaket olur. DatabaseSeeder app()->environment('production') kontrolüyle atlıyor |
| 2026-08-23 | Demo veri tutarlılığı seeder içinde assert ediliyor | 24 kontrol DemoDataSeeder::assertConsistency() içinde çalışıyor; ihlalde RuntimeException ile transaction geri alınıyor. Bozuk demo veri Faz 7/9/12'de teşhisi zor hatalara dönüşürdü |
| 2026-08-23 | Online kullanıcı listesi Reverb API'sinden okunuyor, DB'den değil | Soketlerin sahibi Reverb; soket kapanınca üye anında düşer. DB'de `is_online` kolonu tutmak süpürücü job gerektirir ve çökme/ağ kopması durumunda kalıcı yalan söyler. Redis yalnızca önbellek (5 sn) ve Reverb erişilemezken bayat anlık görüntü (5 dk) için |
| 2026-08-23 | `/broadcasting/auth` ucuna `password.changed` middleware'i uygulanmadı | Zorunlu şifre değişimi ekranındaki kullanıcının da canlı sokete ihtiyacı var — UserDeactivated'ın ulaşması gereken oturum tam olarak odur. Kanal callback'leri kullanıcının zaten sahip olmadığı veriyi açmıyor. `/api/presence/online` ise grubun İÇİNDE |
| 2026-08-23 | Broadcasting testleri `reverb` sürücüsünü zorluyor, `null` değil | `NullBroadcaster::auth()` her isteğe 200 döner; `BROADCAST_CONNECTION=null` ile çalışan testler her kanalı yetkilendiren bir broadcaster'a karşı yeşil olur ve hiçbir şey doğrulamaz |
| 2026-08-23 | Oturum logları Laravel auth event'leriyle DEĞİL, AuthService'ten doğrudan yazılıyor | Vendor kaynağı okunarak doğrulandı: Login event'i ikinci regenerate()'ten önce fırlıyor (session_id geçersiz oluyor), Failed ve Lockout event'leri bizim akışımızda hiç fırlamıyor. Event'lere güvenmek sessizce boş log tablosu üretirdi |
| 2026-08-23 | Audit kırpması tek katmanda: DB'de 1024 karakter | İki şerit bağımsız olarak kırpma üstlenmişti (DB 1024 + API 200); API katmanı DB'nin alan bazlı bilgisini boolean'a çevirip yok ediyordu. Kırpma DB katmanının işi, API sadece geçirir |
| 2026-08-23 | Message ve Conversation audit'e alınmadı | Chat, üründeki en yüksek hacimli tablo; audit'e aynalanırsa "kim fırsat tutarını değiştirdi" satırı binlerce "mesaj gönderdi" altında kaybolur. Sohbet geçmişi kendi tablosunda edited_at + soft delete ile zaten tam duruyor |
| 2026-08-23 | Sayfa ziyareti loglama hataları kullanıcıya gösterilmiyor | İkincil bir iş; 403/500/ağ hatası hepsi sessiz. Kullanıcıya "log toplayamadık" demek anlamsız, üstelik must_change_password durumunda 403 beklenen davranış |
| 2026-08-24 | Duplicate skorları toplanmaz, en yüksek kural kazanır | Hem e-posta hem telefon eşleşen bir kayıt 190 değil 100 alır. Toplama, "iki zayıf sinyal bir güçlü sinyale eşittir" gibi yanlış bir denklik kurardı ve eşik anlamını yitirirdi |
| 2026-08-24 | Duplicate uyarısı kaydetmeyi engellemez | Tespit bir yargıdır, kesinlik değil. Aynı isimde iki gerçek kişi olabilir. Kullanıcıyı kendi verisi üzerinde kilitlemek yerine neden eşleştiği gösterilip karar ona bırakılır |
| 2026-08-24 | Dönüşümde morph kayıtları contact'a taşınır | Aksi halde dönüşüm teknik olarak başarılı görünür ama iletişim geçmişi lead'de kalır ve müşteri kartı boş açılır — dönüşümün amacı sessizce kaybolur |
| 2026-08-24 | CSV import'ta duplicate contact GÜNCELLENMEZ, atlanır | Contact canlı müşteri kaydı; import dosyasından gelen eksik/eski verilerle üzerine yazmak veri kaybıdır. Lead güncellenebilir (henüz nitelendirilmemiş aday) |
| 2026-08-24 | İstemci `position` göndermez, komşu id'lerini bildirir | İki istemci aynı anda aynı iki kart arasına bırakırsa ikisi de aynı fractional index'i hesaplar ve çakışırlar. Pozisyon her zaman sunucuda üretilir |
| 2026-08-24 | Fractional index alfabesi yalnızca küçük harfli base36 | `position` kolonu `utf8mb4_unicode_ci` (harf duyarsız); büyük harfli alfabede MySQL `ORDER BY` ile PHP `strcmp()` ayrışır — testler yeşil kalırken üretimde sıralama bozulur |
| 2026-08-24 | Optimistic update'te `version` cache'ten değil, sürükleme öncesi karttan okunur | Araya bir realtime olayı girerse cache'teki sürüm tazelenir ve çakışma tespiti sessizce devre dışı kalır — koruma varmış gibi görünüp hiçbir şey korumaz |
| 2026-08-24 | `is_lost` aşamasına taşımada `lost_reason` zorunlu | Kayıp nedeni satış analitiğinin en değerli verisi; opsiyonel bırakılırsa hiç doldurulmaz. `won_reason` opsiyonel — kazanma nedeni analitik olarak daha az kritik |
| 2026-08-24 | SLA sayacı `pending` durumunda durur | Durmasaydı destek temsilcisi müşterinin yavaşlığından dolayı ihlal almış görünürdü ve ölçüm ekip değerlendirmesinde kullanılamazdı. Maliyeti 2 kolon; tasarım: docs/SLA-DESIGN.md |
| 2026-08-24 | SLA ihlali kalıcı bayrak değil, türetilmiş değer | Bayrak tutulsaydı duraklama sonrası güncellemeyi unutan her kod yolu sessizce yanlış veri üretirdi. Tek predicate SlaService'te, filtre/stats/tarayıcı aynı tanımı paylaşır |
| 2026-08-24 | İç notlar için yeni tablo açılmadı, activities kullanıldı | Sistem kapalı devre; müşteri portalı olmadığı için her not zaten iç nottur ve is_internal ayrımı anlamsızdır. Bir migration'dan tasarruf edildi, Faz 6 timeline altyapısıyla uyumlu kaldı |
| 2026-08-24 | SLA geri sayımı istemcide performance.now() ile | Date.now() ile sla_due_at karşılaştırılırsa kullanıcının sistem saati bozuksa SLA durumu tamamen yanlış görünür ve hiçbir test bunu yakalayamaz. Monoton saat sistem saatinden bağımsız ilerler |
| 2026-08-24 | KDV matrahı indirim SONRASI hesaplanıyor | KDVK md. 25/a: iskonto matraha dahil edilmez. Faz 3'teki formül indirim öncesi matrah kullanıyordu ve demo veride 15 teklifin 4'ünde toplam 37.645,12 TL fazla KDV üretiyordu. Tasarım: docs/QUOTE-FINANCIALS.md |
| 2026-08-24 | Para hesabında int-kuruş + bcmath iş bölümü | Toplama/karşılaştırma int (kayıpsız), çarpma/bölme bcmath. Saf int taşardı: quantity × unit_price × (10000-indirim) 10²⁷ mertebesine çıkıp 64-bit sınırını aşar ve sessizce float'a döner. Ayrıca bccomp'un varsayılan ölçeği 0'dır ve ondalığı yok sayar — COMPARE_SCALE=10 ile kapatıldı |
| 2026-08-24 | Teklif toplamları istemcide hesaplanmıyor | KDV grubu bazlı largest-remainder dağıtımını JavaScript'te yeniden üretmek ikinci doğruluk kaynağı yaratırdı. POST /api/quotes/calculate kalıcı olmayan önizleme sağlıyor; satır toplamı (basit çarpım) istemcide, toplamlar sunucuda |
| 2026-08-24 | Soft delete çocuk kayıtları korur, cascade yalnızca forceDelete'te | PriceList soft delete kullandığı için FK cascade tetiklenmiyordu; kalemleri elle silmek soft delete'i yıkıcı yapardı (liste geri yüklenince boş dönerdi). quotes/quote_items ve conversations/messages ile aynı desen |
| 2026-08-24 | Aşama pasifleştirme zorunlu hedef aşama ister | Açık kartlar aşamada bırakılsaydı Kanban onları göstermez ve sessizce kaybolurlardı; sadece engellemek 50 kartlı aşamada kullanıcıyı elle taşımaya mahkûm ederdi. Taşıma tek transaction'da, mevcut fractional index üreteci yeniden kullanılarak, kart başına `DealMoved` yayınlanarak yapılır |
| 2026-08-24 | Bildirim tetikleyicileri observer/listener ile, servis içinden dispatch ile değil | Dosya sahipliği çakışmasını önler ve bildirimleri iş mantığından ayrı tutar; Faz 6/7/8 servisleri değişmeden kaldı |
| 2026-08-24 | Toplu içe aktarmada bildirim susturması mevcut `ActivityLogStatus` toggle'ıyla | `LeadImportService` audit gürültüsünü zaten bu toggle ile susturuyordu; ikinci bir susturma mekanizması kurmak yerine tek gönderim kapısı (`NotificationDispatcher`) aynı bayrağı okuyor. `DemoDataSeeder` ham `DB::table()->insert()` kullandığı için observer'ları hiç tetiklemiyor |
| 2026-08-24 | `CrmNotification` alanları `readonly` değil | `SerializesModels::__unserialize()` alanları Reflection ile alt sınıf kapsamından geri yüklüyor ve PHP bunu readonly için reddediyor; `QUEUE_CONNECTION=sync` dahil her koşulda fatal veriyordu ve ilgisiz 88 testi kırıyordu |
| 2026-08-24 | Rapor/dashboard para değerleri JSON'da string | JSON float precision kaybı sessiz veri bozulmasıdır; biçimlendirme frontend'de `lib/money.ts` ile yapılır. Sayaçlar ve oranlar sayı olarak kalır |
| 2026-08-24 | `previous` sıfırken `delta_pct: null` | Sıfıra bölme yerine %∞ veya yanıltıcı %0 göstermek yerine rozet hiç gösterilmez |
| 2026-08-24 | Dashboard invalidate olayı 3 sn debounce ediliyor | Tek kullanıcı eylemi N fırsatı taşıyabiliyor (aşama pasifleştirme); N broadcast yerine tek invalidate yeterli |
| 2026-08-24 | `ConversionReport` lead durumlarını sabit listeden değil veriden türetiyor | Sabit liste `status='lost'` lead'leri sessizce düşürüyordu, `total_leads` 40 yerine 35 okunuyordu |
| 2026-08-24 | Yeni Faz 13 (Güvenlik Denetimi + Kırmızı Takım + Kullanıcı Kabul + Attio) eklendi; eski "Test, Sertleştirme & Teslim" Faz 14'e kaydırıldı | Kullanıcı isteği: projeyi kullanıcı+saldırgan gibi test et, açıkları kapat, Attio'dan fikir çıkar — ayrı bir faz. Faz 12'nin (Chat) yeni yüzeylerini test etmesi gerektiği için Chat'ten SONRA, teslimden ÖNCE; son fazdan önceye ekleme numaralandırmayı zorunlu kaydırdı (tek numara: 13→14). Eski Faz 13'ün güvenlik işleri (header, upload, IDOR, mass-assignment) yeni Faz 13'e taşındı, Faz 14 salt teslime daraltıldı — çakışma tek yerde. Plan: `docs/PHASE-AUDIT.md`. Okuma sırasında 5 ön bulgu saptandı (CSV formül enjeksiyonu, `.env` `APP_DEBUG=true`, export/import rate-limit yok, rapor tarih aralığı sınırsız, `body_html` sanitize yok + `dangerouslySetInnerHTML`) |
| 2026-08-24 | Faz 13'e üç iş kolu eklendi: İz D çok dilli destek (i18n tr/en/de/fr) + README İngilizce, İz E çoklu para birimi + TCMB güncel kur | Kullanıcı isteği. **Kararlar (PHASE-AUDIT §10/§11):** i18n=react-i18next (kapalı devre, CLDR çoğul, missing-key yakalama), tr varsayılan; enum etiketleri kodda→sözlük (DB göçü yok); **bildirim metni `notifications.data`'da anahtar+parametre saklanıp OKUMA anında çevrilir** (gönderim-anı donma çözümü); kullanıcı-verisi (aşama/tag/custom field/şirket profili/teklif şartları) çevrilmez — net sınır. `users.locale` + `users.preferred_currency` aynı mekanizma. Para: TCMB `ForexBuying/Unit` (VUK md.280 doğrulandı), TRY temel + USD/EUR/GBP; kapanmış fırsat kapanış-anı TRY tutarıyla DONAR (rapor kararlılığı), açık fırsat güncel kur; teklif `sent`'te kur donar (revizyon taze kur); **XXE-güvenli XML (`LIBXML_NONET`) + giden-çağrı sertleştirme (H7)**. dompdf DE/FR aksanları render+pdfparser ile DOĞRULANDI (font değişmez). Ön bulgu F6: Türkçe İ/ı casing DuplicateDetector/mention'da bozuk (mevcut hata, H8). Yeni ön bulgu: `features/quotes/utils/money.ts` merkezi money.ts'i ihlal eden kopya. **Faz büyüdü → ikiye bölme önerisi PHASE-AUDIT §12, karar kullanıcıya** |
| 2026-08-24 | Okundu/iletildi durumu mesaj başına satırda değil, `conversation_user` pivotundaki iki imleçte tutulur (`last_read_message_id` + yeni `last_delivered_message_id`) | Mesaj başına durum satırı tutulsaydı 10 kişilik grupta 100.000 mesaj 1.000.000 durum satırı ve her gönderimde N satırlık INSERT demekti. Okuma/iletim monoton olduğu için katılımcı başına tek imleç yeter; üç tik durumu (`sent`/`delivered`/`read`) bu çiftten `App\Services\Chat\TickState` ile türetilir |
| 2026-08-24 | Grup tikinde kural "en az bir kişi okudu", WhatsApp'ın "herkes okudu" kuralı değil | 12 kişilik grupta izinli tek kişi yüzünden mesaj günlerce tek tik kalır ve gösterge bilgi taşımayı bırakır |
| 2026-08-24 | İmleç yazımları tek atomik `UPDATE` ile yapılır, PHP tarafında oku-değiştir-yaz yok | Chat en yüksek eşzamanlılığa sahip yüzey (aynı kullanıcı iki sekmede); `$pivot->unread_count + 1` klasik kayıp-güncelleme yarışı yaratırdı. `GREATEST(COALESCE(...),?)` ile imleç asla geri gitmez (geciken eski "42'ye kadar okudum" isteği okunmuş mesajları geri açmaz); `unread_count` sıfırlanmaz, imlecin yeni değerinden bağıntılı alt sorguyla yeniden sayılır — kısmi okumada düz sıfırlama yalan söylerdi |
| 2026-08-24 | @mention'da sunucu metin ayrıştırmaz, istemci `mentions: [user_id]` gönderir | Serbest metinde `@Ad Soyad` yakalamak üç çözülemez belirsizlik taşır: sınır problemi (`@Ali Veli Bey` — isim nerede biter), çakışma (iki "Mehmet Yılmaz"), sessiz başarısızlık (kullanıcı bildirimin gitmediğini asla öğrenmez). İstemcide listeden tek kişi seçildiği için belirsizlik doğmaz. Konuşma üyesi olmayanlar sessizce elenir (422 değil) — aksi halde `mentions` görülmeyen sohbetin içeriğini bildirim gövdesinde sızdıran bir kanal olurdu |
| 2026-08-24 | Sohbet grubu yetkisi izin matrisine değil `created_by` sahipliğine bağlandı | Ayrı bir `chat.group.manage` izni, Satış Müdürü'nün kendi kurmadığı gruptan üye atayabilmesi demekti. 63 izin sabit kaldı; `chat.use` özelliğin tamamını açar. Kurucu ayrılınca `created_by` en eski üyeye otomatik devreder — aksi halde grup dondurulurdu |
| 2026-08-24 | `type=record` sohbet için ayrı izin açılmadı, görünürlük kaydın kendi `.view` iznine bağlandı | Ayrı izin, matrisi kaydın izniyle senkron tutma yükümlülüğü doğururdu (biri verilip diğeri unutulunca sessiz sızıntı ya da sessiz kör nokta). Kural `presence-record.{type}.{id}` kanalıyla birebir aynı ve `ChannelRegistry::record()`'dan okunur, ikinci kez yazılmaz |
| 2026-08-24 | Mesaj sayfalaması offset değil imleç (`?before=`), çıpa `created_at` değil `id` | `?page=2` istenirken yeni mesaj gelirse pencere kayar ve kullanıcı aynı mesajı iki kez görür ya da birini hiç görmez. `created_at` çıpası aynı saniyeye düşen iki mesajda kararsızlaşır |
| 2026-08-24 | Chat yayınları transaction dışında, commit sonrası yapılır | Faz 7 DealMoveService dersi: içeriden yayınlanırsa istemci henüz commit olmamış satırı isteyip 404 alır; rollback olursa hiç var olmamış mesaj tüm ekranlarda görünür |
| 2026-08-24 | Dosya eki allowlist'i uzantı + sunucu taraflı MIME ikilisiyle doğrulanır, istemcinin `Content-Type` başlığı kullanılmaz | İstemci başlığı sahtelenebilir; MIME dosya içeriğinden `finfo` ile tespit edilir. SVG bilinçli olarak allowlist dışı (XML tabanlı, `<script>` taşıyabilir, inline servis edilirse uygulama origin'inde çalışıp oturum çerezine erişir). Disk adı rastgele UUID, `original_name` disk yolunun parçası olmaz (path traversal); depolama `local` diski (public dışı), servis yalnızca `AttachmentController::show()` üzerinden; sınırlar tek yerde `config/chat.php` |
| 2026-08-24 | Konuşma kanalı aboneliği paylaşılan bir deftere alındı (`hooks/conversationChannel.ts`) | `Echo.leave()` referans saymaz; aynı `private-conversation.{id}` kanalını `useChatSocket` (olaylar) ve `useTyping` (whisper) birlikte dinliyor — biri unmount'ta `leave` çağırsaydı diğerinin dinleyicilerini altından çekerdi ve mesajlar hata vermeden akmayı bırakırdı |
| 2026-08-24 | `attachments:prune-orphans` komutu yazıldı ama `routes/console.php`'ye kaydedilmedi | Toplu silme yapan her komut docs/ENGINEERING-RULES.md §6 uyarınca o çağrıya özel kullanıcı onayı ister; zamanlanmış hale getirmek bu onayı kalıcılaştırmak olurdu. Zamanlama kararı kullanıcıya bırakıldı |

---

## Güncelleme Kuralı

- Her faz sonunda teknik lider bu dosyayı günceller: durum tablosu, "son güncelleme" tarihi, odak/blok/sonraki adım bölümleri ve gerekiyorsa karar günlüğü.
- Şeritler bu dosyayı güncellemez; yalnızca teknik liderin görevlendirdiği dokümantasyon şeridi yazabilir, commit atılmaz; teknik lider commit mesajını hazırlayıp kullanıcıya verir.
