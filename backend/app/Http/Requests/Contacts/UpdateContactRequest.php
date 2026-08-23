<?php

namespace App\Http\Requests\Contacts;

use Illuminate\Foundation\Http\FormRequest;

class UpdateContactRequest extends FormRequest
{
    /**
     * Yetkilendirme ContactController::update() içinde Policy ile yapılır.
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
            'first_name' => ['sometimes', 'required', 'string', 'max:255'],
            'last_name' => ['sometimes', 'required', 'string', 'max:255'],
            'email' => ['sometimes', 'nullable', 'email', 'max:255'],
            'phone' => ['sometimes', 'nullable', 'string', 'max:50'],
            'mobile' => ['sometimes', 'nullable', 'string', 'max:50'],
            'position' => ['sometimes', 'nullable', 'string', 'max:255'],
            'company_id' => ['sometimes', 'nullable', 'integer', 'exists:companies,id'],
            'owner_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
            'is_primary' => ['sometimes', 'boolean'],
            'address' => ['sometimes', 'nullable', 'string'],
            'city' => ['sometimes', 'nullable', 'string', 'max:255'],
            'country' => ['sometimes', 'nullable', 'string', 'max:255'],
            'notes' => ['sometimes', 'nullable', 'string'],
            'tag_ids' => ['sometimes', 'array'],
            'tag_ids.*' => ['integer', 'exists:tags,id'],
            'custom_fields' => ['sometimes', 'array'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'first_name.required' => 'Ad alanı zorunludur.',
            'first_name.max' => 'Ad en fazla :max karakter olabilir.',
            'last_name.required' => 'Soyad alanı zorunludur.',
            'last_name.max' => 'Soyad en fazla :max karakter olabilir.',
            'email.email' => 'Geçerli bir e-posta adresi girin.',
            'email.max' => 'E-posta en fazla :max karakter olabilir.',
            'phone.max' => 'Telefon en fazla :max karakter olabilir.',
            'mobile.max' => 'Cep telefonu en fazla :max karakter olabilir.',
            'position.max' => 'Pozisyon en fazla :max karakter olabilir.',
            'company_id.exists' => 'Seçilen firma geçerli değil.',
            'owner_id.exists' => 'Seçilen sahip geçerli değil.',
            'is_primary.boolean' => 'Birincil kişi alanı true/false olmalıdır.',
            'city.max' => 'Şehir en fazla :max karakter olabilir.',
            'country.max' => 'Ülke en fazla :max karakter olabilir.',
            'tag_ids.array' => 'Etiketler bir liste olmalıdır.',
            'tag_ids.*.exists' => 'Seçilen etiketlerden biri geçerli değil.',
            'custom_fields.array' => 'Özel alanlar bir liste olmalıdır.',
        ];
    }
}
