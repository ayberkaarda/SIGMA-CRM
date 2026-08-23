<?php

namespace App\Http\Requests\Users;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

class ResetPasswordRequest extends FormRequest
{
    /**
     * Yetkilendirme UserController::resetPassword() içinde Policy ile yapılır.
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
            'password' => ['required', 'string', Password::min(12)->mixedCase()->numbers()->symbols()->uncompromised()],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'password.required' => 'Şifre alanı zorunludur.',
            'password.uncompromised' => 'Girilen şifre veri ihlallerinde ifşa olmuş. Lütfen başka bir şifre seçin.',
        ];
    }
}
