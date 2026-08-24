// Para/oran biçimlendirme yardımcıları — Faz 9 / E (Teklifler).
//
// PARA GÖSTERİMİ artık `src/lib/money.ts`e DEVREDİLMİŞTİR — o dosya, projede 7 ayrı yerde
// tekrarlanan `Intl.NumberFormat('tr-TR', {style:'currency',...})` kopyalarının (bu dosyanın
// önceki sürümü de dahil) tek doğruluk kaynağı olarak toplandığı merkezi yardımcıdır
// (`companies`/`deals`/`products`/`price-lists` modülleri de aynı fonksiyona geçirildi).
// Bu faz kapsamında para birimi her zaman TRY'dir (docs/QUOTE-FINANCIALS.md §9), bu yüzden
// `formatTRY` currency parametresi almaz — `formatMoney`'i sabit `'TRY'` ile çağıran ince bir
// sarmalayıcıdır.
//
// DAVRANIŞ FARKI (bilinçli, merkezi yardımcıya geçişin bir parçası): eski `formatTRY`,
// `Intl.NumberFormat` NaN/geçersiz girdide fırlatırsa `amount.toFixed(2)` ile bir sayı basmaya
// çalışırdı (`NaN.toFixed(2)` aslında `'NaN'` üretirdi — gerçekte hiç iyi bir fallback değildi).
// `formatMoney`, `null`/`undefined`/boş/`NaN` girdide artık projedeki ORTAK kuralla `'—'`
// (em dash) döner. Teklif modülündeki TÜM çağrı yerleri taranmıştır (`QuoteItemsEditor`,
// `QuoteTotalsPanel`, `QuoteDetailPage`, `QuotesListPage`): hiçbiri `null`/`undefined` bir tutar
// GEÇİRMİYOR — `Quote`/`QuoteItem`/`QuoteTaxBreakdownRow` tiplerinde para alanları hep zorunlu
// `number` (backend `QuoteResource`/`QuoteItemResource` her zaman `(float)` cast eder, asla
// `null` değil) ve `QuoteItemsEditor` zaten `Number(item.unit_price) || 0` ile NaN'ı 0'a
// düşürüyor. Yani bu davranış farkı teklif ekranlarında GÖZLEMLENEBİLİR bir değişiklik
// YARATMIYOR — `0` her koşulda `formatMoney(0)` → `₺0,00` basmaya devam ediyor (`0`,
// "değer yok" değildir).
import { formatMoney } from '../../../lib/money'

export function formatTRY(amount: number): string {
  return formatMoney(amount, 'TRY')
}

/** Girdi indirim yüzdesi / KDV oranı gibi tekil sayısal değerler için — "%5", "%20" gibi. */
export function formatPercent(value: number): string {
  const formatted = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 }).format(value)
  return `%${formatted}`
}

export function formatDate(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium' }).format(new Date(iso))
  } catch {
    return iso
  }
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso))
  } catch {
    return iso
  }
}
