<?php

namespace App\Http\Requests\Leads;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreLeadRequest extends FormRequest
{
    /**
     * Yetkilendirme LeadController::store() içinde Policy ile yapılır.
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
            'company_name' => ['nullable', 'string', 'max:255'],
            'position' => ['nullable', 'string', 'max:255'],
            'source' => ['required', Rule::in(self::SOURCES)],
            'status' => ['nullable', Rule::in(self::STATUSES)],
            'score' => ['nullable', 'integer', 'between:0,100'],
            'owner_id' => ['nullable', 'integer', 'exists:users,id'],
            'notes' => ['nullable', 'string'],
            'tag_ids' => ['nullable', 'array'],
            'tag_ids.*' => ['integer', 'exists:tags,id'],
            'custom_fields' => ['nullable', 'array'],
        ];
    }

    /**
     * @var array<int, string>
     */
    public const SOURCES = [
        'website', 'referral', 'cold_call', 'email_campaign', 'social_media', 'event', 'other',
    ];

    /**
     * @var array<int, string>
     */
    public const STATUSES = [
        'new', 'contacted', 'qualified', 'unqualified', 'converted',
    ];

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
            'company_name.max' => 'Şirket adı en fazla :max karakter olabilir.',
            'position.max' => 'Pozisyon en fazla :max karakter olabilir.',
            'source.required' => 'Kaynak alanı zorunludur.',
            'source.in' => 'Seçilen kaynak geçerli değil.',
            'status.in' => 'Seçilen durum geçerli değil.',
            'score.integer' => 'Skor tam sayı olmalıdır.',
            'score.between' => 'Skor :min ile :max arasında olmalıdır.',
            'owner_id.exists' => 'Seçilen sahip geçerli değil.',
            'tag_ids.array' => 'Etiketler bir liste olmalıdır.',
            'tag_ids.*.exists' => 'Seçilen etiketlerden biri geçerli değil.',
            'custom_fields.array' => 'Özel alanlar bir liste olmalıdır.',
        ];
    }
}
