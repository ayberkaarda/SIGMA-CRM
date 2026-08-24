// Talep durumu rozeti — literal eşleme (bkz. `TicketPriorityBadge` ile aynı gerekçe). Sabitler
// `ticketStatusMeta.ts`'te.
import { Badge } from '../../../components/ui'
import type { BadgeProps } from '../../../components/ui'
import { STATUS_LABEL, STATUS_VARIANT } from './ticketStatusMeta'
import type { TicketStatus } from '../types'

export function TicketStatusBadge({ status, size }: { status: TicketStatus; size?: BadgeProps['size'] }) {
  return (
    <Badge variant={STATUS_VARIANT[status]} size={size}>
      {STATUS_LABEL[status]}
    </Badge>
  )
}
