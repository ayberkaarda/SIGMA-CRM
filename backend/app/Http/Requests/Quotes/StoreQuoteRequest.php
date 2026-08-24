<?php

namespace App\Http\Requests\Quotes;

use App\Services\Quotes\QuoteCalculator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * `POST /api/quotes` — Yetkilendirme QuoteController::store() içinde Policy
 * ile yapılır.
 *
 * =============================================================================
 * TOPLAMLAR VE `quote_number` BURADA KASITLI OLARAK YOK
 * =============================================================================
 * `quote_number`, `status`, `created_by`, `sent_at`, `accepted_at`,
 * `rejected_at`, `subtotal`, `tax_amount`, `total` ve kalem `line_total`'ları
 * rules() içinde tanımlı DEĞİLDİR; FormRequest->validated() yalnızca tanımlı
 * anahtarları döndürdüğü için istemci bunları gönderse bile SESSİZCE yok
 * sayılır.
 *
 * Bu, para hesabının tek yerde (QuoteCalculator) kalmasının HTTP tarafındaki
 * güvencesidir: sunucunun kalemlerden hesapladığı toplam ile istemcinin
 * gönderdiği toplam çelişemez, çünkü istemcinin gönderdiği bir toplam yoktur.
 * Her teklif `draft` doğar — başka bir durumda doğması, o duruma ait
 * damgaların (`sent_at` vb.) ve kontrollerin (kalem var mı) hiç çalışmadan
 * kaydın oluşması demek olurdu.
 */
class StoreQuoteRequest extends FormRequest
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
        return array_merge([
            'title' => ['required', 'string', 'max:255'],
            'deal_id' => ['sometimes', 'nullable', 'integer', 'exists:deals,id'],
            'company_id' => ['sometimes', 'nullable', 'integer', 'exists:companies,id'],
            'contact_id' => ['sometimes', 'nullable', 'integer', 'exists:contacts,id'],
            'valid_until' => ['sometimes', 'nullable', 'date'],
            // İndirim GİRDİSİ: tip + ham değer. `discount_amount` (TL
            // karşılığı) bir ÇIKTIDIR ve QuoteCalculator yazar — bu yüzden
            // burada yok; gönderilirse sessizce yok sayılır.
            'discount_type' => ['sometimes', 'nullable', Rule::in(QuoteCalculator::DISCOUNT_TYPES)],
            'discount_value' => ['sometimes', 'nullable', 'numeric', 'min:0', 'max:9999999999999.99'],
            'currency' => ['sometimes', 'nullable', 'string', 'size:3'],
            'notes' => ['sometimes', 'nullable', 'string'],
            'terms' => ['sometimes', 'nullable', 'string'],
            'items' => ['sometimes', 'array', 'max:200'],
        ], QuoteItemRules::rules());
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return array_merge([
            'title.required' => 'Teklif başlığı zorunludur.',
            'title.max' => 'Teklif başlığı en fazla :max karakter olabilir.',
            'deal_id.exists' => 'Seçilen fırsat geçerli değil.',
            'company_id.exists' => 'Seçilen firma geçerli değil.',
            'contact_id.exists' => 'Seçilen kişi geçerli değil.',
            'valid_until.date' => 'Geçerlilik tarihi geçerli bir tarih olmalıdır.',
            'discount_type.in' => 'İndirim tipi yalnızca "amount" veya "percent" olabilir.',
            'discount_value.numeric' => 'İndirim değeri sayısal olmalıdır.',
            'discount_value.min' => 'İndirim değeri negatif olamaz.',
            'currency.size' => 'Para birimi 3 harfli olmalıdır (ör. TRY).',
            'items.array' => 'Kalemler bir liste olmalıdır.',
            'items.max' => 'Bir teklif en fazla :max kalem taşıyabilir.',
        ], QuoteItemRules::messages());
    }
}
