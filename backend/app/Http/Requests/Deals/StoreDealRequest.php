<?php

namespace App\Http\Requests\Deals;

use Illuminate\Foundation\Http\FormRequest;

/**
 * `POST /api/deals` — Yetkilendirme DealController::store() içinde Policy
 * ile yapılır.
 *
 * `position`, `version` ve `status` KASITLI olarak burada YOK: FormRequest
 * ->validated() yalnızca rules()'ta tanımlı anahtarları döner, dolayısıyla
 * istemci bu alanları gönderse bile sessizce yok sayılır — sunucu tarafında
 * DealService::create() üretir (position: FractionalIndex, version: 1,
 * status: 'open').
 */
class StoreDealRequest extends FormRequest
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
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'amount' => ['nullable', 'numeric', 'min:0', 'max:9999999999999.99'],
            'currency' => ['nullable', 'string', 'size:3'],
            'pipeline_stage_id' => ['nullable', 'integer', 'exists:pipeline_stages,id'],
            'probability' => ['nullable', 'integer', 'between:0,100'],
            'expected_close_date' => ['nullable', 'date'],
            'company_id' => ['nullable', 'integer', 'exists:companies,id'],
            'contact_id' => ['nullable', 'integer', 'exists:contacts,id'],
            'owner_id' => ['nullable', 'integer', 'exists:users,id'],
            'tag_ids' => ['nullable', 'array'],
            'tag_ids.*' => ['integer', 'exists:tags,id'],
            'custom_fields' => ['nullable', 'array'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'title.required' => 'Başlık alanı zorunludur.',
            'title.max' => 'Başlık en fazla :max karakter olabilir.',
            'amount.numeric' => 'Tutar sayısal olmalıdır.',
            'amount.min' => 'Tutar negatif olamaz.',
            'currency.size' => 'Para birimi 3 harfli bir kod olmalıdır (ör. TRY).',
            'pipeline_stage_id.exists' => 'Seçilen aşama geçerli değil.',
            'probability.between' => 'Olasılık 0 ile 100 arasında olmalıdır.',
            'company_id.exists' => 'Seçilen firma geçerli değil.',
            'contact_id.exists' => 'Seçilen kişi geçerli değil.',
            'owner_id.exists' => 'Seçilen sahip geçerli değil.',
            'tag_ids.array' => 'Etiketler bir liste olmalıdır.',
            'tag_ids.*.exists' => 'Seçilen etiketlerden biri geçerli değil.',
            'custom_fields.array' => 'Özel alanlar bir liste olmalıdır.',
        ];
    }
}
