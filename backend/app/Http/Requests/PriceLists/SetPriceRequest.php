<?php

namespace App\Http\Requests\PriceLists;

use Illuminate\Foundation\Http\FormRequest;

/**
 * `PUT /api/price-lists/{priceList}/products/{product}` — Yetkilendirme
 * PriceListController::setPrice() içinde Policy ile yapılır.
 */
class SetPriceRequest extends FormRequest
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
            'unit_price' => ['required', 'numeric', 'min:0'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'unit_price.required' => 'Birim fiyat zorunludur.',
            'unit_price.numeric' => 'Birim fiyat sayısal olmalıdır.',
            'unit_price.min' => 'Birim fiyat negatif olamaz.',
        ];
    }
}
