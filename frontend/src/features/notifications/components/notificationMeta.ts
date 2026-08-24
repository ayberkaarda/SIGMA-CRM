// Bildirim tipine göre ikon eşlemesi + kütüphanesiz göreli zaman biçimlendirme —
// `NotificationList`/`NotificationBell`/`NotificationsPage` ortak kullanır. Sabitler ayrı
// tutulur ki bileşen dosyaları yalnızca bir component export etsin (react-refresh/
// only-export-components uyarısını önler — desen: `features/tickets/components/
// ticketPriorityMeta.ts`).
import {
  AlarmClock,
  ArrowRightLeft,
  CircleAlert,
  CircleX,
  FileText,
  Handshake,
  Headset,
  ListChecks,
  TriangleAlert,
  Trophy,
  UserPlus,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { NotificationType } from '../types'

export const NOTIFICATION_TYPE_ICON: Record<NotificationType, LucideIcon> = {
  'deal.assigned': Handshake,
  'deal.stage_changed': ArrowRightLeft,
  'deal.won': Trophy,
  'deal.lost': CircleX,
  'task.assigned': ListChecks,
  'task.reminder': AlarmClock,
  'ticket.assigned': Headset,
  'ticket.sla_warning': TriangleAlert,
  'ticket.sla_breached': CircleAlert,
  'lead.assigned': UserPlus,
  'quote.status_changed': FileText,
}

/** Bilinmeyen/gelecekte eklenecek bir tip için güvenli varsayılan. */
export function notificationTypeIcon(type: NotificationType): LucideIcon {
  return NOTIFICATION_TYPE_ICON[type] ?? FileText
}

type RelativeStep = { limitSeconds: number; divisor: number; unit: Intl.RelativeTimeFormatUnit }

const RELATIVE_STEPS: RelativeStep[] = [
  { limitSeconds: 60, divisor: 1, unit: 'second' },
  { limitSeconds: 3600, divisor: 60, unit: 'minute' },
  { limitSeconds: 86400, divisor: 3600, unit: 'hour' },
  { limitSeconds: 604800, divisor: 86400, unit: 'day' },
  { limitSeconds: 2629800, divisor: 604800, unit: 'week' },
  { limitSeconds: 31557600, divisor: 2629800, unit: 'month' },
]

const relativeFormatter = new Intl.RelativeTimeFormat('tr', { numeric: 'auto' })

/**
 * ISO-8601 tarihi "5 dakika önce" gibi göreli metne çevirir. Projede `dayjs`/`date-fns` yok
 * (bkz. `package.json`) — yalnızca yerleşik `Intl.RelativeTimeFormat` kullanılır, ek bağımlılık
 * eklemez.
 */
export function formatRelativeTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso

  const diffSeconds = (date.getTime() - Date.now()) / 1000
  const absSeconds = Math.abs(diffSeconds)

  if (absSeconds < 5) return 'az önce'

  for (const { limitSeconds, divisor, unit } of RELATIVE_STEPS) {
    if (absSeconds < limitSeconds) {
      return relativeFormatter.format(Math.round(diffSeconds / divisor), unit)
    }
  }

  return relativeFormatter.format(Math.round(diffSeconds / 31557600), 'year')
}
