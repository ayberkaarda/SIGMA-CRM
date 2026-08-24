// Fırsat durumu rozeti — görev tanımı: open=primary, won=success, lost=danger.
import { Badge } from '../../../components/ui'
import type { BadgeProps } from '../../../components/ui'
import type { DealStatus } from '../types'

const STATUS_LABELS: Record<DealStatus, string> = {
  open: 'Açık',
  won: 'Kazanıldı',
  lost: 'Kaybedildi',
}

const STATUS_VARIANT: Record<DealStatus, NonNullable<BadgeProps['variant']>> = {
  open: 'primary',
  won: 'success',
  lost: 'danger',
}

export type DealStatusBadgeProps = {
  status: DealStatus
}

export function DealStatusBadge({ status }: DealStatusBadgeProps) {
  return <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABELS[status]}</Badge>
}

export { STATUS_LABELS as DEAL_STATUS_LABELS, STATUS_VARIANT as DEAL_STATUS_VARIANT }
