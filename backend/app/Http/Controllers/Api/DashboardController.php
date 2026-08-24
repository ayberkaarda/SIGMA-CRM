<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\Reports\FunnelStageResource;
use App\Http\Resources\Reports\KpiCollectionResource;
use App\Http\Resources\Reports\RecentActivityResource;
use App\Http\Resources\Reports\RevenueTrendPointResource;
use App\Http\Resources\Reports\TaskSummaryResource;
use App\Services\Reports\DashboardService;
use App\Services\Reports\Support\DateRangeResolver;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;

/**
 * İnce controller: yetkilendirme (`dashboard.view` — Gate, model policy yok,
 * bkz. App\Http\Controllers\Api\LogController aynı desenin kaynağı) + basit
 * sorgu parametresi ayrıştırma + DashboardService devri. İş mantığı burada
 * DEĞİL, servis katmanındadır.
 *
 * Tarih doğrulaması (`from`/`to` biçimi, `from > to`, varsayılan son 30 gün)
 * her uçta `DateRangeResolver` üzerinden aynı şekilde yapılır; geçersiz
 * girdi `ValidationException` fırlatır ve bootstrap/app.php'deki ortak hata
 * zarfına (422 VALIDATION_ERROR) düşer.
 */
class DashboardController extends Controller
{
    private const DEFAULT_RECENT_ACTIVITIES_LIMIT = 10;

    private const MAX_RECENT_ACTIVITIES_LIMIT = 50;

    public function __construct(
        private readonly DashboardService $dashboard,
        private readonly DateRangeResolver $dateRange,
    ) {}

    public function kpis(Request $request): JsonResponse
    {
        abort_unless(Gate::allows('dashboard.view'), Response::HTTP_FORBIDDEN);

        $range = $this->dateRange->resolve($request->query('from'), $request->query('to'));

        // Sözleşmede `user_id` yok (yalnızca /reports/sales-performance'ta
        // var) — dashboard KPI'ları her zaman şirket geneli.
        return $this->respond((new KpiCollectionResource($this->dashboard->kpis($range)))->resolve());
    }

    public function funnel(Request $request): JsonResponse
    {
        abort_unless(Gate::allows('dashboard.view'), Response::HTTP_FORBIDDEN);

        $range = $this->dateRange->resolve($request->query('from'), $request->query('to'));

        return $this->respond(FunnelStageResource::collection($this->dashboard->funnel($range))->resolve());
    }

    public function revenueTrend(Request $request): JsonResponse
    {
        abort_unless(Gate::allows('dashboard.view'), Response::HTTP_FORBIDDEN);

        $range = $this->dateRange->resolve($request->query('from'), $request->query('to'));
        $groupBy = $request->query('group_by');

        return $this->respond(RevenueTrendPointResource::collection(
            $this->dashboard->revenueTrend($range, is_string($groupBy) ? $groupBy : null)
        )->resolve());
    }

    public function recentActivities(Request $request): JsonResponse
    {
        abort_unless(Gate::allows('dashboard.view'), Response::HTTP_FORBIDDEN);

        $limit = $this->parseLimit($request->query('limit'));

        return $this->respond(RecentActivityResource::collection($this->dashboard->recentActivities($limit))->resolve());
    }

    public function taskSummary(): JsonResponse
    {
        abort_unless(Gate::allows('dashboard.view'), Response::HTTP_FORBIDDEN);

        return $this->respond((new TaskSummaryResource($this->dashboard->taskSummary()))->resolve());
    }

    private function parseLimit(mixed $raw): int
    {
        if (! is_numeric($raw)) {
            return self::DEFAULT_RECENT_ACTIVITIES_LIMIT;
        }

        $limit = (int) $raw;

        return max(1, min($limit, self::MAX_RECENT_ACTIVITIES_LIMIT));
    }

    /**
     * Tek çıkış kapısı — bkz. ReportController::respond() aynı iki gerekçe
     * (data-anahtarı çakışması + JSON_PRESERVE_ZERO_FRACTION).
     */
    private function respond(mixed $data): JsonResponse
    {
        return new JsonResponse(['data' => $data], Response::HTTP_OK, [], JSON_PRESERVE_ZERO_FRACTION);
    }
}
