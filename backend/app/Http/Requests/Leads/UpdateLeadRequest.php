<?php

namespace App\Http\Requests\Leads;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateLeadRequest extends FormRequest
{
    /**
     * Yetkilendirme LeadController::update() içinde Policy ile yapılır
     * (dönüşmüş lead güncellenemez kuralı da orada uygulanır).
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
            'first_name' => ['sometimes', 'string', 'max:255'],
            'last_name' => ['sometimes', 'string', 'max:255'],
            'email' => ['sometimes', 'nullable', 'email', 'max:255'],
            'phone' => ['sometimes', 'nullable', 'string', 'max:50'],
            'company_name' => ['sometimes', 'nullable', 'string', 'max:255'],
            'position' => ['sometimes', 'nullable', 'string', 'max:255'],
            'source' => ['sometimes', Rule::in(StoreLeadRequest::SOURCES)],
            // 'converted' burada KASITLI olarak listede yok: statüyü doğrudan
            // dönüşmüş yapmaya çalışan istek 422 alır — dönüşüm yalnızca
            // POST /api/leads/{lead}/convert üzerinden yapılabilir.
            'status' => ['sometimes', Rule::in(['new', 'contacted', 'qualified', 'unqualified'])],
            'score' => ['sometimes', 'nullable', 'integer', 'between:0,100'],
            'owner_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
            'notes' => ['sometimes', 'nullable', 'string'],
            'tag_ids' => ['sometimes', 'nullable', 'array'],
            'tag_ids.*' => ['integer', 'exists:tags,id'],
            'custom_fields' => ['sometimes', 'nullable', 'array'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'first_name.max' => 'Ad en fazla :max karakter olabilir.',
            'last_name.max' => 'Soyad en fazla :max karakter olabilir.',
            'email.email' => 'Geçerli bir e-posta adresi girin.',
            'email.max' => 'E-posta en fazla :max karakter olabilir.',
            'phone.max' => 'Telefon en fazla :max karakter olabilir.',
            'company_name.max' => 'Şirket adı en fazla :max karakter olabilir.',
            'position.max' => 'Pozisyon en fazla :max karakter olabilir.',
            'source.in' => 'Seçilen kaynak geçerli değil.',
            'status.in' => 'Seçilen durum geçerli değil. Lead\'i dönüştürmek için /convert ucunu kullanın.',
            'score.integer' => 'Skor tam sayı olmalıdır.',
            'score.between' => 'Skor :min ile :max arasında olmalıdır.',
            'owner_id.exists' => 'Seçilen sahip geçerli değil.',
            'tag_ids.array' => 'Etiketler bir liste olmalıdır.',
            'tag_ids.*.exists' => 'Seçilen etiketlerden biri geçerli değil.',
            'custom_fields.array' => 'Özel alanlar bir liste olmalıdır.',
        ];
    }
}
