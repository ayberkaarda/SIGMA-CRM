<?php

namespace App\Services\Reports;

use App\Models\Deal;
use App\Services\Reports\Support\DateRange;
use App\Services\Reports\Support\GroupByPeriod;
use App\Services\Reports\Support\MoneyFormatter;

/**
 * `GET /api/reports/sales-performance?from&to&group_by=&user_id=`
 *
 * Kazanılan/kaybedilen deal'ları `closed_at` üzerinden `group_by` dönemine
 * böler. `user_id` verilirse `deals.owner_id` ile filtrelenir (raporun
 * tekil bir satıcının performansını izole etmesi için).
 */
class SalesPerformanceReport
{
    /**
     * @return array{from: string, to: string, group_by: string, data: array<int, array<string, mixed>>, totals: array<string, mixed>}
     */
    public function run(DateRange $range, string $groupBy, ?int $userId = null): array
    {
        $groupBy = GroupByPeriod::validate($groupBy);
        $format = GroupByPeriod::dateFormat($groupBy);

        $rows = Deal::query()
            ->whereIn('status', ['won', 'lost'])
            ->whereBetween('closed_at', [$range->from, $range->to])
            ->when($userId !== null, fn ($q) => $q->where('owner_id', $userId))
            ->selectRaw("DATE_FORMAT(closed_at, '{$format}') as period, status, COUNT(*) as cnt, COALESCE(SUM(amount), 0) as amt")
            ->groupBy('period', 'status')
            ->orderBy('period')
            ->get();

        $byPeriod = [];
        foreach ($rows as $row) {
            $period = (string) $row->period;
            $byPeriod[$period] ??= ['won_count' => 0, 'lost_count' => 0, 'revenue' => '0.00'];

            if ($row->status === 'won') {
                $byPeriod[$period]['won_count'] = (int) $row->cnt;
                $byPeriod[$period]['revenue'] = MoneyFormatter::normalize($row->amt);
            } else {
                $byPeriod[$period]['lost_count'] = (int) $row->cnt;
            }
        }

        $data = [];
        foreach ($byPeriod as $period => $metrics) {
            $data[] = [
                'period' => $period,
                'revenue' => $metrics['revenue'],
                'won_count' => $metrics['won_count'],
                'lost_count' => $metrics['lost_count'],
                'deals_count' => $metrics['won_count'] + $metrics['lost_count'],
            ];
        }

        $totalsRow = Deal::query()
            ->whereIn('status', ['won', 'lost'])
            ->whereBetween('closed_at', [$range->from, $range->to])
            ->when($userId !== null, fn ($q) => $q->where('owner_id', $userId))
            ->selectRaw('status, COUNT(*) as cnt, COALESCE(SUM(amount), 0) as amt')
            ->groupBy('status')
            ->get()
            ->keyBy('status');

        $wonCount = (int) ($totalsRow->get('won')->cnt ?? 0);
        $lostCount = (int) ($totalsRow->get('lost')->cnt ?? 0);

        return [
            'from' => $range->from->toDateString(),
            'to' => $range->to->toDateString(),
            'group_by' => $groupBy,
            'data' => $data,
            'totals' => [
                'revenue' => MoneyFormatter::normalize($totalsRow->get('won')->amt ?? 0),
                'won_count' => $wonCount,
                'lost_count' => $lostCount,
                'deals_count' => $wonCount + $lostCount,
            ],
        ];
    }

    /**
     * Export akışı için satır/başlık şekli — JSON `data` dizisiyle aynı
     * anahtarları kullanır (bkz. ReportExportService).
     *
     * @return array<string, string>
     */
    public static function exportHeadings(): array
    {
        return [
            'period' => 'Dönem',
            'revenue' => 'Gelir',
            'won_count' => 'Kazanılan',
            'lost_count' => 'Kaybedilen',
            'deals_count' => 'Toplam',
        ];
    }
}
