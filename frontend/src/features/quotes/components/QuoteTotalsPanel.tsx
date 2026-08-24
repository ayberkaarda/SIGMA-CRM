// Toplamlar bloğu — ara toplam, indirim, KDV oranı kırılımı, genel toplam. Hem teklif formunda
// (`POST /api/quotes/calculate` canlı sonucuyla) hem detay sayfasında (kayıtlı `Quote` alanlarıyla)
// AYNI bileşen kullanılır: `POST /api/quotes/calculate` ve `GET /api/quotes/{id}` birebir aynı
// `tax_breakdown` şeklini (`rate/net/discount/base/tax`) döndürüyor (bkz. types.ts dokümanı).
import { Loader2 } from 'lucide-react'
import { formatTRY } from '../utils/money'
import type { DiscountType, QuoteTaxBreakdownRow } from '../types'

export type QuoteTotalsPanelProps = {
  subtotal: number
  discountType: DiscountType
  discountValue: number
  discountAmount: number
  taxAmount: number
  total: number
  taxBreakdown: QuoteTaxBreakdownRow[]
  /** Form bağlamında: yeni bir `calculate` isteği uçarken hafif bir gösterge — değerler SIFIRLANMAZ. */
  isCalculating?: boolean
}

export function QuoteTotalsPanel({
  subtotal,
  discountType,
  discountValue,
  discountAmount,
  taxAmount,
  total,
  taxBreakdown,
  isCalculating,
}: QuoteTotalsPanelProps) {
  const hasDiscount = discountAmount > 0
  const discountLabel =
    discountType === 'percent' ? `%${discountValue.toString().replace('.', ',')} indirim` : 'Sabit tutar indirim'

  return (
    <div className="flex flex-col gap-4">
      {isCalculating && (
        <div className="flex items-center gap-1.5 text-xs text-fg-muted">
          <Loader2 className="size-3.5 animate-spin motion-reduce:hidden" aria-hidden="true" />
          Hesaplanıyor…
        </div>
      )}

      <dl className="flex flex-col gap-2 text-sm">
        <div className="flex items-center justify-between">
          <dt className="text-fg-secondary">Ara Toplam (KDV Hariç)</dt>
          <dd className="font-medium text-fg">{formatTRY(subtotal)}</dd>
        </div>
        {hasDiscount && (
          <div className="flex items-center justify-between">
            <dt className="text-fg-secondary">İndirim ({discountLabel})</dt>
            <dd className="font-medium text-danger">-{formatTRY(discountAmount)}</dd>
          </div>
        )}
        <div className="flex items-center justify-between">
          <dt className="text-fg-secondary">KDV Toplamı</dt>
          <dd className="font-medium text-fg">{formatTRY(taxAmount)}</dd>
        </div>
      </dl>

      {taxBreakdown.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">KDV Matrah Özeti</p>
          <div className="overflow-x-auto rounded-md border border-border-subtle">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-border-subtle bg-surface-2">
                  <th className="px-3 py-2 font-medium text-fg-muted">Oran</th>
                  <th className="px-3 py-2 text-right font-medium text-fg-muted">Net</th>
                  <th className="px-3 py-2 text-right font-medium text-fg-muted">İndirim Payı</th>
                  <th className="px-3 py-2 text-right font-medium text-fg-muted">Matrah</th>
                  <th className="px-3 py-2 text-right font-medium text-fg-muted">KDV</th>
                </tr>
              </thead>
              <tbody>
                {taxBreakdown.map((row) => (
                  <tr key={row.rate} className="border-b border-border-subtle last:border-0">
                    <td className="px-3 py-2 text-fg">%{row.rate}</td>
                    <td className="px-3 py-2 text-right text-fg">{formatTRY(row.net)}</td>
                    <td className="px-3 py-2 text-right text-fg">{formatTRY(row.discount)}</td>
                    <td className="px-3 py-2 text-right text-fg">{formatTRY(row.base)}</td>
                    <td className="px-3 py-2 text-right text-fg">{formatTRY(row.tax)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between border-t border-border-subtle pt-3">
        <span className="text-sm font-medium text-fg">Genel Toplam</span>
        <span className="text-xl font-semibold text-fg">{formatTRY(total)}</span>
      </div>
    </div>
  )
}
