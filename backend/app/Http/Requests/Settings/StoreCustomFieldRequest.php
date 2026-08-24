<?php

namespace App\Http\Requests\Settings;

use App\Http\Controllers\Api\CustomFieldController;
use App\Services\Settings\CustomFieldService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * `POST /api/settings/custom-fields` — yetkilendirme controller'da
 * (`settings.manage`).
 *
 * `key` PROGRAMATİK ANAHTARDIR ve `custom_field_values` satırları ona
 * bağlanır; bu yüzden burada dar bir biçime zorlanır (`^[a-z][a-z0-9_]*$`).
 * Serbest bırakılsaydı ("Bütçe Aralığı") anahtar, hem URL'de hem form
 * şemasında hem de dışa aktarma sütun başlığında kaçış gerektiren bir
 * dizeye dönüşürdü. Görünen ad zaten `name` alanındadır.
 *
 * `position` verilmezse aynı `entity_type` içindeki en büyük değerin bir
 * fazlası atanır (CustomFieldService::create).
 */
class StoreCustomFieldRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'entity_type' => ['required', Rule::in(CustomFieldController::ENTITY_TYPES)],
            'name' => ['required', 'string', 'max:255'],
            'key' => [
                'required', 'string', 'max:255', 'regex:/^[a-z][a-z0-9_]*$/',
                Rule::unique('custom_fields', 'key')->where(
                    fn ($query) => $query->where('entity_type', $this->input('entity_type'))
                ),
            ],
            'type' => ['required', Rule::in(CustomFieldService::TYPES)],
            // `select` / `multiselect` dışında anlamsızdır; servis o
            // durumlarda alanı null'a çeker.
            'options' => ['sometimes', 'nullable', 'array', 'max:100'],
            'options.*' => ['string', 'max:255'],
            'is_required' => ['sometimes', 'boolean'],
            'position' => ['sometimes', 'integer', 'min:0'],

            'is_active' => ['missing'],
        ];
    }

    /**
     * @return array<int, callable>
     */
    public function after(): array
    {
        return [
            function ($validator): void {
                if ($validator->errors()->isNotEmpty()) {
                    return;
                }

                if (! in_array($this->input('type'), CustomFieldService::OPTION_TYPES, true)) {
                    return;
                }

                if ($this->input('options') === null || $this->input('options') === []) {
                    $validator->errors()->add(
                        'options',
                        'Seçim tipindeki bir alan en az bir seçenek içermelidir.'
                    );
                }
            },
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'entity_type.required' => 'entity_type zorunludur.',
            'entity_type.in' => 'Geçersiz entity_type. Geçerli değerler: '.implode('|', CustomFieldController::ENTITY_TYPES),
            'name.required' => 'Alan adı zorunludur.',
            'key.required' => 'Alan anahtarı (key) zorunludur.',
            'key.regex' => 'Anahtar küçük harfle başlamalı; yalnızca küçük harf, rakam ve alt çizgi içerebilir (ör. "butce_araligi").',
            'key.unique' => 'Bu kayıt tipinde aynı anahtara sahip bir alan zaten var.',
            'type.required' => 'Alan tipi zorunludur.',
            'type.in' => 'Geçersiz alan tipi. Geçerli değerler: '.implode('|', CustomFieldService::TYPES),
            'options.array' => 'Seçenekler bir liste olmalıdır.',
            'is_active.missing' => 'Yeni alan daima aktif oluşturulur.',
        ];
    }
}
