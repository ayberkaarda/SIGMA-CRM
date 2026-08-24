<?php

namespace App\Http\Requests\Products;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateProductRequest extends FormRequest
{
    /**
     * Yetkilendirme ProductController::update() içinde Policy ile yapılır.
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
        $productId = $this->route('product')?->id;

        return [
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'sku' => ['sometimes', 'nullable', 'string', 'max:255', Rule::unique('products', 'sku')->ignore($productId)],
            'description' => ['sometimes', 'nullable', 'string'],
            'category' => ['sometimes', 'nullable', 'string', 'max:255'],
            'unit_price' => ['sometimes', 'required', 'numeric', 'min:0'],
            'currency' => ['sometimes', 'string', 'size:3'],
            'tax_rate' => ['sometimes', 'numeric', 'min:0', 'max:100'],
            'unit' => ['sometimes', 'string', 'max:50'],
            'stock_quantity' => ['sometimes', 'nullable', 'integer', 'min:0'],
            'is_active' => ['sometimes', 'boolean'],
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
            'name.required' => 'Ürün adı zorunludur.',
            'name.max' => 'Ürün adı en fazla :max karakter olabilir.',
            'sku.unique' => 'Bu SKU zaten kullanılıyor.',
            'unit_price.required' => 'Birim fiyat zorunludur.',
            'unit_price.numeric' => 'Birim fiyat sayısal olmalıdır.',
            'unit_price.min' => 'Birim fiyat negatif olamaz.',
            'currency.size' => 'Para birimi 3 karakterli bir kod olmalıdır (ör. TRY).',
            'tax_rate.numeric' => 'KDV oranı sayısal olmalıdır.',
            'tax_rate.max' => 'KDV oranı en fazla :max olabilir.',
            'stock_quantity.integer' => 'Stok miktarı tam sayı olmalıdır.',
            'stock_quantity.min' => 'Stok miktarı negatif olamaz.',
            'tag_ids.array' => 'Etiketler bir liste olmalıdır.',
            'tag_ids.*.exists' => 'Seçilen etiketlerden biri geçerli değil.',
            'custom_fields.array' => 'Özel alanlar bir liste olmalıdır.',
        ];
    }
}
