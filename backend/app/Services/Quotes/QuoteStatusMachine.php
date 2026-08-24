<?php

namespace App\Services\Quotes;

use App\Models\Quote;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * =============================================================================
 * Teklif durum makinesi
 * =============================================================================
 *
 * Faz 8'deki TicketStatusMachine ile AYNI desen: geçiş tablosu tek sabitte
 * yaşar, karar `lockForUpdate` ile kilitlenmiş satır üzerinde verilir,
 * geçersiz geçiş 422 `INVALID_STATUS_TRANSITION` döner.
 *
 * -----------------------------------------------------------------------------
 * `accepted` / `rejected` / `expired` NEDEN TERMİNAL
 * -----------------------------------------------------------------------------
 * Kabul edilmiş bir teklif, kurulan ticari ilişkinin BELGESİDİR: siparişin,
 * faturanın ve Faz 11'deki gelir raporlarının dayanağı odur. Onu "taslak"a
 * geri çevirebilmek, imzalanmış bir sözleşmeyi geri alıp içeriğini
 * değiştirmeye izin vermek demektir — dönem raporları geriye dönük ve
 * sessizce değişir. Aynı gerekçe reddedilmiş teklif için de geçerlidir:
 * "kazanma oranı" metriği, reddedilen tekliflerin sonradan kabule
 * çevrilebildiği bir sistemde anlamsızdır.
 *
 * Bu, docs/SLA-DESIGN.md §4'ün `closed` durumunu terminal yapan gerekçesinin
 * (kapanmış dönem raporları geriye dönük değişmez kalmalı) teklif tarafındaki
 * karşılığıdır.
 *
 * Müşteri fikir değiştirdiyse doğru hareket geri dönmek değil, YENİ BİR
 * TEKLİF oluşturmaktır: eski belge müşterinin gördüğü hâliyle arşivde kalır,
 * yenisi kendi numarasıyla ve kendi tarihiyle doğar. Teklif geçmişi bir
 * pazarlık kaydıdır; üzerine yazılmamalıdır.
 *
 * -----------------------------------------------------------------------------
 * `sent` NEDEN BU UÇTAN VERİLEMEZ
 * -----------------------------------------------------------------------------
 * `draft → sent` geçişi bu tablonun içindedir ama YALNIZCA
 * `POST /api/quotes/{quote}/send` üzerinden tetiklenir
 * (QuoteService::send()). Gerekçe: gönderim iki ek kontrol taşır — ayrı bir
 * izin (`quotes.send`) ve "kalemi olmayan teklif gönderilemez" kuralı.
 * `PATCH /status`'tan `sent` geçilebilseydi `quotes.update` izni olan
 * herkes `quotes.send` iznini baypas ederek boş bir teklifi müşteriye
 * gönderilmiş sayabilirdi. StatusQuoteRequest bu yüzden `sent`'i kabul
 * etmez.
 */
class QuoteStatusMachine
{
    /**
     * Anahtar = KAYNAK durum, değer = izin verilen HEDEF durumlar.
     * Listelenmeyen her hedef geçersizdir; aynı duruma geçiş de geçersizdir.
     *
     * @var array<string, array<int, string>>
     */
    public const TRANSITIONS = [
        'draft' => ['sent'],
        'sent' => ['accepted', 'rejected', 'expired'],
        'accepted' => [],
        'rejected' => [],
        'expired' => [],
    ];

    /**
     * `PATCH /api/quotes/{quote}/status` ucunun kabul ettiği hedefler.
     * `sent` KASITLI olarak yoktur (sınıf dokümanı).
     *
     * @var array<int, string>
     */
    public const MANUAL_STATUSES = ['accepted', 'rejected', 'expired'];

    /**
     * Tüm geçerli durum adları — Form Request'lerin `Rule::in()` kaynağı.
     *
     * @return array<int, string>
     */
    public static function statuses(): array
    {
        return array_keys(self::TRANSITIONS);
    }

    /**
     * Teklifin artık kalemlerinin/tutarının değiştirilemeyeceği durumlar.
     * `draft` DIŞINDAKİ her şey: teklif bir kez müşteriye gönderildiyse
     * belgedir, çalışma kağıdı değildir.
     *
     * @return array<int, string>
     */
    public static function lockedStatuses(): array
    {
        return array_values(array_diff(self::statuses(), ['draft']));
    }

    /**
     * Durum geçişini uygular ve zaman damgalarını yazar.
     *
     * `lockForUpdate` ŞART: geçiş kararı okunan `status`'e dayanır. Aynı
     * teklife aynı anda gelen iki istek (bir kullanıcı "kabul edildi", bir
     * diğeri "reddedildi" derse) kilit olmadan İKİSİ DE geçerli görünür ve
     * teklif hem `accepted_at` hem `rejected_at` damgası taşır. Kilitle
     * ikinci istek GÜNCEL durumdan doğrulanır ve 422 alır.
     *
     * @throws HttpResponseException 422 INVALID_STATUS_TRANSITION
     */
    public function transition(Quote $quote, string $to): Quote
    {
        return DB::transaction(function () use ($quote, $to) {
            /** @var Quote|null $locked */
            $locked = Quote::query()->whereKey($quote->getKey())->lockForUpdate()->first();

            if ($locked === null) {
                // Kilit alınırken satır silinmiş — route model binding'in
                // 404'üyle aynı sonuç, ama transaction içinde.
                throw new NotFoundHttpException;
            }

            $from = (string) $locked->status;

            if (! in_array($to, self::TRANSITIONS[$from] ?? [], true)) {
                $this->denyTransition($from, $to);
            }

            $this->applyTimestamps($locked, $to);

            $locked->status = $to;
            $locked->save();

            return $locked;
        });
    }

    /**
     * Durum damgaları. `expired` için damga YOKTUR: geçerlilik bitişi zaten
     * `valid_until` kolonunda durur, ikinci bir tarih yazmak aynı bilgiyi iki
     * yerde tutup çelişme riski üretirdi.
     */
    protected function applyTimestamps(Quote $quote, string $to): void
    {
        if ($to === 'sent') {
            $quote->sent_at = now();
        }

        if ($to === 'accepted') {
            $quote->accepted_at = now();
        }

        if ($to === 'rejected') {
            $quote->rejected_at = now();
        }
    }

    /**
     * ROADMAP standardındaki hata zarfı.
     *
     * @throws HttpResponseException
     */
    protected function denyTransition(string $from, string $to): never
    {
        $allowed = self::TRANSITIONS[$from] ?? [];

        if ($from === 'draft' && $to === 'sent') {
            $detail = 'Teklif yalnızca POST /api/quotes/{quote}/send ucundan gönderilebilir.';
        } elseif ($allowed === []) {
            $detail = "\"{$from}\" durumu terminaldir; bu teklifin durumu artık değiştirilemez. ".
                'Değişiklik gerekiyorsa yeni bir teklif oluşturun.';
        } else {
            $detail = "\"{$from}\" durumundan yalnızca şunlara geçilebilir: ".implode(', ', $allowed).'.';
        }

        throw new HttpResponseException(response()->json([
            'errors' => [
                'message' => "Bu durum geçişine izin verilmiyor: {$from} → {$to}.",
                'code' => 'INVALID_STATUS_TRANSITION',
                'fields' => [
                    'status' => [$detail],
                ],
            ],
        ], 422));
    }
}
