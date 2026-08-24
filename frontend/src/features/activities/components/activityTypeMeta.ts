// Aktivite türü sabitleri — `ActivityTypeBadge.tsx`'ten AYRI tutulur ki o dosya yalnızca bir
// component export etsin (bkz. `tasks/components/priorityMeta.ts` başındaki aynı gerekçe).
import { Mail, Phone, StickyNote, Users } from 'lucide-react'
import type { ComponentType, SVGProps } from 'react'
import type { BadgeProps } from '../../../components/ui'
import type { ActivityType } from '../types'

export const TYPE_VARIANT: Record<ActivityType, NonNullable<BadgeProps['variant']>> = {
  call: 'primary',
  meeting: 'warning',
  email: 'neutral',
  note: 'success',
}

export const TYPE_LABEL: Record<ActivityType, string> = {
  call: 'Arama',
  meeting: 'Toplantı',
  email: 'E-posta',
  note: 'Not',
}

export const TYPE_ICON: Record<ActivityType, ComponentType<SVGProps<SVGSVGElement>>> = {
  call: Phone,
  meeting: Users,
  email: Mail,
  note: StickyNote,
}

export const ACTIVITY_TYPE_OPTIONS = (Object.keys(TYPE_LABEL) as ActivityType[]).map((value) => ({
  value,
  label: TYPE_LABEL[value],
}))

export function activityTypeIcon(type: ActivityType) {
  return TYPE_ICON[type]
}
