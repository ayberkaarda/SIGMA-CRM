<?php

namespace App\Http\Requests\Users;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateUserRequest extends FormRequest
{
    /**
     * Yetkilendirme UserController::update() içinde Policy ile yapılır.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Sözleşmedeki PATCH /api/users/{user} gövdesi: { name?, email?, role?, department? }.
     * Şifre değişimi ayrı bir uç (POST .../reset-password) üzerinden yapılır.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'string', 'max:255'],
            'email' => [
                'sometimes',
                'email',
                'max:255',
                // unique kuralı ham tabloyu sorgular; soft-deleted kayıtlar da hesaba katılır.
                Rule::unique('users', 'email')->ignore($this->route('user')),
            ],
            'role' => ['sometimes', 'string', 'exists:roles,name'],
            'department' => ['sometimes', 'nullable', 'string', 'max:255'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'name.string' => 'Ad Soyad metin olmalıdır.',
            'name.max' => 'Ad Soyad en fazla :max karakter olabilir.',
            'email.email' => 'Geçerli bir e-posta adresi girin.',
            'email.max' => 'E-posta en fazla :max karakter olabilir.',
            'email.unique' => 'Bu e-posta adresi zaten kullanılıyor.',
            'role.exists' => 'Seçilen rol geçerli değil.',
            'department.string' => 'Departman metin olmalıdır.',
            'department.max' => 'Departman en fazla :max karakter olabilir.',
        ];
    }
}
