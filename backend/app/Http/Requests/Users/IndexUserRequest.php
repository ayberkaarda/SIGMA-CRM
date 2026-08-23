<?php

namespace App\Http\Requests\Users;

use Illuminate\Foundation\Http\FormRequest;

class IndexUserRequest extends FormRequest
{
    /**
     * Yetkilendirme UserController::index() içinde Policy ile yapılır.
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
            'filter.role' => ['nullable', 'string', 'exists:roles,name'],
            'filter.is_active' => ['nullable', 'boolean'],
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
            'filter.role.exists' => 'Seçilen rol filtresi geçerli değil.',
            'filter.is_active.boolean' => 'Aktiflik filtresi true/false olmalıdır.',
        ];
    }

    /**
     * Repository/Service katmanının beklediği düz filtre dizisini üretir.
     *
     * @return array{q: ?string, role: ?string, is_active: mixed, sort: ?string, per_page: int}
     */
    public function filters(): array
    {
        $validated = $this->validated();

        return [
            'q' => $validated['q'] ?? null,
            'role' => $validated['filter']['role'] ?? null,
            'is_active' => $validated['filter']['is_active'] ?? null,
            'sort' => $validated['sort'] ?? null,
            'per_page' => $validated['per_page'] ?? 15,
        ];
    }
}
