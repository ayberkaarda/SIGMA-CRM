<?php

namespace App\Services\Reports;

use App\Models\Activity;
use App\Models\Deal;
use App\Models\PipelineStage;
use App\Models\Task;
use App\Services\Reports\Support\DateRange;
use App\Services\Reports\Support\GroupByPeriod;
use App\Services\Reports\Support\MoneyFormatter;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

/**
 * `/api/dashboard/*` uçlarının veri katmanı. Her metod tek/az sayıda
 * agregasyon sorgusu çalıştırır — sonuçlar PHP tarafında yalnızca
 * BİRLEŞTİRİLİR (merge), asla satır satır toplanmaz (N+1 yok kuralı).
 */
class DashboardService
{
    /**
     * `GET /api/dashboard/kpis` — VERİ SÖZLEŞMESİ'ndeki 8 metrik, her biri
     * `{ value, previous, delta_pct }` zarfında.
     *
     * @return array<string, array{value: mixed, previous: mixed, delta_pct: float|null}>
     */
    public function kpis(DateRange $range, ?int $userId = null): array
    {
        $current = $this->periodMetrics($range->from, $range->to, $userId);
        $previous = $this->periodMetrics($range->previousFrom, $range->previousTo, $userId);

        return [
            'revenue' => [
                'value' => $current['revenue'],
                'previous' => $previous['revenue'],
                'delta_pct' => MoneyFormatter::deltaPct($current['revenue'], $previous['revenue']),
            ],
            'open_deals_count' => [
                'value' => $current['open_deals_count'],
                'previous' => $previous['open_deals_count'],
                'delta_pct' => MoneyFormatter::deltaPctInt($current['open_deals_count'], $previous['open_deals_count']),
            ],
            'open_deals_value' => [
                'value' => $current['open_deals_value'],
                'previous' => $previous['open_deals_value'],
                'delta_pct' => MoneyFormatter::deltaPct($current['open_deals_value'], $previous['open_deals_value']),
            ],
            'conversion_rate' => [
                'value' => $current['conversion_rate'],
                'previous' => $previous['conversion_rate'],
                'delta_pct' => MoneyFormatter::deltaPctInt(
                    (int) round($current['conversion_rate'] * 100),
                    (int) round($previous['conversion_rate'] * 100)
                ),
            ],
            'activities_count' => [
                'value' => $current['activities_count'],
                'previous' => $previous['activities_count'],
                'delta_pct' => MoneyFormatter::deltaPctInt($current['activities_count'], $previous['activities_count']),
            ],
            'won_count' => [
                'value' => $current['won_count'],
                'previous' => $previous['won_count'],
                'delta_pct' => MoneyFormatter::deltaPctInt($current['won_count'], $previous['won_count']),
            ],
            'lost_count' => [
                'value' => $current['lost_count'],
                'previous' => $previous['lost_count'],
                'delta_pct' => MoneyFormatter::deltaPctInt($current['lost_count'], $previous['lost_count']),
            ],
            'avg_deal_size' => [
                'value' => $current['avg_deal_size'],
                'previous' => $previous['avg_deal_size'],
                'delta_pct' => MoneyFormatter::deltaPct($current['avg_deal_size'], $previous['avg_deal_size']),
            ],
        ];
    }

    /**
     * Bir tek dönem (from..to) için ham metrikleri hesaplar. `won`/`lost`
     * `closed_at`'e, `open` `created_at`'e göre pencerelenir — kapanmış bir
     * deal'in ne zaman KAPANDIĞI, açık bir deal'in ne zaman AÇILDIĞI
     * anlamlıdır; "open_deals_count" ömür boyu açık olanların toplamı değil,
     * bu dönemde pipeline'a girmiş ve hâlâ açık olanların sayısıdır.
     *
     * @return array{revenue: string, open_deals_count: int, open_deals_value: string, conversion_rate: float, activities_count: int, won_count: int, lost_count: int, avg_deal_size: string}
     */
    private function periodMetrics(CarbonInterface $from, CarbonInterface $to, ?int $userId): array
    {
        $closedAgg = Deal::query()
            ->whereIn('status', ['won', 'lost'])
            ->whereBetween('closed_at', [$from, $to])
            ->when($userId !== null, fn ($q) => $q->where('owner_id', $userId))
            ->selectRaw('status, COUNT(*) as cnt, COALESCE(SUM(amount), 0) as amt')
            ->groupBy('status')
            ->get()
            ->keyBy('status');

        $wonCount = (int) ($closedAgg->get('won')->cnt ?? 0);
        $lostCount = (int) ($closedAgg->get('lost')->cnt ?? 0);
        $revenue = MoneyFormatter::normalize($closedAgg->get('won')->amt ?? 0);

        $openRow = Deal::query()
            ->where('status', 'open')
            ->whereBetween('created_at', [$from, $to])
            ->when($userId !== null, fn ($q) => $q->where('owner_id', $userId))
            ->selectRaw('COUNT(*) as cnt, COALESCE(SUM(amount), 0) as amt')
            ->first();

        $activitiesCount = Activity::query()
            ->whereBetween('occurred_at', [$from, $to])
            ->when($userId !== null, fn ($q) => $q->where('user_id', $userId))
            ->count();

        return [
            'revenue' => $revenue,
            'open_deals_count' => (int) ($openRow->cnt ?? 0),
            'open_deals_value' => MoneyFormatter::normalize($openRow->amt ?? 0),
            'conversion_rate' => MoneyFormatter::ratio($wonCount, $wonCount + $lostCount),
            'activities_count' => (int) $activitiesCount,
            'won_count' => $wonCount,
            'lost_count' => $lostCount,
            'avg_deal_size' => MoneyFormatter::average($revenue, $wonCount),
        ];
    }

    /**
     * `GET /api/dashboard/funnel` — yalnızca `is_active` aşamalar, position
     * sırasıyla. Sayaç/tutar bu aralıkta AÇILMIŞ (created_at) ve şu an o
     * aşamada duran deal'lardır (kazanılan/kaybedilen aşamalar dahil —
     * huni "şu an nerede duruyorlar" sorusuna cevap verir).
     *
     * @return array<int, array{stage_id: int, stage_name: string, color: ?string, count: int, value: string}>
     */
    public function funnel(DateRange $range): array
    {
        $stages = PipelineStage::query()
            ->active()
            ->orderBy('position')
            ->get(['id', 'name', 'color']);

        $counts = Deal::query()
            ->whereBetween('created_at', [$range->from, $range->to])
            ->whereIn('pipeline_stage_id', $stages->pluck('id'))
            ->selectRaw('pipeline_stage_id, COUNT(*) as cnt, COALESCE(SUM(amount), 0) as amt')
            ->groupBy('pipeline_stage_id')
            ->get()
            ->keyBy('pipeline_stage_id');

        return $stages->map(function (PipelineStage $stage) use ($counts) {
            $row = $counts->get($stage->id);

            return [
                'stage_id' => (int) $stage->id,
                'stage_name' => $stage->name,
                'color' => $stage->color,
                'count' => (int) ($row->cnt ?? 0),
                'value' => MoneyFormatter::normalize($row->amt ?? 0),
            ];
        })->all();
    }

    /**
     * `GET /api/dashboard/revenue-trend` — kazanılan deal'lar, `closed_at`
     * üzerinden `group_by`'a göre dönemlere bölünür. Boş dönemler için
     * sıfır dolgusu YAPILMAZ — VERİ SÖZLEŞMESİ boş sonuçta boş dizi ister,
     * sahte "0 gelir" satırları üretmek yanıltıcı olurdu.
     *
     * @return array<int, array{period: string, revenue: string, won_count: int}>
     */
    public function revenueTrend(DateRange $range, string $groupBy): array
    {
        $groupBy = GroupByPeriod::validate($groupBy);
        $format = GroupByPeriod::dateFormat($groupBy);

        /** @var Collection $rows */
        $rows = Deal::query()
            ->where('status', 'won')
            ->whereBetween('closed_at', [$range->from, $range->to])
            ->selectRaw("DATE_FORMAT(closed_at, '{$format}') as period, COALESCE(SUM(amount), 0) as revenue, COUNT(*) as won_count")
            ->groupBy('period')
            ->orderBy('period')
            ->get();

        return $rows->map(fn ($row) => [
            'period' => (string) $row->period,
            'revenue' => MoneyFormatter::normalize($row->revenue),
            'won_count' => (int) $row->won_count,
        ])->all();
    }

    /**
     * `GET /api/dashboard/recent-activities?limit=` — tüm modüllerdeki en
     * son aktiviteler, tek sorguda `activityable` morphTo ile birlikte
     * (eager load — N+1 yok).
     *
     * @return array<int, array<string, mixed>>
     */
    public function recentActivities(int $limit): array
    {
        $activities = Activity::query()
            ->with(['user:id,name', 'activityable'])
            ->orderByDesc('occurred_at')
            ->limit($limit)
            ->get();

        return $activities->map(function (Activity $activity) {
            return [
                'id' => (int) $activity->id,
                'type' => $activity->type,
                'subject' => $activity->subject,
                'occurred_at' => $activity->occurred_at?->toIso8601String(),
                'user' => $activity->user === null ? null : [
                    'id' => (int) $activity->user->id,
                    'name' => $activity->user->name,
                ],
                'related' => $activity->activityable === null ? null : [
                    'type' => $this->shortSubjectType($activity->activityable_type),
                    'id' => (int) $activity->activityable_id,
                    'label' => $this->relatedLabel($activity->activityable),
                ],
            ];
        })->all();
    }

    /**
     * `GET /api/dashboard/task-summary` — tarih parametresi almaz, DAİMA
     * "şu an" durumunu yansıtan bir anlık görüntüdür (bkz. dashboard route
     * sözleşmesi).
     *
     * `overdue` tanımı `App\Models\Task::scopeOverdue()` ile AYNI kaynağı
     * paylaşır — SLA/görev modülünde "gecikmiş" ne demek sorusunun tek
     * cevabı orada, burada yeniden tanımlanmaz.
     *
     * @return array{open_count: int, overdue_count: int, due_today_count: int, completed_today_count: int, by_priority: array<string, int>}
     */
    public function taskSummary(): array
    {
        $now = CarbonImmutable::now();
        $todayStart = $now->copy()->startOfDay();
        $todayEnd = $now->copy()->endOfDay();

        $openCount = Task::query()
            ->whereNotIn('status', ['completed', 'cancelled'])
            ->count();

        $overdueCount = Task::query()->overdue()->count();

        $dueTodayCount = Task::query()
            ->whereNotIn('status', ['completed', 'cancelled'])
            ->whereBetween('due_at', [$todayStart, $todayEnd])
            ->count();

        $completedTodayCount = Task::query()
            ->where('status', 'completed')
            ->whereBetween('completed_at', [$todayStart, $todayEnd])
            ->count();

        $priorityRows = Task::query()
            ->whereNotIn('status', ['completed', 'cancelled'])
            ->selectRaw('priority, COUNT(*) as cnt')
            ->groupBy('priority')
            ->pluck('cnt', 'priority');

        $byPriority = [];
        foreach (['low', 'normal', 'high', 'urgent'] as $priority) {
            $byPriority[$priority] = (int) ($priorityRows[$priority] ?? 0);
        }

        return [
            'open_count' => $openCount,
            'overdue_count' => $overdueCount,
            'due_today_count' => $dueTodayCount,
            'completed_today_count' => $completedTodayCount,
            'by_priority' => $byPriority,
        ];
    }

    /**
     * `LogRepository::SUBJECT_TYPE_MAP`'e KASITLI OLARAK bağımlı değil —
     * Faz 5'in log modülü ile Faz 11'in dashboard'u farklı sorumluluklar,
     * çapraz bağımlılık iki modülü birbirine kilitler.
     */
    private function shortSubjectType(string $fqcn): string
    {
        $basename = class_basename($fqcn);

        return match ($basename) {
            'Deal' => 'deal',
            'Lead' => 'lead',
            'Contact' => 'contact',
            'Company' => 'company',
            'Ticket' => 'ticket',
            'Task' => 'task',
            'Quote' => 'quote',
            default => Str::snake($basename),
        };
    }

    private function relatedLabel(mixed $model): ?string
    {
        return match (true) {
            isset($model->title) => (string) $model->title,
            isset($model->subject) => (string) $model->subject,
            isset($model->name) => (string) $model->name,
            isset($model->first_name) => trim((string) $model->first_name.' '.(string) ($model->last_name ?? '')),
            default => null,
        };
    }
}
