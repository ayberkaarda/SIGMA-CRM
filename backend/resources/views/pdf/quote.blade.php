{{--
    Teklif PDF şablonu (dompdf / barryvdh-laravel-dompdf).

    ÖNEMLİ — GÜVENLİK: Kullanıcı girdisi olabilecek her alan ({{ }} ile,
    ASLA {!! !!} ile değil) escape edilerek basılır: $quote->notes,
    $quote->terms, kalem name/description. Aksi halde bir teklif notuna
    gömülen HTML/script PDF üretimini bozabilir veya beklenmedik içerik
    üretebilir.

    Dompdf harici CSS/JS yüklemez; tüm stil bu dosyada <style> içinde satır
    içi tanımlıdır. Tasarım kasıtlı olarak sade/siyah-beyaz tutulmuştur —
    PDF, uygulamanın ekran tasarım sisteminden ayrı, yazdırılabilir bir
    mecradır.

    Font: 'DejaVu Sans' (dompdf'e gömülü). Türkçe karakterler (ı İ ş Ş ğ Ğ
    ü Ü ö Ö ç Ç) ve ₺ simgesi bu fontla doğrulanmıştır — bkz.
    QuotePdfTest::test_turkish_characters_and_lira_symbol_survive_pdf_roundtrip.
--}}
@php
    /** @var \App\Models\Quote $quote */
    $billTo = $quote->company ?? $quote->deal?->company;
    $contact = $quote->contact;

    $statusLabels = [
        'draft' => 'Taslak',
        'sent' => 'Gönderildi',
        'accepted' => 'Kabul Edildi',
        'rejected' => 'Reddedildi',
        'expired' => 'Süresi Doldu',
    ];
    $statusLabel = $statusLabels[$quote->status] ?? ucfirst($quote->status);

    $money = fn ($value) => number_format((float) $value, 2, ',', '.');
    $qty = fn ($value) => number_format((float) $value, 2, ',', '.');
@endphp
<html>
<head>
<meta charset="utf-8">
<style>
    @page {
        margin: 90px 40px 60px 40px;
    }

    * {
        box-sizing: border-box;
    }

    body {
        font-family: 'DejaVu Sans', sans-serif;
        font-size: 10px;
        color: #1a1a1a;
        line-height: 1.4;
    }

    h1, h2, h3 {
        margin: 0;
        padding: 0;
        font-weight: bold;
    }

    table {
        width: 100%;
        border-collapse: collapse;
    }

    /* ------------------------------------------------------------------
     * Üst bilgi (şirket + teklif no) — dompdf'in "running header" desteği
     * kısıtlı olduğundan sabit konumlu bir div ile her sayfada tekrarlanır.
     * ---------------------------------------------------------------- */
    #page-header {
        position: fixed;
        top: -70px;
        left: 0;
        right: 0;
        height: 60px;
        border-bottom: 1.5px solid #1a1a1a;
        padding-bottom: 8px;
    }

    #page-header .company-name {
        font-size: 15px;
        font-weight: bold;
    }

    #page-header .company-meta {
        font-size: 8px;
        color: #444;
        margin-top: 2px;
    }

    #page-header .logo-slot {
        /* Logo dosyası yok (Faz 10 Ayarlar ekranında yüklenebilir hale
           gelecek). Şimdilik yer tutucu bırakıldı, gerçek bir logo
           <img> değil — kutu yalnızca marka alanını göstermek içindir. */
        width: 70px;
        height: 40px;
        border: 1px solid #999;
        color: #999;
        font-size: 7px;
        text-align: center;
        vertical-align: middle;
    }

    #page-footer {
        position: fixed;
        bottom: -50px;
        left: 0;
        right: 0;
        height: 30px;
        border-top: 0.75px solid #999;
        padding-top: 6px;
        font-size: 7px;
        color: #777;
        text-align: center;
    }

    /* Sayfa numarası QuotePdfService::addPageNumbers() tarafından
       Canvas::page_text() ile basılır (bkz. servis içi güvenlik notu:
       dompdf'in embedded PHP script mekanizması KULLANILMAZ). */

    .section-title {
        font-size: 9px;
        font-weight: bold;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: #555;
        border-bottom: 0.75px solid #ccc;
        padding-bottom: 3px;
        margin-bottom: 6px;
    }

    #meta-block {
        width: 100%;
        margin-top: 10px;
        margin-bottom: 16px;
    }

    #meta-block td {
        vertical-align: top;
        width: 50%;
        padding: 0;
    }

    #meta-block .box {
        border: 0.75px solid #ccc;
        padding: 8px 10px;
        margin-right: 8px;
    }

    #meta-block .box.last {
        margin-right: 0;
    }

    #meta-block .row {
        margin-bottom: 2px;
    }

    #meta-block .label {
        color: #666;
        display: inline;
    }

    .quote-title {
        font-size: 13px;
        margin-bottom: 2px;
    }

    .status-badge {
        display: inline;
        border: 0.75px solid #1a1a1a;
        padding: 1px 6px;
        font-size: 8px;
        font-weight: bold;
    }

    /* ------------------------------------------------------------------
     * Kalem tablosu — <thead> her sayfada tekrar eder (dompdf yerleşik
     * davranışı). 60+ kalemlik tekliflerde çok sayfaya bölünür.
     * ---------------------------------------------------------------- */
    #items-table {
        margin-top: 4px;
    }

    #items-table thead th {
        background-color: #eeeeee;
        border: 0.75px solid #999;
        padding: 5px 6px;
        font-size: 8.5px;
        text-align: left;
        font-weight: bold;
    }

    #items-table tbody td {
        border: 0.75px solid #ccc;
        padding: 5px 6px;
        font-size: 9px;
        vertical-align: top;
    }

    #items-table .col-no {
        width: 4%;
        text-align: center;
    }

    #items-table .col-desc {
        width: 38%;
    }

    #items-table .col-desc .item-desc {
        color: #555;
        font-size: 8px;
        margin-top: 2px;
    }

    #items-table .col-qty {
        width: 12%;
        text-align: right;
    }

    #items-table .col-price {
        width: 15%;
        text-align: right;
    }

    #items-table .col-discount {
        width: 9%;
        text-align: right;
    }

    #items-table .col-tax {
        width: 8%;
        text-align: right;
    }

    #items-table .col-total {
        width: 14%;
        text-align: right;
        font-weight: bold;
    }

    /* ------------------------------------------------------------------
     * Toplamlar — sayfa ortasında bölünmesin.
     * ---------------------------------------------------------------- */
    #totals-wrapper {
        page-break-inside: avoid;
        margin-top: 10px;
    }

    #totals-table {
        width: 45%;
        margin-left: 55%;
    }

    #totals-table td {
        padding: 4px 6px;
        font-size: 9.5px;
    }

    #totals-table .totals-label {
        text-align: left;
        color: #444;
    }

    #totals-table .totals-value {
        text-align: right;
    }

    #totals-table .grand-total-row td {
        border-top: 1.5px solid #1a1a1a;
        font-size: 12px;
        font-weight: bold;
        padding-top: 7px;
    }

    #notes-block {
        page-break-inside: avoid;
        margin-top: 18px;
    }

    #notes-block .block {
        margin-bottom: 12px;
    }

    #notes-block .text {
        font-size: 9px;
        color: #333;
        white-space: pre-line;
        border: 0.75px solid #ddd;
        padding: 8px 10px;
    }
</style>
</head>
<body>

<div id="page-header">
    <table>
        <tr>
            <td style="width: 78%;">
                <div class="company-name">{{ $companyInfo['name'] }}</div>
                <div class="company-meta">
                    {{ $companyInfo['address'] }}
                    @if($companyInfo['tax_number']) &middot; VKN: {{ $companyInfo['tax_number'] }} @endif
                    @if($companyInfo['phone']) &middot; {{ $companyInfo['phone'] }} @endif
                    @if($companyInfo['email']) &middot; {{ $companyInfo['email'] }} @endif
                </div>
            </td>
            <td style="width: 22%; text-align: right;">
                {{-- Logo alanı: Faz 10'da Ayarlar ekranından yüklenebilir hale gelecek. --}}
                <div class="logo-slot">LOGO</div>
            </td>
        </tr>
    </table>
</div>

<div id="page-footer">
    {{ $companyInfo['name'] }} &middot; {{ $companyInfo['tax_number'] ? 'VKN: '.$companyInfo['tax_number'] : '' }}
</div>

<table id="meta-block">
    <tr>
        <td>
            <div class="box">
                <div class="quote-title">Teklif {{ $quote->quote_number }}</div>
                <div class="row"><span class="label">Başlık:</span> {{ $quote->title }}</div>
                <div class="row"><span class="label">Tarih:</span> {{ optional($quote->created_at)->format('d.m.Y') }}</div>
                <div class="row"><span class="label">Geçerlilik:</span> {{ optional($quote->valid_until)->format('d.m.Y') ?? '-' }}</div>
                <div class="row"><span class="label">Durum:</span> <span class="status-badge">{{ $statusLabel }}</span></div>
            </div>
        </td>
        <td>
            <div class="box last">
                <div class="quote-title" style="font-size: 11px;">Müşteri Bilgileri</div>
                <div class="row"><strong>{{ $billTo->name ?? '-' }}</strong></div>
                @if($contact)
                    <div class="row">{{ $contact->full_name }}@if($contact->position), {{ $contact->position }}@endif</div>
                @endif
                @if($billTo?->address)
                    <div class="row">{{ $billTo->address }}@if($billTo->city), {{ $billTo->city }}@endif</div>
                @endif
                @if($contact?->phone ?? $billTo?->phone)
                    <div class="row"><span class="label">Tel:</span> {{ $contact->phone ?? $billTo->phone }}</div>
                @endif
                @if($contact?->email ?? $billTo?->email)
                    <div class="row"><span class="label">E-posta:</span> {{ $contact->email ?? $billTo->email }}</div>
                @endif
            </div>
        </td>
    </tr>
</table>

<div class="section-title">Teklif Kalemleri</div>

<table id="items-table">
    <thead>
        <tr>
            <th class="col-no">#</th>
            <th class="col-desc">Açıklama</th>
            <th class="col-qty">Miktar</th>
            <th class="col-price">Birim Fiyat</th>
            <th class="col-discount">İndirim %</th>
            <th class="col-tax">KDV %</th>
            <th class="col-total">Tutar</th>
        </tr>
    </thead>
    <tbody>
        @foreach($quote->items as $index => $item)
            <tr>
                <td class="col-no">{{ $index + 1 }}</td>
                <td class="col-desc">
                    <div>{{ $item->name }}</div>
                    @if($item->description)
                        <div class="item-desc">{{ $item->description }}</div>
                    @endif
                </td>
                <td class="col-qty">{{ $qty($item->quantity) }} adet</td>
                <td class="col-price">{{ $money($item->unit_price) }} {{ $currencySymbol }}</td>
                <td class="col-discount">{{ $money($item->discount_percent) }}%</td>
                <td class="col-tax">{{ $money($item->tax_rate) }}%</td>
                <td class="col-total">{{ $money($item->line_total) }} {{ $currencySymbol }}</td>
            </tr>
        @endforeach
    </tbody>
</table>

<div id="totals-wrapper">
    <table id="totals-table">
        <tr>
            <td class="totals-label">Ara Toplam</td>
            <td class="totals-value">{{ $money($quote->subtotal) }} {{ $currencySymbol }}</td>
        </tr>
        <tr>
            <td class="totals-label">İndirim</td>
            <td class="totals-value">-{{ $money($quote->discount_amount) }} {{ $currencySymbol }}</td>
        </tr>
        <tr>
            <td class="totals-label">KDV</td>
            <td class="totals-value">{{ $money($quote->tax_amount) }} {{ $currencySymbol }}</td>
        </tr>
        <tr class="grand-total-row">
            <td class="totals-label">GENEL TOPLAM</td>
            <td class="totals-value">{{ $money($quote->total) }} {{ $currencySymbol }}</td>
        </tr>
    </table>
</div>

<div id="notes-block">
    @if($quote->notes)
        <div class="block">
            <div class="section-title">Notlar</div>
            <div class="text">{{ $quote->notes }}</div>
        </div>
    @endif
    @if($quote->terms)
        <div class="block">
            <div class="section-title">Şartlar ve Koşullar</div>
            <div class="text">{{ $quote->terms }}</div>
        </div>
    @endif
</div>

</body>
</html>
