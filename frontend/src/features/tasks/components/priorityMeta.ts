// Görev önceliği sabitleri — `PriorityBadge.tsx`'ten AYRI tutulur ki o dosya yalnızca bir
// component export etsin (react-refresh/only-export-components uyarısını önler, bkz. token
// sözleşmesi doğrulama adımı "npm run lint → temiz").
import type { TaskPriority } from '../types'
import type { BadgeProps } from '../../../components/ui'

export const PRIORITY_VARIANT: Record<TaskPriority, NonNullable<BadgeProps['variant']>> = {
  low: 'neutral',
  normal: 'primary',
  high: 'warning',
  urgent: 'danger',
}

export const PRIORITY_LABEL: Record<TaskPriority, string> = {
  low: 'Düşük',
  normal: 'Normal',
  high: 'Yüksek',
  urgent: 'Acil',
}

export const PRIORITY_OPTIONS = (Object.keys(PRIORITY_LABEL) as TaskPriority[]).map((value) => ({
  value,
  label: PRIORITY_LABEL[value],
}))

/** Takvim ızgarasındaki öncelik noktası için — `Badge` yerine, hücreye sığan minik bir nokta. */
export const PRIORITY_DOT_CLASS: Record<TaskPriority, string> = {
  low: 'bg-fg-muted',
  normal: 'bg-primary',
  high: 'bg-warning',
  urgent: 'bg-danger',
}
