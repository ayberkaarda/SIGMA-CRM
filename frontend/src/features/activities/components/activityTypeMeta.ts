// Aktivite türü sabitleri — `ActivityTypeBadge.tsx`'ten AYRI tutulur ki o dosya yalnızca bir
// component export etsin (bkz. `tasks/components/priorityMeta.ts` başındaki aynı gerekçe).
//
// Faz 14 / İz D: etiketler ARTIK METİN DEĞİL, `enums` namespace'indeki ANAHTAR taşır (bkz.
// `layout/Sidebar.tsx` NAV_SECTIONS'taki aynı gerekçe) — bir modül sabiti değerlendirme anında
// `t()` çağırsaydı metin ilk yüklenen dile donardı. Tüketiciler `activityTypeOptions(t)` ile
// (Select seçenekleri) ya da doğrudan `t(TYPE_LABEL_KEY[type], { ns: 'enums' })` ile çözer.
import { Mail, Phone, StickyNote, Users } from 'lucide-react'
import type { ComponentType, SVGProps } from 'react'
import type { TFunction } from 'i18next'
import type { BadgeProps } from '../../../components/ui'
import type { ActivityType } from '../types'

export const TYPE_VARIANT: Record<ActivityType, NonNullable<BadgeProps['variant']>> = {
  call: 'primary',
  meeting: 'warning',
  email: 'neutral',
  note: 'success',
}

/** `enums` namespace anahtarı (önek `activity.type.*` — bkz. docs/PHASE-INTL.md §1.3/§1.5). */
export const TYPE_LABEL_KEY: Record<ActivityType, string> = {
  call: 'activity.type.call',
  meeting: 'activity.type.meeting',
  email: 'activity.type.email',
  note: 'activity.type.note',
}

export const TYPE_ICON: Record<ActivityType, ComponentType<SVGProps<SVGSVGElement>>> = {
  call: Phone,
  meeting: Users,
  email: Mail,
  note: StickyNote,
}

export function activityTypeOptions(t: TFunction): { value: ActivityType; label: string }[] {
  return (Object.keys(TYPE_LABEL_KEY) as ActivityType[]).map((value) => ({
    value,
    label: t(TYPE_LABEL_KEY[value], { ns: 'enums' }),
  }))
}

export function activityTypeIcon(type: ActivityType) {
  return TYPE_ICON[type]
}
