<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Leads\AssignLeadRequest;
use App\Http\Requests\Leads\CheckDuplicatesRequest;
use App\Http\Requests\Leads\ConvertLeadRequest;
use App\Http\Requests\Leads\IndexLeadRequest;
use App\Http\Requests\Leads\StoreLeadRequest;
use App\Http\Requests\Leads\UpdateLeadRequest;
use App\Http\Resources\CompanyResource;
use App\Http\Resources\ContactResource;
use App\Http\Resources\DuplicateCandidateResource;
use App\Http\Resources\LeadResource;
use App\Models\Lead;
use App\Services\Leads\DuplicateDetector;
use App\Services\Leads\LeadService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;

/**
 * İnce controller: yetkilendirme (Policy) + Form Request doğrulaması +
 * LeadService devri. İş mantığı burada değil, LeadService/LeadRepository
 * içinde yer alır.
 */
class LeadController extends Controller
{
    public function __construct(protected LeadService $leads) {}

    public function index(IndexLeadRequest $request): JsonResponse
    {
        Gate::authorize('viewAny', Lead::class);

        $paginator = $this->leads->list($request->filters());

        return response()->json([
            'data' => LeadResource::collection($paginator->items()),
            'meta' => [
                'pagination' => [
                    'current_page' => $paginator->currentPage(),
                    'per_page' => $paginator->perPage(),
                    'total' => $paginator->total(),
                    'last_page' => $paginator->lastPage(),
                ],
            ],
        ]);
    }

    public function store(StoreLeadRequest $request): JsonResponse
    {
        Gate::authorize('create', Lead::class);

        $data = $request->validated();

        // Bilgi amaçlı: istemci daha önce /check-duplicates ile sormamış
        // olabilir. Bu ZORLAYICI değildir, sadece bir uyarıdır. KAYIT
        // OLUŞMADAN ÖNCE çalıştırılmalı — yoksa lead kendi kendisiyle
        // eşleşir ve her oluşturma "duplicate" görünür.
        $warnings = $this->leads->findDuplicateWarnings([
            'email' => $data['email'] ?? null,
            'phone' => $data['phone'] ?? null,
            'first_name' => $data['first_name'] ?? null,
            'last_name' => $data['last_name'] ?? null,
            'company_name' => $data['company_name'] ?? null,
        ]);

        $lead = $this->leads->create($data);

        $meta = [];

        if ($warnings->isNotEmpty()) {
            $meta['duplicate_warning'] = DuplicateCandidateResource::collection($warnings);
        }

        $resource = new LeadResource($lead);

        if (! empty($meta)) {
            $resource = $resource->additional(['meta' => $meta]);
        }

        return $resource->response()->setStatusCode(Response::HTTP_CREATED);
    }

    public function show(Lead $lead): JsonResponse
    {
        Gate::authorize('view', $lead);

        $lead = $this->leads->find($lead->id);

        return (new LeadResource($lead))->response();
    }

    public function update(UpdateLeadRequest $request, Lead $lead): JsonResponse
    {
        Gate::authorize('update', $lead);

        $lead = $this->leads->update($lead, $request->validated());

        return (new LeadResource($lead))->response();
    }

    public function destroy(Lead $lead): JsonResponse
    {
        Gate::authorize('delete', $lead);

        $this->leads->delete($lead);

        return response()->json(null, Response::HTTP_NO_CONTENT);
    }

    public function checkDuplicates(CheckDuplicatesRequest $request): JsonResponse
    {
        Gate::authorize('create', Lead::class);

        $candidates = app(DuplicateDetector::class)
            ->findCandidates($request->duplicateInput(), $request->excludeLeadId());

        return DuplicateCandidateResource::collection($candidates)->response();
    }

    public function convert(ConvertLeadRequest $request, Lead $lead): JsonResponse
    {
        Gate::authorize('convert', $lead);

        $result = $this->leads->convert($lead, $request->validated(), $request->user());

        return response()->json([
            'data' => [
                'contact' => $this->wrapIfResourceExists(ContactResource::class, $result['contact'] ?? null),
                'company' => $this->wrapIfResourceExists(CompanyResource::class, $result['company'] ?? null),
                'deal' => $result['deal'] ?? null,
                'lead' => new LeadResource($this->leads->find($result['lead']->id)),
            ],
        ]);
    }

    public function assign(AssignLeadRequest $request, Lead $lead): JsonResponse
    {
        Gate::authorize('assign', $lead);

        $lead = $this->leads->assign($lead, (int) $request->validated()['owner_id']);

        return (new LeadResource($lead))->response();
    }

    /**
     * C şeridinin `ContactResource`/`CompanyResource`'ı henüz yoksa dönüşüm
     * sonucundaki model yine de düz dizi olarak (`toArray()`) döner —
     * uç 500 vermez, sadece sarmalama daha az zengindir.
     */
    protected function wrapIfResourceExists(string $resourceClass, mixed $model): mixed
    {
        if ($model === null) {
            return null;
        }

        if (class_exists($resourceClass)) {
            return new $resourceClass($model);
        }

        return $model->toArray();
    }
}
