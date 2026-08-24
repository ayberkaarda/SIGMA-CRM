// SLA geri sayımı gösterimi — TÜM hesaplama `hooks/useSlaCountdown.ts`'te yapılır, bu dosya
// yalnızca sonucu YAZAR. İki varyant: `SlaCountdownInline` (liste tablosu hücresi, kompakt) ve
// `SlaCountdownPanel` (detay sayfası, büyük gösterge). İkisi de aynı hook'u kullandığı için
// tutarsızlık riski yoktur — biri "İhlal" derken diğeri "Kalan: 2s" diyemez.
import { AlertTriangle, PauseCircle } from 'lucide-react'
import { cn } from '../../../lib/cn'
import { useSlaCountdown } from '../hooks/useSlaCountdown'
import type { Ticket } from '../types'

function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds))
  const days = Math.floor(s / 86400)
  const hours = Math.floor((s % 86400) / 3600)
  const minutes = Math.floor((s % 3600) / 60)
  const seconds = s % 60
  if (days > 0) return `${days}g ${hours}s`
  if (hours > 0) return `${hours}s ${minutes}dk`
  if (minutes > 0) return `${minutes}dk ${seconds}sn`
  return `${seconds}sn`
}

type SlaCountdownProps = {
  ticket: Pick<Ticket, 'sla_remaining_seconds' | 'sla_paused' | 'sla_breached' | 'sla_total_seconds' | 'status' | 'sla_target_hours'>
}

/** Liste tablosundaki SLA hücresi — kompakt metin + ince ilerleme çubuğu. */
export function SlaCountdownInline({ ticket }: SlaCountdownProps) {
  const { remainingSeconds, isPaused, isBreached, progress } = useSlaCountdown(ticket)
  const isDone = ticket.status === 'resolved' || ticket.status === 'closed'

  if (remainingSeconds === null) {
    return (
      <span className={cn('text-sm', ticket.sla_breached ? 'text-danger' : isDone ? 'text-success' : 'text-fg-muted')}>
        {isDone ? (ticket.sla_breached ? 'İhlal (tarihsel)' : 'Karşılandı') : '—'}
      </span>
    )
  }

  return (
    <div className="flex min-w-28 flex-col gap-1">
      <span
        className={cn(
          'inline-flex items-center gap-1 text-sm font-medium',
          isBreached ? 'text-danger' : isPaused ? 'text-fg-muted' : 'text-fg'
        )}
      >
        {isPaused ? (
          <PauseCircle className="size-3.5 shrink-0" aria-hidden="true" />
        ) : isBreached ? (
          <AlertTriangle className="size-3.5 shrink-0" aria-hidden="true" />
        ) : null}
        {isPaused ? 'Duraklatıldı' : isBreached ? 'İhlal' : formatDuration(remainingSeconds)}
      </span>
      <div className="h-1.5 w-full overflow-hidden rounded-sm bg-surface-2" role="presentation">
        <div
          className={cn('h-full rounded-sm', isBreached ? 'bg-danger' : progress >= 0.8 ? 'bg-warning' : 'bg-primary')}
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      </div>
    </div>
  )
}

/** Detay sayfasındaki büyük SLA göstergesi — geri sayım + ilerleme çubuğu + hedef saat. */
export function SlaCountdownPanel({ ticket }: SlaCountdownProps) {
  const { remainingSeconds, isPaused, isBreached, progress } = useSlaCountdown(ticket)
  const isDone = ticket.status === 'resolved' || ticket.status === 'closed'

  if (remainingSeconds === null) {
    return (
      <div className="flex flex-col gap-2 rounded-lg border border-border-subtle bg-surface-2 p-4">
        <p className={cn('text-sm font-medium', ticket.sla_breached ? 'text-danger' : 'text-success')}>
          {isDone
            ? ticket.sla_breached
              ? 'SLA hedefi aşılarak çözüldü (tarihsel ihlal).'
              : 'SLA hedefi içinde çözüldü.'
            : 'SLA bilgisi mevcut değil.'}
        </p>
        <p className="text-xs text-fg-muted">Hedef: {ticket.sla_target_hours} saat</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border-subtle bg-surface-2 p-4">
      <div className="flex items-center justify-between gap-3">
        <span
          className={cn(
            'inline-flex items-center gap-1.5 text-lg font-semibold',
            isBreached ? 'text-danger' : isPaused ? 'text-fg-muted' : 'text-fg'
          )}
        >
          {isPaused ? (
            <PauseCircle className="size-5 shrink-0" aria-hidden="true" />
          ) : isBreached ? (
            <AlertTriangle className="size-5 shrink-0" aria-hidden="true" />
          ) : null}
          {isPaused ? 'Duraklatıldı' : isBreached ? 'İhlal' : formatDuration(remainingSeconds)}
        </span>
        <span className="text-xs text-fg-muted">Hedef: {ticket.sla_target_hours} saat</span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-sm bg-surface-3" role="presentation">
        <div
          className={cn('h-full rounded-sm transition-[width] duration-500', isBreached ? 'bg-danger' : progress >= 0.8 ? 'bg-warning' : 'bg-primary')}
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      </div>
      {isPaused && (
        <p className="text-xs text-fg-muted">Talep "Beklemede" durumundayken SLA sayacı durur; sayaç geri sayıma devam etmez.</p>
      )}
    </div>
  )
}
