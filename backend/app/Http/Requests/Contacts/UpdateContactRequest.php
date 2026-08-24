<?php

namespace App\Http\Requests\Contacts;

use Illuminate\Foundation\Http\FormRequest;

/**
 * NOT (Faz 13 / F8): `owner_id` bu uçta BİLEREK yazılabilir kaldı.
 *
 * Deal/Lead/Task/Ticket'ta sahip alanı `missing` yapıldı, çünkü oralarda
 * devretme ayrı bir izinle (`*.assign`) korunan ayrı bir uçtur ve genel
 * update ucu o kapıyı baypas ediyordu. Contact tarafında böyle bir kapı
 * YOK: izin sözlüğünde `contacts.assign` diye bir satır ve `/assign` diye bir
 * uç bulunmuyor (bkz. RolePermissionSeeder). Alanı burada kapatmak, baypas
 * edilecek bir korumayı korumak yerine sahibi belirlemenin TEK yolunu
 * kaldırırdı. Contact paylaşılan master data'dır; gerekçenin tamamı
 * ContactPolicy::update() dokümanındadır.
 */
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
