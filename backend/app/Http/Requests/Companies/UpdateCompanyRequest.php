<?php

namespace App\Http\Requests\Companies;

use Illuminate\Foundation\Http\FormRequest;

/**
 * NOT (Faz 13 / F8): `owner_id` bu uçta BİLEREK yazılabilir kaldı.
 *
 * Deal/Lead/Task/Ticket'ta sahip alanı `missing` yapıldı, çünkü oralarda
 * devretme ayrı bir izinle (`*.assign`) korunan ayrı bir uçtur ve genel
 * update ucu o kapıyı baypas ediyordu. Company tarafında böyle bir kapı
 * YOK: izin sözlüğünde `companies.assign` diye bir satır ve `/assign` diye bir
 * uç bulunmuyor (bkz. RolePermissionSeeder). Alanı burada kapatmak, baypas
 * edilecek bir korumayı korumak yerine sahibi belirlemenin TEK yolunu
 * kaldırırdı. Company paylaşılan master data'dır; gerekçenin tamamı
 * CompanyPolicy::update() dokümanındadır.
 */
class UpdateCompanyRequest extends FormRequest
{
    /**
     * Yetkilendirme CompanyController::update() içinde Policy ile yapılır.
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
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'email' => ['sometimes', 'nullable', 'email', 'max:255'],
            'phone' => ['sometimes', 'nullable', 'string', 'max:50'],
            'website' => ['sometimes', 'nullable', 'url', 'max:255'],
            'industry' => ['sometimes', 'nullable', 'string', 'max:255'],
            'address' => ['sometimes', 'nullable', 'string'],
            'city' => ['sometimes', 'nullable', 'string', 'max:255'],
            'country' => ['sometimes', 'nullable', 'string', 'max:255'],
            'employee_count' => ['sometimes', 'nullable', 'integer', 'min:0'],
            'annual_revenue' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'owner_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
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
            'name.required' => 'Firma adı zorunludur.',
            'name.max' => 'Firma adı en fazla :max karakter olabilir.',
            'email.email' => 'Geçerli bir e-posta adresi girin.',
            'email.max' => 'E-posta en fazla :max karakter olabilir.',
            'phone.max' => 'Telefon en fazla :max karakter olabilir.',
            'website.url' => 'Geçerli bir web sitesi adresi girin.',
            'website.max' => 'Web sitesi en fazla :max karakter olabilir.',
            'industry.max' => 'Sektör en fazla :max karakter olabilir.',
            'city.max' => 'Şehir en fazla :max karakter olabilir.',
            'country.max' => 'Ülke en fazla :max karakter olabilir.',
            'employee_count.integer' => 'Çalışan sayısı tam sayı olmalıdır.',
            'employee_count.min' => 'Çalışan sayısı negatif olamaz.',
            'annual_revenue.numeric' => 'Yıllık gelir sayısal olmalıdır.',
            'annual_revenue.min' => 'Yıllık gelir negatif olamaz.',
            'owner_id.exists' => 'Seçilen sahip geçerli değil.',
            'tag_ids.array' => 'Etiketler bir liste olmalıdır.',
            'tag_ids.*.exists' => 'Seçilen etiketlerden biri geçerli değil.',
            'custom_fields.array' => 'Özel alanlar bir liste olmalıdır.',
        ];
    }
}
