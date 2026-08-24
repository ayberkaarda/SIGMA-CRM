<?php

namespace App\Http\Requests\Deals;

use Illuminate\Foundation\Http\FormRequest;

/**
 * `PATCH /api/deals/{deal}` — Yetkilendirme DealController::update()
 * içinde Policy ile yapılır.
 *
 * `pipeline_stage_id`, `position`, `version`, `status` buradan KESİNLİKLE
 * değiştirilemez: `missing` kuralı bu alanlardan biri gövdede bulunursa
 * (değeri ne olursa olsun) 422 üretir. Aşama değişimi yalnızca
 * `PATCH /api/deals/{deal}/move` üzerinden yapılır (A şeridi) — aksi halde
 * optimistic locking (version) baypas edilir ve Kanban `position` sıralaması
 * bozulur.
 */
class UpdateDealRequest extends FormRequest
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
            'title' => ['sometimes', 'string', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string'],
            'amount' => ['sometimes', 'numeric', 'min:0', 'max:9999999999999.99'],
            'currency' => ['sometimes', 'string', 'size:3'],
            'probability' => ['sometimes', 'nullable', 'integer', 'between:0,100'],
            'expected_close_date' => ['sometimes', 'nullable', 'date'],
            'company_id' => ['sometimes', 'nullable', 'integer', 'exists:companies,id'],
            'contact_id' => ['sometimes', 'nullable', 'integer', 'exists:contacts,id'],
            'owner_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
            'tag_ids' => ['sometimes', 'nullable', 'array'],
            'tag_ids.*' => ['integer', 'exists:tags,id'],
            'custom_fields' => ['sometimes', 'nullable', 'array'],

            // Bu dördü gövdede HİÇ bulunmamalı (değeri boş/null olsa dahi).
            'pipeline_stage_id' => ['missing'],
            'position' => ['missing'],
            'version' => ['missing'],
            'status' => ['missing'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        $stageChangeMessage = 'Aşama, sıralama, versiyon ve durum bu uçtan değiştirilemez. '.
            'Aşama değişimi için PATCH /api/deals/{deal}/move ucunu kullanın.';

        return [
            'title.max' => 'Başlık en fazla :max karakter olabilir.',
            'amount.numeric' => 'Tutar sayısal olmalıdır.',
            'amount.min' => 'Tutar negatif olamaz.',
            'currency.size' => 'Para birimi 3 harfli bir kod olmalıdır (ör. TRY).',
            'probability.between' => 'Olasılık 0 ile 100 arasında olmalıdır.',
            'company_id.exists' => 'Seçilen firma geçerli değil.',
            'contact_id.exists' => 'Seçilen kişi geçerli değil.',
            'owner_id.exists' => 'Seçilen sahip geçerli değil.',
            'tag_ids.array' => 'Etiketler bir liste olmalıdır.',
            'tag_ids.*.exists' => 'Seçilen etiketlerden biri geçerli değil.',
            'custom_fields.array' => 'Özel alanlar bir liste olmalıdır.',
            'pipeline_stage_id.missing' => $stageChangeMessage,
            'position.missing' => $stageChangeMessage,
            'version.missing' => $stageChangeMessage,
            'status.missing' => $stageChangeMessage,
        ];
    }
}
