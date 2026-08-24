// Merkezi para/sayı biçimlendirme.
//
// NEDEN MERKEZİ: `Intl.NumberFormat('tr-TR', { style: 'currency', ... })` projede 7 farklı
// dosyada ayrı ayrı yazılmıştı ve üç farklı ondalık davranışı üretiyordu (bkz. görev raporu) —
// aynı tutar hangi ekranda gösterildiğine göre farklı görünüyordu (`295.367 ₺` vs
// `295.366,56 ₺`). Bu dosya TEK doğruluk kaynağıdır; yeni bir para gösterimi ihtiyacı
// doğduğunda (Faz 10/11 raporlar/dashboard dahil) burada genişletilmeli, yeni bir yerel kopya
// AÇILMAMALI.
//
// Nerede hangisi kullanılmalı:
// - `formatMoney`    → varsayılan gösterim (tablolar, detay sayfaları, toplamlar). Her zaman
//                       2 ondalık basar; kuruş asla gizlenmez.
// - `formatMoneyCompact` → dar alanlar (Kanban kartları, dashboard KPI kutuları). 0 ondalık —
//                       bilinçli bir okunabilirlik tercihi, modülün sessiz kararı değil.
// - `formatNumber`   → para OLMAYAN sayılar (adet, stok, çalışan sayısı, yüzde girdisi vb.).

const DEFAULT_CURRENCY = 'TRY'

/** Para birimine göre anahtarlanmış `Intl.NumberFormat` önbelleği — her çağrıda yeni örnek
 *  yaratmak pahalıdır ve tek bir örnek tüm para birimlerine hizmet edemez. */
const moneyFormatterCache = new Map<string, Intl.NumberFormat>()
const compactMoneyFormatterCache = new Map<string, Intl.NumberFormat>()
const numberFormatterCache = new Map<number, Intl.NumberFormat>()

function getMoneyFormatter(currency: string): Intl.NumberFormat {
  let formatter = moneyFormatterCache.get(currency)
  if (!formatter) {
    formatter = new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
    moneyFormatterCache.set(currency, formatter)
  }
  return formatter
}

function getCompactMoneyFormatter(currency: string): Intl.NumberFormat {
  let formatter = compactMoneyFormatterCache.get(currency)
  if (!formatter) {
    formatter = new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    })
    compactMoneyFormatterCache.set(currency, formatter)
  }
  return formatter
}

function getNumberFormatter(fractionDigits: number): Intl.NumberFormat {
  let formatter = numberFormatterCache.get(fractionDigits)
  if (!formatter) {
    formatter = new Intl.NumberFormat('tr-TR', {
      minimumFractionDigits: fractionDigits > 0 ? undefined : 0,
      maximumFractionDigits: fractionDigits,
    })
    numberFormatterCache.set(fractionDigits, formatter)
  }
  return formatter
}

/** `number | string | null | undefined` girdisini normalize eder. API'nin `decimal` alanları
 *  string olarak döner (ör. `"295366.56"`); boş/geçersiz girdi için `null` döner. */
function toFiniteNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  const trimmed = value.trim()
  if (trimmed === '') return null
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : null
}

/**
 * Varsayılan para gösterimi. Her zaman 2 ondalık (`295.366,56 ₺`) — kuruşu gizlemek tutar
 * okumasını belirsizleştirir. `amount` `null`/`undefined`/boş/`NaN` ise `'—'` döner; `0` gerçek
 * bir tutardır ve `0,00 ₺` basar.
 */
export function formatMoney(amount: number | string | null | undefined, currency: string = DEFAULT_CURRENCY): string {
  const value = toFiniteNumber(amount)
  if (value === null) return '—'
  try {
    return getMoneyFormatter(currency).format(value)
  } catch {
    // Tanınmayan bir para birimi kodu gelirse Intl fırlatır; tutar yine de gösterilmeli.
    return `${getNumberFormatter(2).format(value)} ${currency}`
  }
}

/**
 * Dar alanlar için kompakt para gösterimi (Kanban kartları, dashboard KPI kutuları): 0 ondalık
 * (`295.367 ₺`). `formatMoney` ile aynı null/NaN kuralları geçerlidir.
 */
export function formatMoneyCompact(amount: number | string | null | undefined, currency: string = DEFAULT_CURRENCY): string {
  const value = toFiniteNumber(amount)
  if (value === null) return '—'
  try {
    return getCompactMoneyFormatter(currency).format(value)
  } catch {
    return `${getNumberFormatter(0).format(value)} ${currency}`
  }
}

/**
 * Para OLMAYAN sayılar için (adet, stok, çalışan sayısı, yüzde girdisi vb.). Varsayılan olarak
 * ondalık basmaz (`fractionDigits = 0`); gerektiğinde `fractionDigits` ile ayarlanabilir.
 */
export function formatNumber(value: number | string | null | undefined, fractionDigits: number = 0): string {
  const num = toFiniteNumber(value)
  if (num === null) return '—'
  return getNumberFormatter(fractionDigits).format(num)
}
