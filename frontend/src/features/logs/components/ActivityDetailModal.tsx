// Aksiyon detay modalı — `properties.old` ve `properties.attributes`'ı yan yana diff olarak
// gösterir. `dangerouslySetInnerHTML` KULLANILMAZ; değerler `formatDiffValue` ile düz metne
// çevrilip normal metin node'u olarak basılır. `<pre>` yerine alan-bazlı satırlar kullanılır
// (bkz. görev tanımı: "Değerler `<pre>` yerine düzgün biçimlendirilsin").
//
// Kırpma iki bağımsız düzeyde işaretlenir:
//   - `properties._truncated: string[]` — hangi ALANLARIN değeri DB'deki 1024 karakter
//     sınırında kırpıldığı (alan bazlı not, bkz. `row.isTruncated`).
//   - `properties._response_truncated: boolean` — yanıtın TAMAMI (old+attributes JSON'u) 5000
//     karakteri aştıysa; alan bazlı kırpmadan bağımsız, genel bir uyarı bandı olarak gösterilir.
import { ArrowRight } from 'lucide-react'
import { Badge, Modal } from '../../../components/ui'
import { cn } from '../../../lib/cn'
import type { ActivityLog } from '../types'
import {
  activityEventBadgeVariant,
  activityEventLabel,
  contextLabel,
  formatDateTime,
  formatDiffValue,
  subjectTypeLabel,
} from '../utils'

export type ActivityDetailModalProps = {
  activity: ActivityLog | null
  onClose: () => void
}

type DiffRow = {
  field: string
  oldValue: unknown
  newValue: unknown
  changed: boolean
  isNewField: boolean
  isRemovedField: boolean
  isTruncated: boolean
}

function buildDiffRows(activity: ActivityLog): DiffRow[] {
  const { old, attributes, _truncated } = activity.properties
  const fields = new Set<string>([...Object.keys(old ?? {}), ...Object.keys(attributes ?? {})])
  const truncatedFields = new Set(_truncated ?? [])

  return Array.from(fields)
    .sort((a, b) => a.localeCompare(b, 'tr'))
    .map((field) => {
      const hasOld = old ? Object.prototype.hasOwnProperty.call(old, field) : false
      const hasNew = attributes ? Object.prototype.hasOwnProperty.call(attributes, field) : false
      const oldValue = hasOld ? old[field] : undefined
      const newValue = hasNew ? attributes[field] : undefined
      return {
        field,
        oldValue,
        newValue,
        changed: hasOld && hasNew && formatDiffValue(oldValue) !== formatDiffValue(newValue),
        isNewField: hasNew && !hasOld,
        isRemovedField: hasOld && !hasNew,
        isTruncated: truncatedFields.has(field),
      }
    })
}

export function ActivityDetailModal({ activity, onClose }: ActivityDetailModalProps) {
  const rows = activity ? buildDiffRows(activity) : []

  return (
    <Modal
      open={!!activity}
      onClose={onClose}
      size="lg"
      title={activity ? activity.description || activityEventLabel(activity.event) : undefined}
      description={
        activity
          ? `${subjectTypeLabel(activity.subject_type)}${activity.subject_label ? ` · ${activity.subject_label}` : activity.subject_id ? ` · #${activity.subject_id}` : ''} · ${formatDateTime(activity.created_at)}`
          : undefined
      }
    >
      {activity && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={activityEventBadgeVariant(activity.event)}>
              {activityEventLabel(activity.event)}
            </Badge>
            <Badge variant="neutral">
              {activity.causer
                ? activity.causer.name
                : contextLabel(activity.properties._context ?? 'system')}
            </Badge>
            {activity.log_name && (
              <Badge variant="neutral" className="font-mono">
                {activity.log_name}
              </Badge>
            )}
          </div>

          {activity.properties._response_truncated && (
            <div className="rounded-md bg-warning-tint px-3 py-2 text-xs text-warning">
              Bu kaydın değişiklik verisi boyut sınırı nedeniyle kısmen kırpılmış olabilir.
            </div>
          )}

          {rows.length === 0 ? (
            <p className="text-sm text-fg-muted">Bu kayıt için değişiklik ayrıntısı bulunmuyor.</p>
          ) : (
            <div className="flex flex-col divide-y divide-border-subtle overflow-hidden rounded-md border border-border-subtle">
              <div className="grid grid-cols-[minmax(0,120px)_1fr_auto_1fr] gap-3 bg-surface-2 px-3 py-2 text-xs font-medium text-fg-muted">
                <span>Alan</span>
                <span>Eski</span>
                <span aria-hidden="true" />
                <span>Yeni</span>
              </div>
              {rows.map((row) => (
                <div
                  key={row.field}
                  className="grid grid-cols-[minmax(0,120px)_1fr_auto_1fr] items-start gap-3 px-3 py-2.5"
                >
                  <span className="flex flex-col gap-0.5">
                    <span className="break-words font-mono text-xs text-fg-secondary">
                      {row.field}
                    </span>
                    {row.isTruncated && (
                      <span className="text-xs leading-tight text-warning">
                        (1024 karakterde kırpıldı)
                      </span>
                    )}
                  </span>
                  <span
                    className={cn(
                      'whitespace-pre-wrap break-words text-xs',
                      row.isNewField ? 'text-fg-disabled' : 'text-fg',
                    )}
                  >
                    {row.isNewField ? '—' : formatDiffValue(row.oldValue)}
                  </span>
                  <ArrowRight
                    className="mt-0.5 size-3.5 shrink-0 text-fg-muted"
                    aria-hidden="true"
                  />
                  <span
                    className={cn(
                      'whitespace-pre-wrap break-words text-xs',
                      row.isRemovedField
                        ? 'text-fg-disabled'
                        : row.changed || row.isNewField
                          ? 'text-primary'
                          : 'text-fg',
                    )}
                  >
                    {row.isRemovedField ? '—' : formatDiffValue(row.newValue)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}
