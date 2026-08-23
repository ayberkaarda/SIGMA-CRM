// Loglar modülü biçimlendirme yardımcıları — Türkçe etiketler, insan-okunur süre/tarih.
import type { BadgeProps } from '../../components/ui'
import type { ActivityEvent, LogContext, SessionEvent } from './types'

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  try {
    return new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium', timeStyle: 'short' }).format(
      new Date(iso),
    )
  } catch {
    return iso
  }
}

/** "2 sa 14 dk" / "14 dk" / "45 sn" biçiminde insan-okunur süre. */
export function formatDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined) return '—'
  if (seconds < 60) return `${Math.max(0, Math.round(seconds))} sn`

  const totalMinutes = Math.floor(seconds / 60)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (hours > 0) return minutes > 0 ? `${hours} sa ${minutes} dk` : `${hours} sa`
  return `${minutes} dk`
}

export const SESSION_EVENT_LABELS: Record<SessionEvent, string> = {
  login: 'Giriş',
  logout: 'Çıkış',
  failed_login: 'Başarısız Giriş',
  locked_out: 'Hesap Kilitlendi',
}

export const SESSION_EVENT_BADGE: Record<SessionEvent, NonNullable<BadgeProps['variant']>> = {
  login: 'success',
  logout: 'neutral',
  failed_login: 'danger',
  locked_out: 'warning',
}

export const SESSION_EVENT_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'login', label: SESSION_EVENT_LABELS.login },
  { value: 'logout', label: SESSION_EVENT_LABELS.logout },
  { value: 'failed_login', label: SESSION_EVENT_LABELS.failed_login },
  { value: 'locked_out', label: SESSION_EVENT_LABELS.locked_out },
]

export const ACTIVITY_EVENT_LABELS: Record<string, string> = {
  created: 'Oluşturuldu',
  updated: 'Güncellendi',
  deleted: 'Silindi',
  restored: 'Geri Yüklendi',
}

export const ACTIVITY_EVENT_BADGE: Record<string, NonNullable<BadgeProps['variant']>> = {
  created: 'success',
  updated: 'primary',
  deleted: 'danger',
  restored: 'warning',
}

export function activityEventLabel(event: ActivityEvent | string): string {
  return ACTIVITY_EVENT_LABELS[event] ?? event
}

export function activityEventBadgeVariant(
  event: ActivityEvent | string,
): NonNullable<BadgeProps['variant']> {
  return ACTIVITY_EVENT_BADGE[event] ?? 'neutral'
}

/** `IndexLogRequest`'in kabul ettiği 4 değer (soft-delete geri alma dahil). */
export const ACTIVITY_FILTER_EVENT_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'created', label: ACTIVITY_EVENT_LABELS.created },
  { value: 'updated', label: ACTIVITY_EVENT_LABELS.updated },
  { value: 'deleted', label: ACTIVITY_EVENT_LABELS.deleted },
  { value: 'restored', label: ACTIVITY_EVENT_LABELS.restored },
]

/** `LogRepository::SUBJECT_TYPE_MAP` ile birebir — kısa ad -> Türkçe etiket. */
export const SUBJECT_TYPE_LABELS: Record<string, string> = {
  lead: 'Aday',
  contact: 'Kişi',
  company: 'Şirket',
  deal: 'Anlaşma',
  task: 'Görev',
  activity: 'Aktivite',
  ticket: 'Talep',
  quote: 'Teklif',
  product: 'Ürün',
  user: 'Kullanıcı',
}

export const SUBJECT_TYPE_OPTIONS: Array<{ value: string; label: string }> = Object.entries(
  SUBJECT_TYPE_LABELS,
).map(([value, label]) => ({ value, label }))

export function subjectTypeLabel(subjectType: string | null): string {
  if (!subjectType) return '—'
  return SUBJECT_TYPE_LABELS[subjectType] ?? subjectType
}

/** Canlı akış payload'ındaki `context` -> causer'sız satır etiketi. */
export const CONTEXT_LABELS: Record<LogContext, string> = {
  http: 'Sistem',
  system: 'Sistem',
  console: 'Konsol',
  queue: 'Kuyruk',
  seed: 'Tohumlama',
  test: 'Test',
}

export function contextLabel(context: LogContext | string): string {
  return CONTEXT_LABELS[context as LogContext] ?? 'Sistem'
}

/** Bir değeri okunabilir kısa metne çevirir — diff görünümünde `<pre>` yerine kullanılır. */
export function formatDiffValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'boolean') return value ? 'Evet' : 'Hayır'
  if (typeof value === 'number') return String(value)
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}
