// Para/tarih biçimlendirme yardımcıları — `features/products/` VE `features/price-lists/`
// tarafından paylaşılır (ikisi de bu şeridin dosya sahipliğinde, bkz. görev tanımı).
//
// Para biçimlendirme artık merkezi `src/lib/money.ts`e devredilmiştir (bkz. o dosyanın
// docblock'u — projedeki 7 ayrı `Intl.NumberFormat` kopyası tek yerde toplandı). Bu dosya,
// `price-lists/` içindeki mevcut importları kırmamak için `formatCurrency` adını `formatMoney`
// olarak yeniden dışa aktarır; kuruş burada GÖSTERİLİR (2 ondalık) — birim fiyatlar ve liste
// fiyatları çoğu zaman küsuratlıdır (ör. 149,90), yuvarlamak kullanıcıyı yanıltır.
export { formatMoney as formatCurrency } from '../../../lib/money'

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  try {
    return new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium' }).format(new Date(`${value}T00:00:00`))
  } catch {
    return value
  }
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—'
  try {
    return new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
  } catch {
    return value
  }
}
