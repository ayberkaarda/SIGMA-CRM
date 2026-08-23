<?php

namespace App\Http\Requests\Users;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

class StoreUserRequest extends FormRequest
{
    /**
     * Yetkilendirme UserController::store() içinde Policy ile yapılır.
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
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', Password::min(12)->mixedCase()->numbers()->symbols()->uncompromised()],
            'role' => ['required', 'string', 'exists:roles,name'],
            'department' => ['nullable', 'string', 'max:255'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'name.required' => 'Ad Soyad alanı zorunludur.',
            'name.string' => 'Ad Soyad metin olmalıdır.',
            'name.max' => 'Ad Soyad en fazla :max karakter olabilir.',
            'email.required' => 'E-posta alanı zorunludur.',
            'email.email' => 'Geçerli bir e-posta adresi girin.',
            'email.max' => 'E-posta en fazla :max karakter olabilir.',
            'email.unique' => 'Bu e-posta adresi zaten kullanılıyor.',
            'password.required' => 'Şifre alanı zorunludur.',
            'password.uncompromised' => 'Girilen şifre veri ihlallerinde ifşa olmuş. Lütfen başka bir şifre seçin.',
            'role.required' => 'Rol seçimi zorunludur.',
            'role.exists' => 'Seçilen rol geçerli değil.',
            'department.string' => 'Departman metin olmalıdır.',
            'department.max' => 'Departman en fazla :max karakter olabilir.',
        ];
    }
}
