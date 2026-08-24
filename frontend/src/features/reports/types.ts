// Raporlar modülü tipleri — backend `App\Http\Resources\Reports\*` (SalesPerformanceResource,
// UserPerformanceResource, SourceAnalysisResource, ConversionResource) ve
// `App\Services\Reports\*Report::run()` çıktılarıyla birebir eşleşir.
//
// SARMALAMA NOTU: Bu dört uç, Laravel'in TEKİL `JsonResource` (koleksiyon DEĞİL) sarmalamasını
// kullanıyor ve bu sınıflar `withoutWrapping()` çağırmıyor — bu yüzden `toArray()`in döndürdüğü
// `{from, to, data, ...}` gövdesinin TAMAMI yine bir üst `"data"` anahtarının içine sarılıyor.
// Sonuç: `sales-performance` için satırlar `response.data.data[...]`de, `conversion` için özet
// `response.data.total_leads`de (satır dizisi YOK — bkz. `ReportApiTest.php`
// `assertJsonPath('data.data.0.period', ...)` / `assertJsonPath('data.total_leads', ...)`).
import type { LeadStatus } from '../leads/types'

export type { LeadStatus }

export type DateRangeParams = {
  from: string
  to: string
}

export type ReportSlug = 'sales-performance' | 'user-performance' | 'source-analysis' | 'conversion'
export type ReportExportFormat = 'csv' | 'xlsx'
export type SalesPerformanceGroupBy = 'day' | 'week' | 'month'

export type SalesPerformanceRow = {
  /** `group_by`e göre `"2026-08-24"` (day) / `"2026-W34"` (week) / `"2026-08"` (month). */
  period: string
  revenue: string
  won_count: number
  lost_count: number
  deals_count: number
}

export type SalesPerformanceTotals = {
  revenue: string
  won_count: number
  lost_count: number
  deals_count: number
}

export type SalesPerformanceBody = {
  from: string
  to: string
  group_by: SalesPerformanceGroupBy
  data: SalesPerformanceRow[]
  totals: SalesPerformanceTotals
}

export type SalesPerformanceResponse = {
  data: SalesPerformanceBody
}

export type UserPerformanceRow = {
  user_id: number
  /** Kullanıcı silinmişse `null` (`UserPerformanceReport::run` — `$names[$ownerId] ?? null`). */
  user_name: string | null
  revenue: string
  won_count: number
  lost_count: number
  conversion_rate: number
  avg_deal_size: string
  open_deals_count: number
  open_deals_value: string
  activities_count: number
}

export type UserPerformanceBody = {
  from: string
  to: string
  data: UserPerformanceRow[]
}

export type UserPerformanceResponse = {
  data: UserPerformanceBody
}

export type SourceAnalysisRow = {
  source: string
  leads_count: number
  converted_count: number
  conversion_rate: number
  revenue: string
}

export type SourceAnalysisBody = {
  from: string
  to: string
  data: SourceAnalysisRow[]
}

export type SourceAnalysisResponse = {
  data: SourceAnalysisBody
}

/** Dönem içinde OLUŞTURULMUŞ lead kohortunun durum dağılımı — aşama başına satır DEĞİL, tek bir
 * özet nesnesi (`ConversionReport::run`). `by_status`taki sıra `LEAD_STATUS_ORDER`de sabitlenir. */
export type ConversionBody = {
  from: string
  to: string
  total_leads: number
  converted_count: number
  conversion_rate: number
  avg_days_to_convert: number | null
  by_status: Record<LeadStatus, number>
}

export type ConversionResponse = {
  data: ConversionBody
}
