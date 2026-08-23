<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Contacts\IndexContactRequest;
use App\Http\Requests\Contacts\StoreContactRequest;
use App\Http\Requests\Contacts\UpdateContactRequest;
use App\Http\Resources\ContactResource;
use App\Http\Resources\TimelineItemResource;
use App\Models\Contact;
use App\Services\Contacts\ContactService;
use App\Services\Shared\TimelineBuilder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;

/**
 * İnce controller: yetkilendirme (Policy) + Form Request doğrulaması +
 * ContactService devri. İş mantığı burada değil, ContactService içinde yer alır.
 */
class ContactController extends Controller
{
    public function __construct(
        protected ContactService $contacts,
        protected TimelineBuilder $timelineBuilder,
    ) {}

    public function index(IndexContactRequest $request): JsonResponse
    {
        Gate::authorize('viewAny', Contact::class);

        $paginator = $this->contacts->list($request->filters());

        return response()->json([
            'data' => ContactResource::collection($paginator->items()),
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

    public function store(StoreContactRequest $request): JsonResponse
    {
        Gate::authorize('create', Contact::class);

        $contact = $this->contacts->create($request->validated());

        return (new ContactResource($contact))
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    public function show(Contact $contact): JsonResponse
    {
        Gate::authorize('view', $contact);

        return (new ContactResource($this->contacts->find($contact->id)))->response();
    }

    public function update(UpdateContactRequest $request, Contact $contact): JsonResponse
    {
        Gate::authorize('update', $contact);

        $contact = $this->contacts->update($contact, $request->validated());

        return (new ContactResource($contact))->response();
    }

    public function destroy(Contact $contact): JsonResponse
    {
        Gate::authorize('delete', $contact);

        $this->contacts->delete($contact);

        return response()->json(null, Response::HTTP_NO_CONTENT);
    }

    public function timeline(Request $request, Contact $contact): JsonResponse
    {
        Gate::authorize('view', $contact);

        $paginator = $this->timelineBuilder->build($contact, [
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
