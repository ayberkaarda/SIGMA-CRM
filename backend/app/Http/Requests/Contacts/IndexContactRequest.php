<?php

namespace App\Http\Requests\Contacts;

use Illuminate\Foundation\Http\FormRequest;

class IndexContactRequest extends FormRequest
{
    /**
     * Yetkilendirme ContactController::index() içinde Policy ile yapılır.
     */
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
            'page' => ['sometimes', 'integer', 'min:1'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
            'sort' => ['sometimes', 'string'],
            'q' => ['nullable', 'string', 'max:255'],
            'filter' => ['sometimes', 'array'],
            'filter.company_id' => ['nullable', 'integer', 'exists:companies,id'],
            'filter.owner_id' => ['nullable', 'integer', 'exists:users,id'],
            'filter.is_primary' => ['nullable', 'boolean'],
            'filter.city' => ['nullable', 'string', 'max:255'],
            'filter.tag_id' => ['nullable', 'integer', 'exists:tags,id'],
            'filter.from' => ['nullable', 'date'],
            'filter.to' => ['nullable', 'date'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'page.integer' => 'Sayfa numarası tam sayı olmalıdır.',
            'page.min' => 'Sayfa numarası en az :min olmalıdır.',
            'per_page.integer' => 'Sayfa başına kayıt sayısı tam sayı olmalıdır.',
            'per_page.min' => 'Sayfa başına kayıt sayısı en az :min olmalıdır.',
            'per_page.max' => 'Sayfa başına kayıt sayısı en fazla :max olabilir.',
            'sort.string' => 'Sıralama parametresi metin olmalıdır.',
            'q.string' => 'Arama terimi metin olmalıdır.',
            'q.max' => 'Arama terimi en fazla :max karakter olabilir.',
            'filter.company_id.exists' => 'Seçilen firma geçerli değil.',
            'filter.owner_id.exists' => 'Seçilen sahip geçerli değil.',
            'filter.is_primary.boolean' => 'Birincil kişi filtresi true/false olmalıdır.',
            'filter.tag_id.exists' => 'Seçilen etiket geçerli değil.',
            'filter.from.date' => 'Başlangıç tarihi geçerli bir tarih olmalıdır.',
            'filter.to.date' => 'Bitiş tarihi geçerli bir tarih olmalıdır.',
        ];
    }

    /**
     * Repository/Service katmanının beklediği düz filtre dizisini üretir.
     *
     * @return array<string, mixed>
     */
    public function filters(): array
    {
        $validated = $this->validated();

        return [
            'q' => $validated['q'] ?? null,
            'company_id' => $validated['filter']['company_id'] ?? null,
            'owner_id' => $validated['filter']['owner_id'] ?? null,
            'is_primary' => $validated['filter']['is_primary'] ?? null,
            'city' => $validated['filter']['city'] ?? null,
            'tag_id' => $validated['filter']['tag_id'] ?? null,
            'from' => $validated['filter']['from'] ?? null,
            'to' => $validated['filter']['to'] ?? null,
            'sort' => $validated['sort'] ?? null,
            'per_page' => $validated['per_page'] ?? 25,
        ];
    }
}
