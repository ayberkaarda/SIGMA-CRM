// Görev durumu rozeti — literal eşleme (bkz. `PriorityBadge` ile aynı gerekçe). Sabitler
// `taskStatusMeta.ts`'te.
import { Badge } from '../../../components/ui'
import type { BadgeProps } from '../../../components/ui'
import { STATUS_LABEL, STATUS_VARIANT } from './taskStatusMeta'
import type { TaskStatus } from '../types'

export function TaskStatusBadge({ status, size }: { status: TaskStatus; size?: BadgeProps['size'] }) {
  return (
    <Badge variant={STATUS_VARIANT[status]} size={size}>
      {STATUS_LABEL[status]}
    </Badge>
  )
}
