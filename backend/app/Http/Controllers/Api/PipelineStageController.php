<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\PipelineStageResource;
use App\Models\Deal;
use App\Models\PipelineStage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

/**
 * `GET /api/pipeline-stages` — `deals.view` izniyle korunur. Ayrı bir
 * PipelineStagePolicy YOK: yetki kararı `Deal` modeli üzerinden DealPolicy'nin
 * `viewAny` metoduna (deals.view) devredilir, çünkü aşamalar yalnızca
 * deal'lerin bağlamı olarak var (kendi başına bir yetki alanı değil).
 */
class PipelineStageController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        Gate::authorize('viewAny', Deal::class);

        // Varsayılan yalnızca is_active=true; ?include_inactive=1 ile hepsi
        // (Ayarlar ekranı için, Faz 10).
        $includeInactive = $request->boolean('include_inactive');

        $query = PipelineStage::query()->withCount('deals')->orderBy('position');

        if (! $includeInactive) {
            $query->where('is_active', true);
        }

        return response()->json([
            'data' => PipelineStageResource::collection($query->get()),
        ]);
    }
}
