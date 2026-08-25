# Mühendislik Kuralları

Oturum başında `docs/PROGRESS.md` okunur.

## 1. Roller

- **Teknik lider:** Planlama, karar verme, kod inceleme, hata teşhisi ve mimari kararlar. Ana orkestrasyon buradadır.
- **Deneyimli şerit:** Yalnızca en kritik/riskli parçalar için ikinci bir "ağır" katman. Teknik liderle paralel çalışabilir; genellikle teknik lider zaten bir kritik parçada meşgulken eşdeğer kritiklikte ikinci bir parça çıktığında devreye girer.
- **Standart şerit:** Toplu görev yürütme, standart kod üretimi ve scripting. Varsayılan ve en sık kullanılan katman.

## 2. Teknik lider vs. şeritler

- **Teknik lider:** Planlama, karar verme, kod inceleme ve hata teşhisinden sorumludur.
  - **Kural:** Teknik lider üretim dosyalarını doğrudan değiştirmez.
  - **Kural:** Tüm `git commit` işlemleri yalnızca teknik lider tarafından yürütülür.
- **Şeritler:** Tüm doğrudan dosya değişiklikleri ve çok adımlı yürütme görevleri şeritlere devredilir.
- **Paralellik:** 2 veya daha fazla bağımsız görev varsa, teknik lider boşta kalmasın diye aynı dalgada paralel devredilir.

## 3. Şerit seçimi

Her iş için katman açıkça belirlenir; devralma yoktur:

- **Deneyimli şerit** — _Şunlar için:_ Sadece gerçekten en üst düzey kritiklikte, yanlış kararın maliyetinin çok yüksek olduğu ikinci bir zor parça — teknik lider zaten bir kritik parçada çalışırken paralel ihtiyaç duyulan ek "ağır" iş. Nadiren kullanılır.
- **Standart şerit** — _Geri kalan her şey için:_ Boilerplate ve CRUD kodu, mekanik güncellemeler (rename, config), test iskeleti, dokümantasyon ve terminal script yürütme.
- **Varsayılan standart şerittir.** Deneyimli şerit, yalnızca teknik lider zaten meşgulken ikinci bir kritik parçanın paralel yürütülmesi gerektiğinde seçilir; şüphede kalınırsa standart şeritle başlanır.

## 4. Kodlama işlerinde iş bölümü (üç katman)

- **Varsayılan:** 2 veya daha fazla ayrılabilir parçası olan her kodlama işinde teknik lider işi böler ve gereken şeritleri **aynı dalgada** paralel olarak başlatır.
- **Bölme kuralı:**
  - Teknik lider en kritik/merkezi kararı kendisi verir veya doğrudan en zor parçayı üstlenir.
  - Aynı anda ikinci bir eşit derecede kritik/riskli parça varsa, bu deneyimli bir şeride verilir (teknik liderle paralel).
  - Geniş/mekanik/hacimli parça(lar) standart şeritlere verilir.
- **File ownership:** Her şeride açık ve çakışmayan bir dosya listesi verilir. Aynı turda iki şeride asla aynı dosya atanmaz.
- **Contract first:** Parçalar birbirine dokunuyorsa, teknik lider arayüzü (fonksiyon imzaları, tipler, endpoint'ler) dağıtımdan **önce** tanımlar; hiçbir şerit tahmin yürütmek zorunda kalmaz.
- **Sequencing:** Bir parça gerçekten diğerinin çıktısına bağlıysa sahte paralellik yapılmaz — önce bloklayan parça bitirilir, sonra bağımlı parçalar dağıtılır.
- **Integration:** Teknik lider tüm çıktıları inceler, çakışmaları çözer ve commit eder.

## 5. Hata yönetimi ve yineleme

- Teknik lider tüm şerit çıktılarını inceler.
- Hata bulunursa veya düzeltme gerekiyorsa **yeni bir şerit açılmaz.** Bağlamı korumak için düzeltme talimatı **aynı** şeride iletilir.
- Bir şerit aynı görevde iki kez başarısız olursa, o parça hata bağlamıyla birlikte deneyimli bir şeride devredilir. O da başarısız olursa teknik lider parçayı kendi üstlenir.
- **Kural:** Şeritler Git komutu çalıştırmaz. Versiyon kontrolü kesinlikle teknik liderin görevidir.
- **Kural:** Push sonrası `gh run list -L1` / `gh run watch <run-id> --exit-status` ile koşum sonucu görülmeden görev "tamamlandı" ilan edilemez.

## 6. Yıkıcı komut güvenliği

- `db:seed`, `db:reset`, `db:drop`, `delete_all`, `destroy_all`, `TRUNCATE` veya eşdeğeri herhangi bir toplu silme/reset işlemi içeren komut — teknik lider veya herhangi bir şerit tarafından — o çağrıya özel açık kullanıcı onayı olmadan çalıştırılamaz.
- Bu, repoda zaten var olan dosya/script'ler için de geçerlidir — bir script'in var olması onu çalıştırma onayı değildir. Etkileri bilinmiyorsa çalıştırmadan önce script içeriği okunur.
- Şeritler bu tür komutları `git` yıkıcı işlemleriyle aynı onay seviyesinde ele alır (bkz. §2/§5) ve doğrudan çalıştırmak yerine teknik lidere sorar.
- **Zamanlama kararları kullanıcıya bırakılır.** Toplu silme yapan bir komut yazılabilir, ama `routes/console.php`'ye kaydedilip zamanlanması ayrı ve açık bir karardır (bkz. `attachments:prune-orphans`).
