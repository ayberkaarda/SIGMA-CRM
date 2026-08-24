// Tarih aralığı yardımcıları — `DateRangeFilter` ve varsayılan aralık (son 30 gün) burada
// toplanır ki Dashboard ve Raporlar aynı hesaplamayı paylaşsın.
function toIsoDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function daysAgo(days: number): Date {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() - days)
  return date
}

export function todayIso(): string {
  return toIsoDate(new Date())
}

/** Varsayılan aralık: son 30 gün (görev tanımı §Veri sözleşmesi — kesin). */
export function defaultDateRange(): { from: string; to: string } {
  return { from: toIsoDate(daysAgo(29)), to: todayIso() }
}

export type DateRangePreset = {
  key: string
  label: string
  range: () => { from: string; to: string }
}

export const DATE_RANGE_PRESETS: DateRangePreset[] = [
  { key: 'today', label: 'Bugün', range: () => ({ from: todayIso(), to: todayIso() }) },
  { key: 'last7', label: 'Son 7 gün', range: () => ({ from: toIsoDate(daysAgo(6)), to: todayIso() }) },
  { key: 'last30', label: 'Son 30 gün', range: () => ({ from: toIsoDate(daysAgo(29)), to: todayIso() }) },
  { key: 'last90', label: 'Son 90 gün', range: () => ({ from: toIsoDate(daysAgo(89)), to: todayIso() }) },
]

/** Seçili `from`/`to` bir preset'e eşleniyorsa anahtarını döner, yoksa `null` (özel aralık). */
export function matchPreset(from: string, to: string): string | null {
  const preset = DATE_RANGE_PRESETS.find((p) => {
    const r = p.range()
    return r.from === from && r.to === to
  })
  return preset?.key ?? null
}

/** `ConversionReport::STATUSES` ile aynı sıra — Dönüşüm sekmesindeki `by_status` dağılımı bu
 * sırayla çizilir (ordinal: sıra anlam taşır, yeniden sıralanmaz). */
export const LEAD_STATUS_ORDER = ['new', 'contacted', 'qualified', 'unqualified', 'converted'] as const

export function formatDateLabel(iso: string): string {
  try {
    return new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium' }).format(new Date(`${iso}T00:00:00`))
  } catch {
    return iso
  }
}
