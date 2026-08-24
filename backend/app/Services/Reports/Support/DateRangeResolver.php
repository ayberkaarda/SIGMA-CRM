<?php

namespace App\Services\Reports\Support;

use Carbon\CarbonImmutable;
use Illuminate\Validation\ValidationException;

/**
 * Rapor/Dashboard uçlarının HEPSİ aynı `?from=Y-m-d&to=Y-m-d` sözleşmesini
 * paylaşır (bkz. Faz 11 endpoint sözleşmesi). Doğrulama + varsayılan +
 * "previous period" hesaplaması tek yerde toplanır ki her controller aynı
 * kuralı yeniden yazmasın.
 *
 * Kurallar:
 *   - İkisi de opsiyonel. Varsayılan: son 30 gün (bugün dahil, 30 gün).
 *   - `to` gün sonu dahildir (endOfDay).
 *   - Geçersiz tarih biçimi veya `from > to` → 422 (ValidationException,
 *     bootstrap/app.php'deki ortak hata zarfına düşer).
 *   - `previous` aralığı: `from`'dan hemen önce başlayan, mevcut aralıkla
 *     AYNI gün sayısına sahip dönem.
 */
class DateRangeResolver
{
    private const DEFAULT_WINDOW_DAYS = 30;

    public function resolve(?string $from, ?string $to): DateRange
    {
        $toDate = $this->parseBoundary('to', $to)?->endOfDay()
            ?? CarbonImmutable::now()->endOfDay();

        $fromDate = $this->parseBoundary('from', $from)?->startOfDay()
            ?? $toDate->subDays(self::DEFAULT_WINDOW_DAYS - 1)->startOfDay();

        if ($fromDate->greaterThan($toDate)) {
            throw ValidationException::withMessages([
                'from' => ['Başlangıç tarihi bitiş tarihinden sonra olamaz.'],
            ]);
        }

        $lengthInDays = $fromDate->diffInDays($toDate) + 1;

        $previousTo = $fromDate->subDay()->endOfDay();
        $previousFrom = $previousTo->subDays($lengthInDays - 1)->startOfDay();

        return new DateRange($fromDate, $toDate, $previousFrom, $previousTo);
    }

    /**
     * `Y-m-d` biçimini KATI şekilde doğrular — Carbon::parse gevşek
     * biçimleri (ör. "2026/08/24", "24 Ağustos") de kabul eder, ama
     * sözleşme yalnızca `Y-m-d`.
     */
    private function parseBoundary(string $field, ?string $value): ?CarbonImmutable
    {
        if ($value === null || $value === '') {
            return null;
        }

        // Carbon 3, ham PHP DateTime::createFromFormat'ın aksine geçersiz
        // biçimlerde `false` DÖNDÜRMEZ, istisna fırlatır (ör. "Trailing
        // data") — bu yüzden try/catch şart, salt `=== false` kontrolü
        // yetersiz kalır.
        try {
            $parsed = CarbonImmutable::createFromFormat('!Y-m-d', $value);
        } catch (\Throwable) {
            $parsed = false;
        }

        if ($parsed === false || $parsed->format('Y-m-d') !== $value) {
            throw ValidationException::withMessages([
                $field => ['Tarih Y-m-d biçiminde olmalıdır (ör. 2026-08-24).'],
            ]);
        }

        return $parsed;
    }
}
