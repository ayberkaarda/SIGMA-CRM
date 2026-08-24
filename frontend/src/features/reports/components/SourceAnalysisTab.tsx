// Kaynak Analizi sekmesi — gelire göre sıralanmış kaynak bar grafiği + tam tablo.
import { Table, TBody, Td, THead, Th, Tr } from '../../../components/ui'
import { formatMoney, formatNumber } from '../../../lib/money'
import { useSourceAnalysis } from '../hooks/useReports'
import { RankingBarChart } from './RankingBarChart'
import type { DateRangeParams, SourceAnalysisRow } from '../types'

export type SourceAnalysisTabProps = {
  dateRange: DateRangeParams
}

export function SourceAnalysisTab({ dateRange }: SourceAnalysisTabProps) {
  const result = useSourceAnalysis(dateRange)
  // Tek `JsonResource` sarmalaması (bkz. `types.ts` başındaki SARMALAMA NOTU): satırlar
  // `result.data.data.data`de.
  const rows = result.data?.data.data ?? []

  return (
    <div className="flex flex-col gap-4">
      <RankingBarChart<SourceAnalysisRow>
        data={rows}
        isLoading={result.isLoading}
        getKey={(row) => row.source}
        getLabel={(row) => row.source || 'Bilinmiyor'}
        getValue={(row) => Number(row.revenue) || 0}
        formatValue={(value) => formatMoney(value)}
        tooltipExtra={(row) => (
          <>
            {formatNumber(row.leads_count)} aday · {formatNumber(row.conversion_rate, 1)}% dönüşüm
          </>
        )}
        emptyTitle="Bu aralıkta kaynak verisi yok"
        emptyDescription="Seçili tarih aralığında kaynağı işaretlenmiş bir aday bulunamadı."
      />

      <Table>
        <THead>
          <Tr>
            <Th>Kaynak</Th>
            <Th align="right">Aday</Th>
            <Th align="right">Dönüşen</Th>
            <Th align="right">Dönüşüm</Th>
            <Th align="right">Gelir</Th>
          </Tr>
        </THead>
        <TBody>
          {rows.map((row) => (
            <Tr key={row.source}>
              <Td>{row.source || 'Bilinmiyor'}</Td>
              <Td align="right">{formatNumber(row.leads_count)}</Td>
              <Td align="right">{formatNumber(row.converted_count)}</Td>
              <Td align="right">{formatNumber(row.conversion_rate, 1)}%</Td>
              <Td align="right">{formatMoney(row.revenue)}</Td>
            </Tr>
          ))}
          {!result.isLoading && rows.length === 0 && (
            <Tr>
              <Td colSpan={5} align="center" className="py-8 text-fg-muted">
                Kayıt bulunamadı.
              </Td>
            </Tr>
          )}
        </TBody>
      </Table>
    </div>
  )
}
