<?php

namespace Tests\Feature;

use App\Models\Company;
use App\Models\Contact;
use App\Models\Quote;
use App\Models\QuoteItem;
use App\Models\Setting;
use App\Models\User;
use App\Services\Quotes\QuotePdfService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Smalot\PdfParser\Parser as PdfTextParser;
use Tests\TestCase;

/**
 * Faz 9/C — teklif PDF çıktısı.
 *
 * En kritik test bu dosyadaki `test_turkish_characters_and_lira_symbol_survive_pdf_roundtrip`
 * testidir: dompdf'in varsayılan font eşlemesi çekirdek PDF fontlarına
 * (Helvetica/Times) düşerse Türkçe glyph'ler boş kutu/yanlış karakter olarak
 * çıkar ve bunu HİÇBİR birim test yakalamaz — yalnızca üretilen PDF'ten metni
 * GERİ OKUYUP karşılaştırmak yakalar. Bu test o yüzden kalıcıdır, aşama
 * kapısının tek seferlik kanıtı değildir.
 */
class QuotePdfTest extends TestCase
{
    use RefreshDatabase;

    private function makeQuoteWithItems(int $itemCount = 3, array $quoteOverrides = []): Quote
    {
        $creator = User::factory()->create(['name' => 'Ayşe Yılmaz']);
        $company = Company::factory()->create([
            'name' => 'Işık Teknoloji A.Ş.',
            'address' => 'Maslak, İstanbul',
        ]);
        $contact = Contact::factory()->create([
            'company_id' => $company->id,
            'first_name' => 'Şükrü',
            'last_name' => 'Öztürk',
        ]);

        $quote = Quote::factory()->create(array_merge([
            'company_id' => $company->id,
            'contact_id' => $contact->id,
            'created_by' => $creator->id,
        ], $quoteOverrides));

        $subtotal = 0;
        $tax = 0;

        for ($i = 0; $i < $itemCount; $i++) {
            $item = QuoteItem::factory()->create([
                'quote_id' => $quote->id,
                'position' => $i,
            ]);
            $subtotal += (float) $item->line_total;
            $tax += (float) $item->line_total * ((float) $item->tax_rate / 100);
        }

        $quote->update([
            'subtotal' => $subtotal,
            'discount_amount' => 0,
            'tax_amount' => round($tax, 2),
            'total' => round($subtotal + $tax, 2),
        ]);

        return $quote->fresh();
    }

    private function extractText(string $pdfBytes): string
    {
        $parser = new PdfTextParser;
        $document = $parser->parseContent($pdfBytes);

        return $document->getText();
    }

    // -----------------------------------------------------------------
    // Aşama kapısı — kalıcı regresyon testi
    // -----------------------------------------------------------------

    public function test_turkish_characters_and_lira_symbol_survive_pdf_roundtrip(): void
    {
        $sample = "ĞÜŞİÖÇ ğüşiöç — Işık ılık, İstanbul'da şşş. Fiyat: 1.234,56 ₺";

        $quote = $this->makeQuoteWithItems(2, [
            'title' => $sample,
            'notes' => $sample,
        ]);

        $pdf = app(QuotePdfService::class)->render($quote);

        $this->assertStringStartsWith('%PDF-', $pdf);

        $text = $this->extractText($pdf);
        $normalize = fn (string $s) => preg_replace('/\s+/u', ' ', trim($s));

        foreach (['Ğ', 'Ü', 'Ş', 'İ', 'Ö', 'Ç', 'ğ', 'ü', 'ş', 'ö', 'ç', 'ı', '₺'] as $char) {
            $this->assertStringContainsString($char, $text, "Beklenen karakter PDF metninde bulunamadı: {$char}");
        }

        $this->assertStringContainsString($normalize($sample), $normalize($text));
    }

    // -----------------------------------------------------------------
    // Temel üretim
    // -----------------------------------------------------------------

    public function test_generates_non_empty_valid_pdf_for_real_quote(): void
    {
        $quote = $this->makeQuoteWithItems(4);

        $pdf = app(QuotePdfService::class)->render($quote);

        $this->assertNotEmpty($pdf);
        $this->assertStringStartsWith('%PDF-', $pdf);
        $this->assertGreaterThan(1000, strlen($pdf));
    }

    public function test_output_contains_item_table_totals_and_company_info(): void
    {
        Setting::query()->updateOrCreate(
            ['key' => 'company.name'],
            ['value' => 'Syncra Test Şirketi', 'type' => 'string', 'group' => 'company']
        );
        Setting::query()->updateOrCreate(
            ['key' => 'company.tax_number'],
            ['value' => '9998887776', 'type' => 'string', 'group' => 'company']
        );

        $quote = $this->makeQuoteWithItems(3);
        $quote->items->first()->update(['name' => 'Benzersiz Kalem Adı XYZ']);

        $pdf = app(QuotePdfService::class)->render($quote->fresh(['items']));
        $text = $this->extractText($pdf);

        $this->assertStringContainsString('Syncra Test Şirketi', $text);
        $this->assertStringContainsString('9998887776', $text);
        $this->assertStringContainsString($quote->quote_number, $text);
        $this->assertStringContainsString('Benzersiz Kalem Adı XYZ', $text);
        $this->assertStringContainsString('GENEL TOPLAM', $text);

        $money = fn ($v) => number_format((float) $v, 2, ',', '.');
        $this->assertStringContainsString($money($quote->fresh()->total), $text);
    }

    // -----------------------------------------------------------------
    // Sayfalama
    // -----------------------------------------------------------------

    public function test_large_quote_with_sixty_items_produces_multi_page_pdf_without_error(): void
    {
        $quote = $this->makeQuoteWithItems(60);

        $pdf = app(QuotePdfService::class)->render($quote);

        $this->assertStringStartsWith('%PDF-', $pdf);

        // Birden fazla sayfa üretildiğini dolaylı olarak doğrula: dompdf her
        // sayfa için ayrı bir /Type /Page nesnesi yazar.
        $pageObjectCount = preg_match_all('/\/Type\s*\/Page[^s]/', $pdf);
        $this->assertGreaterThan(1, $pageObjectCount, 'PDF tek sayfaya sıkışmış görünüyor.');

        $text = $this->extractText($pdf);
        $this->assertStringContainsString('GENEL TOPLAM', $text);
    }

    // -----------------------------------------------------------------
    // Güvenlik
    // -----------------------------------------------------------------

    public function test_html_in_notes_is_escaped_not_rendered(): void
    {
        $quote = $this->makeQuoteWithItems(1, [
            'notes' => '<script>alert(1)</script><b>kalın değil</b>',
        ]);

        $pdf = app(QuotePdfService::class)->render($quote);
        $text = $this->extractText($pdf);

        // Etiketler literal metin olarak görünmeli (escape edildiği için),
        // gerçek bir HTML elemanı olarak yorumlanıp KAYBOLMAMALI.
        $this->assertStringContainsString('alert(1)', $text);
        $this->assertStringContainsString('kalın değil', $text);
    }

    public function test_remote_image_in_notes_does_not_break_generation_or_fetch_remote(): void
    {
        $this->assertFalse(
            config('dompdf.options.enable_remote'),
            'isRemoteEnabled varsayılan olarak false olmalı (config/dompdf.php).'
        );

        $quote = $this->makeQuoteWithItems(1, [
            'notes' => 'Bakınız: <img src="http://169.254.169.254/latest/meta-data/" width="10" height="10"> son.',
        ]);

        $pdf = app(QuotePdfService::class)->render($quote);

        $this->assertStringStartsWith('%PDF-', $pdf);

        $text = $this->extractText($pdf);
        // <img> etiketi escape edildiği için literal metin olarak görünür,
        // bir görsel olarak yüklenmeye ÇALIŞILMAZ (uzak istek atılmaz).
        $this->assertStringContainsString('img src=', $text);
    }

    // -----------------------------------------------------------------
    // Dosya adı
    // -----------------------------------------------------------------

    public function test_filename_uses_quote_number(): void
    {
        $quote = $this->makeQuoteWithItems(1, ['quote_number' => 'QTE-000042']);

        $this->assertSame('teklif-QTE-000042.pdf', app(QuotePdfService::class)->filename($quote));
    }
}
