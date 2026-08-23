<?php

namespace App\Http\Requests\Contacts;

use Illuminate\Foundation\Http\FormRequest;

class StoreContactRequest extends FormRequest
{
    /**
     * Yetkilendirme ContactController::store() içinde Policy ile yapılır.
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
            'first_name' => ['required', 'string', 'max:255'],
            'last_name' => ['required', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'mobile' => ['nullable', 'string', 'max:50'],
            'position' => ['nullable', 'string', 'max:255'],
            'company_id' => ['nullable', 'integer', 'exists:companies,id'],
            'owner_id' => ['nullable', 'integer', 'exists:users,id'],
            'is_primary' => ['sometimes', 'boolean'],
            'address' => ['nullable', 'string'],
            'city' => ['nullable', 'string', 'max:255'],
            'country' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string'],
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
