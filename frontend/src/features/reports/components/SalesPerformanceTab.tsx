// Satış Performansı sekmesi — dönem grubu seçici (Gün/Hafta/Ay) + kullanıcı filtresi + gelir
// trendi grafiği + tablo.
import { Select, Table, Tab, TabList, Tabs, TBody, Td, THead, Th, Tr } from '../../../components/ui'
import { formatMoney, formatNumber } from '../../../lib/money'
import { useReportUserOptions, useSalesPerformance } from '../hooks/useReports'
import { SalesPerformanceChart } from './SalesPerformanceChart'
import type { DateRangeParams, SalesPerformanceGroupBy } from '../types'

export type SalesPerformanceTabProps = {
  dateRange: DateRangeParams
  groupBy: SalesPerformanceGroupBy
  onGroupByChange: (groupBy: SalesPerformanceGroupBy) => void
  userId: string
  onUserIdChange: (userId: string) => void
}

export function SalesPerformanceTab({
  dateRange,
  groupBy,
  onGroupByChange,
  userId,
  onUserIdChange,
}: SalesPerformanceTabProps) {
  const userOptionsQuery = useReportUserOptions()
  const userOptions = userOptionsQuery.data ?? []
  const showUserFilter = !userOptionsQuery.isError

  const result = useSalesPerformance({
    ...dateRange,
    group_by: groupBy,
    user_id: userId ? Number(userId) : undefined,
  })
  // Tek `JsonResource` sarmalaması (bkz. `types.ts` başındaki SARMALAMA NOTU): satırlar
  // `result.data.data.data`de, toplamlar `result.data.data.totals`de.
  const body = result.data?.data
  const rows = body?.data ?? []
  const totals = body?.totals

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <Tabs value={groupBy} onValueChange={(v) => onGroupByChange(v as SalesPerformanceGroupBy)} variant="segment">
          <TabList>
            <Tab value="day">Gün</Tab>
            <Tab value="week">Hafta</Tab>
            <Tab value="month">Ay</Tab>
          </TabList>
        </Tabs>

        {showUserFilter && (
          <div className="w-full sm:w-56">
            <Select
              value={userId}
              onChange={(e) => onUserIdChange(e.target.value)}
              options={[
                { value: '', label: 'Tüm kullanıcılar' },
                ...userOptions.map((u) => ({ value: String(u.id), label: u.name })),
              ]}
              aria-label="Kullanıcı filtresi"
            />
          </div>
        )}
      </div>

      <SalesPerformanceChart rows={rows} isLoading={result.isLoading} groupBy={groupBy} />

      <Table>
        <THead>
          <Tr>
            <Th>Dönem</Th>
            <Th align="right">Gelir</Th>
            <Th align="right">Kazanılan</Th>
            <Th align="right">Kaybedilen</Th>
            <Th align="right">Toplam Anlaşma</Th>
          </Tr>
        </THead>
        <TBody>
          {rows.map((row) => (
            <Tr key={row.period}>
              <Td>{row.period}</Td>
              <Td align="right">{formatMoney(row.revenue)}</Td>
              <Td align="right">{formatNumber(row.won_count)}</Td>
              <Td align="right">{formatNumber(row.lost_count)}</Td>
              <Td align="right">{formatNumber(row.deals_count)}</Td>
            </Tr>
          ))}
          {!result.isLoading && rows.length === 0 && (
            <Tr>
              <Td colSpan={5} align="center" className="py-8 text-fg-muted">
                Kayıt bulunamadı.
              </Td>
            </Tr>
          )}
          {totals && rows.length > 0 && (
            <Tr className="bg-surface-2 font-medium hover:bg-surface-2">
              <Td>Toplam</Td>
              <Td align="right">{formatMoney(totals.revenue)}</Td>
              <Td align="right">{formatNumber(totals.won_count)}</Td>
              <Td align="right">{formatNumber(totals.lost_count)}</Td>
              <Td align="right">{formatNumber(totals.deals_count)}</Td>
            </Tr>
          )}
        </TBody>
      </Table>
    </div>
  )
}
