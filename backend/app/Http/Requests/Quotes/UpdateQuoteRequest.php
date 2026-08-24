<?php

namespace App\Http\Requests\Quotes;

use App\Services\Quotes\QuoteCalculator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * `PATCH /api/quotes/{quote}` — Yetkilendirme QuoteController::update()
 * içinde Policy ile yapılır.
 *
 * =============================================================================
 * `status` VE TÜM TUTAR ALANLARI BU UÇTAN DEĞİŞTİRİLEMEZ
 * =============================================================================
 * `missing` kuralı, alan gövdede BULUNURSA (değeri null/boş olsa dahi) 422
 * üretir. Gerekçe Faz 7'deki `PATCH /api/deals/{deal}` -> `/move` ve Faz
 * 8'deki `PATCH /api/tickets/{ticket}` -> `/status` ayrımlarının aynısıdır:
 * genel update ucu ham kolon yazımıdır.
 *
 *  - `status` buradan geçirilebilseydi QuoteStatusMachine'in TÜM kontrolleri
 *    (geçiş tablosu, `lockForUpdate`, damgalar) ve `POST /send` ucundaki iki
 *    ek kural (`quotes.send` izni + "kalemi olmayan teklif gönderilemez")
 *    SESSİZCE baypas edilirdi. Bir kullanıcı `quotes.update` iznine sahip
 *    olarak boş bir teklifi "gönderilmiş" yapabilirdi.
 *  - `subtotal`/`tax_amount`/`total` elle yazılabilseydi teklifin toplamı
 *    kalemleriyle çelişebilirdi. Bunlar sunucunun HESAPLADIĞI değerlerdir;
 *    girdi değil, çıktıdırlar.
 *  - `quote_number` belge kimliğidir; değişmesi denetim izinde aynı numaranın
 *    iki farklı belgeyi işaret etmesi demektir.
 *
 * İNDİRİM: GİRDİ `discount_type` + `discount_value`, ÇIKTI
 * `discount_amount` (docs/QUOTE-FINANCIALS.md §5). Kullanıcı "%5 kır" ya da
 * "1.000 TL kır" der; TL karşılığını QuoteCalculator yazar. `discount_amount`
 * doğrudan kabul edilseydi, yüzde tipi bir teklifte kalem eklendiğinde tutar
 * sabit kalır ve "%5" anlamını yitirirdi.
 *
 * İndirim girdisi yalnızca `draft` durumunda değiştirilebilir; `sent` sonrası
 * kilidi QuoteService::assertAmountsEditable() 422 ile uygular. O kural burada
 * DEĞİL servis katmanındadır, çünkü cevabı teklifin O ANKİ durumuna bağlıdır
 * ve bir FormRequest'in bilmediği bir bilgidir (Faz 8'deki
 * StatusTicketRequest ile aynı gerekçe).
 */
class UpdateQuoteRequest extends FormRequest
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
            'title' => ['sometimes', 'string', 'max:255'],
            'deal_id' => ['sometimes', 'nullable', 'integer', 'exists:deals,id'],
            'company_id' => ['sometimes', 'nullable', 'integer', 'exists:companies,id'],
            'contact_id' => ['sometimes', 'nullable', 'integer', 'exists:contacts,id'],
            'valid_until' => ['sometimes', 'nullable', 'date'],
            'discount_type' => ['sometimes', Rule::in(QuoteCalculator::DISCOUNT_TYPES)],
            'discount_value' => ['sometimes', 'numeric', 'min:0', 'max:9999999999999.99'],
            'currency' => ['sometimes', 'string', 'size:3'],
            'notes' => ['sometimes', 'nullable', 'string'],
            'terms' => ['sometimes', 'nullable', 'string'],
            'items' => ['sometimes', 'array', 'max:200'],

            // Bunların HİÇBİRİ gövdede bulunmamalı (değeri boş/null olsa dahi).
            'status' => ['missing'],
            'quote_number' => ['missing'],
            'subtotal' => ['missing'],
            'discount_amount' => ['missing'],
            'tax_amount' => ['missing'],
            'total' => ['missing'],
            'sent_at' => ['missing'],
            'accepted_at' => ['missing'],
            'rejected_at' => ['missing'],
            'created_by' => ['missing'],
            'parent_quote_id' => ['missing'],
            'revision' => ['missing'],
        ], QuoteItemRules::rules());
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        $totalsMessage = 'Teklif toplamları sunucu tarafından kalemlerden hesaplanır ve gönderilemez.';

        return array_merge([
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

            'status.missing' => 'Durum bu uçtan değiştirilemez. '.
                'PATCH /api/quotes/{quote}/status veya POST /api/quotes/{quote}/send ucunu kullanın.',
            'quote_number.missing' => 'Teklif numarası sunucu tarafından üretilir ve değiştirilemez.',
            'subtotal.missing' => $totalsMessage,
            'discount_amount.missing' => 'İndirim tutarı, discount_type + discount_value girdisinden '.
                'sunucu tarafından hesaplanır ve doğrudan gönderilemez.',
            'tax_amount.missing' => $totalsMessage,
            'total.missing' => $totalsMessage,
            'sent_at.missing' => 'Gönderim tarihi sunucu tarafından yazılır.',
            'accepted_at.missing' => 'Kabul tarihi sunucu tarafından yazılır.',
            'rejected_at.missing' => 'Red tarihi sunucu tarafından yazılır.',
            'created_by.missing' => 'Teklifi oluşturan kullanıcı değiştirilemez.',
            'parent_quote_id.missing' => 'Revizyon zinciri yalnızca POST /api/quotes/{quote}/revise ucundan kurulur.',
            'revision.missing' => 'Revizyon numarası sunucu tarafından üretilir.',
        ], QuoteItemRules::messages());
    }
}
