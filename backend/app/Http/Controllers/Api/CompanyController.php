<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Companies\IndexCompanyRequest;
use App\Http\Requests\Companies\StoreCompanyRequest;
use App\Http\Requests\Companies\UpdateCompanyRequest;
use App\Http\Resources\CompanyResource;
use App\Http\Resources\TimelineItemResource;
use App\Models\Company;
use App\Services\Companies\CompanyService;
use App\Services\Shared\TimelineBuilder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;

/**
 * İnce controller: yetkilendirme (Policy) + Form Request doğrulaması +
 * CompanyService devri. İş mantığı burada değil, CompanyService içinde yer alır.
 */
class CompanyController extends Controller
{
    public function __construct(
        protected CompanyService $companies,
        protected TimelineBuilder $timelineBuilder,
    ) {}

    public function index(IndexCompanyRequest $request): JsonResponse
    {
        Gate::authorize('viewAny', Company::class);

        $paginator = $this->companies->list($request->filters());

        return response()->json([
            'data' => CompanyResource::collection($paginator->items()),
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

    public function store(StoreCompanyRequest $request): JsonResponse
    {
        Gate::authorize('create', Company::class);

        $company = $this->companies->create($request->validated());

        return (new CompanyResource($company))
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    public function show(Company $company): JsonResponse
    {
        Gate::authorize('view', $company);

        return (new CompanyResource($this->companies->find($company->id)))->response();
    }

    public function update(UpdateCompanyRequest $request, Company $company): JsonResponse
    {
        Gate::authorize('update', $company);

        $company = $this->companies->update($company, $request->validated());

        return (new CompanyResource($company))->response();
    }

    public function destroy(Company $company): JsonResponse
    {
        Gate::authorize('delete', $company);

        $this->companies->delete($company);

        return response()->json(null, Response::HTTP_NO_CONTENT);
    }

    public function timeline(Request $request, Company $company): JsonResponse
    {
        Gate::authorize('view', $company);

        $paginator = $this->timelineBuilder->build($company, [
            'page' => $request->integer('page', 1),
            'per_page' => $request->integer('per_page', 25),
        ]);

        return response()->json([
            'data' => TimelineItemResource::collection($paginator->items()),
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
}
