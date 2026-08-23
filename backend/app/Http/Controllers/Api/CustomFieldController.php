<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\CustomFieldResource;
use App\Models\CustomField;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CustomFieldController extends Controller
{
    /**
     * @var array<int, string>
     */
    public const ENTITY_TYPES = ['leads', 'contacts', 'companies', 'deals', 'tickets', 'products'];

    /**
     * `GET /api/custom-fields?entity_type=leads` — özel alan tanımı listesi
     * bir lookup/form-şeması ucudur (izin kontrolü yok, kimliği doğrulanmış
     * her kullanıcı erişebilir; asıl veri koruması ilgili modülün kendi
     * `.view` izninde).
     */
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'entity_type' => ['required', Rule::in(self::ENTITY_TYPES)],
        ], [
            'entity_type.required' => 'entity_type parametresi zorunludur.',
            'entity_type.in' => 'Geçersiz entity_type. Geçerli değerler: '.implode('|', self::ENTITY_TYPES),
        ]);

        $fields = CustomField::query()
            ->forEntity($validated['entity_type'])
            ->active()
            ->orderBy('position')
            ->get();

        return response()->json([
            'data' => CustomFieldResource::collection($fields),
        ]);
    }
}
