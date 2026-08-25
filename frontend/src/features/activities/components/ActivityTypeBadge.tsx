// Aktivite türü rozeti + ikon — literal eşleme (bkz. `tasks/components/PriorityBadge.tsx` ile
// aynı gerekçe). Sabitler `activityTypeMeta.ts`'te.
import { useTranslation } from 'react-i18next'
import { Badge } from '../../../components/ui'
import type { BadgeProps } from '../../../components/ui'
import { TYPE_LABEL_KEY, TYPE_VARIANT, TYPE_ICON } from './activityTypeMeta'
import type { ActivityType } from '../types'

export function ActivityTypeBadge({ type, size }: { type: ActivityType; size?: BadgeProps['size'] }) {
  const { t } = useTranslation('enums')
  const Icon = TYPE_ICON[type]
  return (
    <Badge variant={TYPE_VARIANT[type]} size={size}>
      <Icon className="size-3.5" aria-hidden="true" />
      {t(TYPE_LABEL_KEY[type])}
    </Badge>
  )
}
