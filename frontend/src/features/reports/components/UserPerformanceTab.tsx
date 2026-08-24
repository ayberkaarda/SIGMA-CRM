// Kullanıcı Performansı sekmesi — gelire göre sıralanmış bar grafiği + tam tablo.
import { Table, TBody, Td, THead, Th, Tr } from '../../../components/ui'
import { formatMoney, formatNumber } from '../../../lib/money'
import { useUserPerformance } from '../hooks/useReports'
import { RankingBarChart } from './RankingBarChart'
import type { DateRangeParams, UserPerformanceRow } from '../types'

export type UserPerformanceTabProps = {
  dateRange: DateRangeParams
}

export function UserPerformanceTab({ dateRange }: UserPerformanceTabProps) {
  const result = useUserPerformance(dateRange)
  // Tek `JsonResource` sarmalaması (bkz. `types.ts` başındaki SARMALAMA NOTU): satırlar
  // `result.data.data.data`de.
  const rows = result.data?.data.data ?? []

  return (
    <div className="flex flex-col gap-4">
      <RankingBarChart<UserPerformanceRow>
        data={rows}
        isLoading={result.isLoading}
        getKey={(row) => row.user_id}
        getLabel={(row) => row.user_name ?? 'Bilinmeyen kullanıcı'}
        getValue={(row) => Number(row.revenue) || 0}
        formatValue={(value) => formatMoney(value)}
        tooltipExtra={(row) => (
          <>
            {formatNumber(row.won_count)} kazanılan · {formatNumber(row.conversion_rate, 1)}% dönüşüm
          </>
        )}
        emptyTitle="Bu aralıkta kullanıcı performans verisi yok"
        emptyDescription="Seçili tarih aralığında atanmış bir fırsat bulunamadı."
      />

      <Table>
        <THead>
          <Tr>
            <Th>Kullanıcı</Th>
            <Th align="right">Gelir</Th>
            <Th align="right">Kazanılan</Th>
            <Th align="right">Kaybedilen</Th>
            <Th align="right">Açık Fırsat</Th>
            <Th align="right">Açık Fırsat Tutarı</Th>
            <Th align="right">Dönüşüm</Th>
            <Th align="right">Ort. Anlaşma</Th>
            <Th align="right">Aktivite</Th>
          </Tr>
        </THead>
        <TBody>
          {rows.map((row) => (
            <Tr key={row.user_id}>
              <Td>{row.user_name ?? 'Bilinmeyen kullanıcı'}</Td>
              <Td align="right">{formatMoney(row.revenue)}</Td>
              <Td align="right">{formatNumber(row.won_count)}</Td>
              <Td align="right">{formatNumber(row.lost_count)}</Td>
              <Td align="right">{formatNumber(row.open_deals_count)}</Td>
              <Td align="right">{formatMoney(row.open_deals_value)}</Td>
              <Td align="right">{formatNumber(row.conversion_rate, 1)}%</Td>
              <Td align="right">{formatMoney(row.avg_deal_size)}</Td>
              <Td align="right">{formatNumber(row.activities_count)}</Td>
            </Tr>
          ))}
          {!result.isLoading && rows.length === 0 && (
            <Tr>
              <Td colSpan={9} align="center" className="py-8 text-fg-muted">
                Kayıt bulunamadı.
              </Td>
            </Tr>
          )}
        </TBody>
      </Table>
    </div>
  )
}
