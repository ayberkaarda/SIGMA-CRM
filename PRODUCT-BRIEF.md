# ÜRÜN GEREKSİNİMLERİ — Kurumsal Seviye Kapalı Devre CRM Sistemi

> Bu belge ürünün bağlayıcı gereksinim listesidir. UI/UX kararlarında aşağıdaki tasarım ilkeleri esastır.

---

## GÖREV

Mühendislik standartlarında, production-ready, kapalı devre (closed-circuit) bir kurumsal CRM sistemi geliştir. Sistem piyasadaki her işletmenin ihtiyacını karşılayacak kapsamda olacak; eksik hiçbir modül kalmayacak. Tüm UI kararlarında şu tasarım prensipleri uygulanır: tutarlı design token'ları, erişilebilirlik (WCAG 2.1 AA), responsive layout, dark/light mode, micro-interaction'lar ve profesyonel bir dashboard estetiği.

## TEKNOLOJİ YIĞINI (DEĞİŞTİRİLEMEZ)

- **Backend:** Laravel 11 (PHP 8.2+), RESTful API + Laravel Sanctum (SPA authentication)
- **Frontend:** React 18 + Vite, React Router, TanStack Query, Zustand (state), Tailwind CSS
- **Veritabanı:** MySQL (XAMPP üzerinde çalışacak, phpMyAdmin'den tüm tablolar görüntülenebilir olacak — bağlantı ayarları `.env` içinde `127.0.0.1:3306`, kullanıcı `root`, şifre boş, XAMPP varsayılanlarıyla uyumlu)
- **Gerçek zamanlı katman:** Laravel Reverb (WebSocket sunucusu) + Laravel Echo (client) + **Redis** (broadcast driver, queue driver, cache driver ve presence channel state'i için)
- **Kuyruk:** Redis queue + Laravel Horizon (opsiyonel panel)
- Windows/XAMPP ortamında Redis için Memurai veya WSL üzerinden Redis kurulum talimatlarını README'ye yaz.

## MİMARİ GEREKSİNİMLER

1. Katmanlı mimari: Controller → Service → Repository. Business logic controller'da olmayacak.
2. Form Request sınıflarıyla merkezi validasyon.
3. API Resource sınıflarıyla standart JSON response formatı (`data`, `meta`, `errors`).
4. Tüm tablolar migration + seeder + factory ile oluşturulacak. `php artisan migrate --seed` tek komutla demo veri dahil sistemi ayağa kaldıracak.
5. Frontend'te feature-based klasör yapısı (`features/leads`, `features/deals`, `features/chat` ...).
6. Tüm liste ekranlarında server-side pagination, sıralama, filtreleme, arama.

## GÜVENLİK (KRİTİK — HİÇBİRİ ATLANMAYACAK)

- **SQL Injection:** Ham SQL yasak. Yalnızca Eloquent ORM ve parametreli query builder kullanılacak. `DB::raw` kullanımı zorunluysa bind parametreli olacak.
- **XSS:** React zaten escape eder; `dangerouslySetInnerHTML` kesinlikle kullanılmayacak. API'ye gelen tüm inputlar sanitize edilecek, çıktılar encode edilecek. Content-Security-Policy header'ı eklenecek.
- **CSRF:** Sanctum SPA modu + CSRF cookie akışı doğru kurulacak.
- **Auth güvenliği:** Rate limiting (login denemesi 5/dk, sonrasında artan bekleme), bcrypt/argon2 hash, güçlü şifre politikası, oturum süresi ve idle timeout, brute-force loglama.
- **Yetkilendirme:** spatie/laravel-permission ile RBAC. Her endpoint'te Policy/Gate kontrolü. Frontend'te route guard + yetkiye göre UI gizleme (ama asıl kontrol daima backend'de).
- Mass assignment koruması (`$fillable`), IDOR koruması (her kayıt erişiminde sahiplik/yetki kontrolü), dosya yükleme validasyonu (MIME, boyut, rastgele isimlendirme, public dizin dışında saklama).
- Security header'ları: HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy.
- `.env` asla repoya girmeyecek; `.env.example` eksiksiz olacak.

## KAPALI DEVRE ERİŞİM MODELİ

- **Public kayıt (register) YOK.** Sisteme yalnızca "Baş Yetkili" (Super Admin) tarafından oluşturulan hesaplar girebilir.
- İlk kurulumda seeder ile bir Super Admin hesabı oluşturulur (bilgileri README'de).
- Super Admin, panel içindeki **Kullanıcı Yönetimi** modülünden: kullanıcı oluşturur (isim, e-posta, rol, departman, geçici şifre), kullanıcıyı aktif/pasif yapar (pasif kullanıcı anında sistemden atılır — WebSocket ile session revoke), rol ve izinlerini düzenler, şifre sıfırlar.
- Roller (en az): Super Admin, Admin, Satış Müdürü, Satış Temsilcisi, Destek Temsilcisi, İzleyici (read-only). İzinler granüler olacak (ör. `deals.create`, `deals.delete`, `reports.view`, `logs.view`).
- **Giriş paneli:** Modern, tek sayfalık login ekranı. "Beni hatırla", başarısız giriş uyarıları, hesap kilitleme bildirimi. Şifremi unuttum akışı yalnızca admin onaylı çalışır (kapalı devre mantığına uygun).

## AKTİVİTE & DENETİM LOG SİSTEMİ (ÇOK DETAYLI)

Ayrı bir **Loglar** sayfası olacak (sadece `logs.view` iznine sahip roller görebilir). Loglanacaklar:

1. **Oturum logları:** login/logout zamanı, IP, user-agent, cihaz/tarayıcı, toplam oturum süresi, başarısız giriş denemeleri.
2. **Sayfa gezinme logları:** kullanıcının hangi sayfaya ne zaman girdiği, o sayfada ne kadar kaldığı (frontend'te route change + heartbeat ile ölçülüp API'ye gönderilecek).
3. **Aksiyon logları (audit trail):** her CRUD işlemi — kim, ne zaman, hangi kaydı, eski değer → yeni değer (JSON diff olarak sakla). spatie/laravel-activitylog kullan veya eşdeğerini yaz.
4. **Gerçek zamanlı izleme:** Log sayfasında canlı akış sekmesi — Redis + WebSocket ile yeni loglar anlık düşer. Ayrıca "şu an online kullanıcılar" paneli (presence channel): kim online, hangi sayfada, ne kadar süredir.
5. Filtreleme: kullanıcı, tarih aralığı, aksiyon tipi, modül. CSV/Excel export.

## CRM ÇEKİRDEK MODÜLLERİ (TAMAMI YAPILACAK)

1. **Dashboard:** KPI kartları (aylık gelir, açık fırsatlar, dönüşüm oranı, aktivite sayısı), satış hunisi grafiği, gelir trendi, son aktiviteler, görev özeti. Grafikler Recharts ile. Veriler WebSocket ile canlı güncellenir.
2. **Müşteri Adayları (Leads):** kaynak takibi, lead skorlama, atama, toplu import (CSV), lead → müşteri dönüştürme, çift kayıt (duplicate) tespiti.
3. **Kişiler & Firmalar (Contacts/Companies):** ilişkili kayıtlar, iletişim geçmişi zaman çizelgesi, etiketleme, özel alanlar (custom fields).
4. **Fırsatlar & Pipeline (Deals):** sürükle-bırak Kanban pipeline (dnd-kit), aşama bazlı olasılık ve tutar, kazanma/kaybetme nedenleri, tahmini kapanış tarihi. Kanban'daki her hareket WebSocket ile diğer kullanıcılara anlık yansır.
5. **Görevler & Aktiviteler:** görev atama, hatırlatıcılar, takvim görünümü, arama/toplantı/e-posta aktivite kayıtları.
6. **Destek Talepleri (Tickets):** öncelik, SLA sayacı, atama, durum akışı, iç notlar.
7. **Ürünler & Teklifler:** ürün kataloğu, fiyat listeleri, teklif oluşturma (PDF çıktısı), teklif → fırsat bağlantısı.
8. **Raporlar:** satış performansı, kullanıcı performansı, kaynak analizi, dönüşüm raporları; tarih filtreli, export edilebilir.
9. **Bildirimler:** uygulama içi bildirim merkezi — atamalar, mention'lar, deal güncellemeleri Redis + WebSocket ile anlık push.
10. **Ayarlar:** şirket profili, pipeline aşamaları düzenleme, özel alan yönetimi, e-posta şablonları, rol/izin matrisi.

## GERÇEK ZAMANLI CHAT MODÜLÜ (WebSocket + Redis)

- Laravel Reverb üzerinden birebir (DM) ve grup/kanal sohbetleri.
- Özellikler: anlık mesaj iletimi, **yazıyor... göstergesi** (whisper event), okundu bilgisi (çift tik mantığı), online/offline/son görülme (presence channel), mesajda dosya/görsel paylaşımı, mesaj arama, kullanıcı mention (@), okunmamış sayaçları.
- Bir kayda bağlı sohbet: deal veya ticket detayında ekip içi yorum/sohbet paneli — o kaydı açık tutan herkes değişiklikleri ve mesajları canlı görür.
- Mesajlar MySQL'de saklanır; online state ve event fan-out Redis'te tutulur.

## VERİTABANI

- Tüm tablolar anlamlı isimlerle, foreign key'ler, index'ler ve soft delete ile tasarlanacak. phpMyAdmin'de incelenebilir temiz bir şema olacak.
- Beklenen tablolar (asgari): users, roles, permissions, leads, contacts, companies, deals, pipeline_stages, tasks, activities, tickets, products, quotes, quote_items, messages, conversations, conversation_user, notifications, activity_logs, page_visit_logs, session_logs, custom_fields, custom_field_values, tags, taggables, attachments, settings.
- ER diyagramını README'ye (mermaid) ekle.

## TESLİMAT & ÇALIŞTIRMA

1. Monorepo yapısı: `/backend` (Laravel), `/frontend` (React).
2. README'de XAMPP kurulum adımları: Apache+MySQL başlatma, veritabanı oluşturma, `.env` ayarı, `composer install`, `php artisan migrate --seed`, `php artisan reverb:start`, `php artisan queue:work`, `npm install && npm run dev`. Redis'in Windows'ta kurulumu (Memurai/WSL) adım adım.
3. Seed edilmiş demo verilerle sistem açılır açılmaz dolu ve test edilebilir olacak.
4. Kritik akışlar için Feature testleri yaz (auth, yetki, deal CRUD, log kaydı, chat mesajı).
5. Kod boyunca kısa ve anlamlı yorumlar; API endpoint listesini README'ye ekle.

## ÇALIŞMA ŞEKLİN

- Önce kısa bir plan çıkar (modül sırası), sonra adım adım uygula. Her modül bittiğinde çalışır durumda bırak.
- Hiçbir modülü "sonra eklenir" diye atlama; yukarıdaki her madde teslimat kapsamındadır.
- Şu tasarım prensipleri her ekranda uygulanır: boş durumlar (empty states), yükleme iskeletleri (skeleton), hata durumları, toast bildirimleri, klavye erişilebilirliği.
