// Talep önceliği sabitleri — `TicketPriorityBadge.tsx`'ten AYRI tutulur ki o dosya yalnızca bir
// component export etsin (react-refresh/only-export-components uyarısını önler, bkz. token
// sözleşmesi doğrulama adımı "npm run lint → temiz"; desen `tasks/components/priorityMeta.ts`
// ile aynı). Görev tanımı: low=neutral, normal=primary, high=warning, urgent=danger.
import type { TicketPriority } from '../types'
import type { BadgeProps } from '../../../components/ui'

export const PRIORITY_VARIANT: Record<TicketPriority, NonNullable<BadgeProps['variant']>> = {
  low: 'neutral',
  normal: 'primary',
  high: 'warning',
  urgent: 'danger',
}

export const PRIORITY_LABEL: Record<TicketPriority, string> = {
  low: 'Düşük',
  normal: 'Normal',
  high: 'Yüksek',
  urgent: 'Acil',
}

export const PRIORITY_OPTIONS = (Object.keys(PRIORITY_LABEL) as TicketPriority[]).map((value) => ({
  value,
  label: PRIORITY_LABEL[value],
}))
