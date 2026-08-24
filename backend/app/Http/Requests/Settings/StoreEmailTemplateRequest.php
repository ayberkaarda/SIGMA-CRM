<?php

namespace App\Http\Requests\Settings;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * `POST /api/settings/email-templates` — yetkilendirme controller'da
 * (`settings.manage`).
 *
 * `variables` GÖNDERİLMEZSE `subject` + `body_html` içindeki
 * `{{ degisken }}` yer tutucularından TÜRETİLİR (bkz.
 * EmailTemplateService::extractVariables). Gerekçe: listeyi elle tutmak,
 * metin değiştikçe listeyi güncellemeyi unutmak demektir — önizleme ekranı
 * o zaman şablonda gerçekten geçen bir değişkeni sormaz ve çıktıda ham
 * `{{ ... }}` görünür. Elle gönderilirse olduğu gibi saklanır (metinde
 * henüz geçmeyen ama planlanan bir değişken tanımlanabilsin diye).
 *
 * Bu fazda E-POSTA GÖNDERİLMEZ: şablon yalnızca saklanır ve önizlenir.
 */
class StoreEmailTemplateRequest extends FormRequest
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
            'key' => [
                'required', 'string', 'max:255', 'regex:/^[a-z][a-z0-9_]*$/',
                Rule::unique('email_templates', 'key'),
            ],
            'name' => ['required', 'string', 'max:255'],
            'subject' => ['required', 'string', 'max:255'],
            'body_html' => ['required', 'string', 'max:65535'],
            'variables' => ['sometimes', 'nullable', 'array', 'max:100'],
            'variables.*' => ['string', 'max:255'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'key.required' => 'Şablon anahtarı (key) zorunludur.',
            'key.regex' => 'Anahtar küçük harfle başlamalı; yalnızca küçük harf, rakam ve alt çizgi içerebilir (ör. "teklif_gonderildi").',
            'key.unique' => 'Bu anahtara sahip bir şablon zaten var.',
            'name.required' => 'Şablon adı zorunludur.',
            'subject.required' => 'E-posta konusu zorunludur.',
            'subject.max' => 'E-posta konusu en fazla :max karakter olabilir.',
            'body_html.required' => 'Şablon gövdesi zorunludur.',
            'variables.array' => 'Değişken listesi bir dizi olmalıdır.',
        ];
    }
}
