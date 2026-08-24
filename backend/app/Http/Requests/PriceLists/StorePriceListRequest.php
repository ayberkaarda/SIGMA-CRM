<?php

namespace App\Http\Requests\PriceLists;

use Illuminate\Foundation\Http\FormRequest;

class StorePriceListRequest extends FormRequest
{
    /**
     * Yetkilendirme PriceListController::store() içinde Policy ile yapılır.
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
            'name' => ['required', 'string', 'max:255'],
            'code' => ['required', 'string', 'max:100', 'unique:price_lists,code'],
            'description' => ['nullable', 'string'],
            'currency' => ['sometimes', 'string', 'size:3'],
            'is_default' => ['sometimes', 'boolean'],
            'is_active' => ['sometimes', 'boolean'],
            'valid_from' => ['nullable', 'date'],
            'valid_until' => ['nullable', 'date', 'after_or_equal:valid_from'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'name.required' => 'Liste adı zorunludur.',
            'name.max' => 'Liste adı en fazla :max karakter olabilir.',
            'code.required' => 'Liste kodu zorunludur.',
            'code.unique' => 'Bu liste kodu zaten kullanılıyor.',
            'currency.size' => 'Para birimi 3 karakterli bir kod olmalıdır (ör. TRY).',
            'valid_until.after_or_equal' => 'Bitiş tarihi başlangıç tarihinden önce olamaz.',
        ];
    }
}
