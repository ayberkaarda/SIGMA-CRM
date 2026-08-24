<?php

namespace App\Services\Reports;

use App\Services\Reports\Support\DateRange;
use App\Support\CsvFormulaGuard;
use Illuminate\Support\Facades\Response;
use Illuminate\Validation\ValidationException;
use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Facades\Excel;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * `GET /api/reports/export?report=&format=csv|xlsx&from&to`
 *
 * Faz 5'in export ALTYAPISINI (Maatwebsite\Excel + UTF-8 BOM'lu CSV
 * streamDownload) yeniden kullanır — bkz. App\Services\Logging\
 * LogQueryService::exportCsv()/exportXlsx() aynı desenin kaynağı. İkinci
 * bir export yolu AÇILMADI: fark, kaynağın bir Eloquent sorgusu değil,
 * rapor servislerinin zaten ürettiği (küçük, sayfalanmayan) bir dizi
 * olmasıdır — bu yüzden `FromQuery` yerine `FromArray` kullanılır ve
 * XLSX exportable'ı `app/Exports/` altında ayrı bir sınıf olarak DEĞİL,
 * burada anonim sınıf olarak tanımlanır (Faz 11'in dosya sahipliği
 * `app/Exports/**`'i kapsamıyor).
 */
class ReportExportService
{
    /**
     * @var array<int, string>
     */
    public const SLUGS = ['sales-performance', 'user-performance', 'source-analysis', 'conversion'];

    public function __construct(
        private readonly SalesPerformanceReport $salesPerformance,
        private readonly UserPerformanceReport $userPerformance,
        private readonly SourceAnalysisReport $sourceAnalysis,
        private readonly ConversionReport $conversion,
    ) {}

    public function export(string $slug, DateRange $range, ?int $userId, string $format): StreamedResponse|BinaryFileResponse
    {
        [$headings, $rows] = $this->tabular($slug, $range, $userId);

        // Faz 13/H2 (F1): tek merkezî kapı — CSV/XLSX ayrımından ÖNCE, tüm
        // rapor tiplerini kapsayacak şekilde burada nötrlenir. Bu raporlardaki
        // satırların çoğu sunucu-hesaplı agrega (sayı/oran/tutar) olsa da
        // `user-performance` raporunun `user_name` kolonu bir kullanıcının
        // kendi görünen adını yansıtır (Karar 1'deki tip/içerik ayrımı
        // sayesinde bu ekleme gerçek negatif tutarları — ör.
        // MoneyFormatter::normalize() çıktısı "-1500.00" — BOZMAZ). Diğer
        // kolonlar (ör. `source`) bugün enum/whitelist ile sınırlı olsa da
        // maliyeti sıfıra yakın olan bu tek kapıyı tüm rapor tiplerine
        // uygulamak, ileride eklenecek serbest metin bir kolonun bu korumayı
        // "unutarak" açık kalmasını da baştan engeller.
        $rows = array_map(CsvFormulaGuard::sanitizeRow(...), $rows);

        $filename = sprintf('syncra-rapor-%s-%s.%s', $slug, now()->format('Y-m-d'), $format);

        return $format === 'xlsx'
            ? $this->xlsx($headings, $rows, $filename)
            : $this->csv($headings, $rows, $filename);
    }

    /**
     * @return array{0: array<int, string>, 1: array<int, array<int, mixed>>}
     */
    private function tabular(string $slug, DateRange $range, ?int $userId): array
    {
        return match ($slug) {
            'sales-performance' => $this->fromKeyedRows(
                SalesPerformanceReport::exportHeadings(),
                $this->salesPerformance->run($range, 'day', $userId)['data'],
            ),
            'user-performance' => $this->fromKeyedRows(
                UserPerformanceReport::exportHeadings(),
                $this->userPerformance->run($range)['data'],
            ),
            'source-analysis' => $this->fromKeyedRows(
                SourceAnalysisReport::exportHeadings(),
                $this->sourceAnalysis->run($range)['data'],
            ),
            'conversion' => $this->fromKeyedRows(
                ConversionReport::exportHeadings(),
                [ConversionReport::flattenForExport($this->conversion->run($range))],
            ),
            default => throw ValidationException::withMessages([
                'report' => ['Geçersiz rapor türü. Kabul edilen değerler: '.implode(', ', self::SLUGS).'.'],
            ]),
        };
    }

    /**
     * @param  array<string, string>  $headingMap  key => Türkçe başlık
     * @param  array<int, array<string, mixed>>  $rows
     * @return array{0: array<int, string>, 1: array<int, array<int, mixed>>}
     */
    private function fromKeyedRows(array $headingMap, array $rows): array
    {
        $keys = array_keys($headingMap);
        $headings = array_values($headingMap);

        $flatRows = array_map(
            fn (array $row) => array_map(fn ($key) => $row[$key] ?? null, $keys),
            $rows
        );

        return [$headings, $flatRows];
    }

    private function csv(array $headings, array $rows, string $filename): StreamedResponse
    {
        return Response::streamDownload(function () use ($headings, $rows) {
            $handle = fopen('php://output', 'w');

            // UTF-8 BOM: yoksa Excel Türkçe karakterleri bozar (bkz. LogQueryService).
            fwrite($handle, "\xEF\xBB\xBF");
            fputcsv($handle, $headings);

            foreach ($rows as $row) {
                fputcsv($handle, $row);
            }

            fclose($handle);
        }, $filename, [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }

    private function xlsx(array $headings, array $rows, string $filename): BinaryFileResponse
    {
        $export = new class($headings, $rows) implements FromArray, WithHeadings
        {
            public function __construct(private readonly array $headings, private readonly array $rows) {}

            public function array(): array
            {
                return $this->rows;
            }

            public function headings(): array
            {
                return $this->headings;
            }
        };

        return Excel::download($export, $filename);
    }
}
