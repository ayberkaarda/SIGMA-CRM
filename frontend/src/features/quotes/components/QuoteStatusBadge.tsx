// Teklif durum rozeti — görev tanımındaki eşleme: draft=neutral, sent=primary,
// accepted=success, rejected=danger, expired=warning.
import { Badge } from '../../../components/ui'
import type { QuoteStatus } from '../types'

const LABELS: Record<QuoteStatus, string> = {
  draft: 'Taslak',
  sent: 'Gönderildi',
  accepted: 'Kabul Edildi',
  rejected: 'Reddedildi',
  expired: 'Süresi Doldu',
}

const VARIANTS: Record<QuoteStatus, 'neutral' | 'primary' | 'success' | 'danger' | 'warning'> = {
  draft: 'neutral',
  sent: 'primary',
  accepted: 'success',
  rejected: 'danger',
  expired: 'warning',
}

export function QuoteStatusBadge({ status }: { status: QuoteStatus }) {
  return <Badge variant={VARIANTS[status]}>{LABELS[status]}</Badge>
}
