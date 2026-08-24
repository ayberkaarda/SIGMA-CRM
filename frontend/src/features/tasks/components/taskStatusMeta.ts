// Görev durumu sabitleri — `TaskStatusBadge.tsx`'ten AYRI (bkz. `priorityMeta.ts` başındaki
// aynı gerekçe).
import type { TaskStatus } from '../types'
import type { BadgeProps } from '../../../components/ui'

export const STATUS_VARIANT: Record<TaskStatus, NonNullable<BadgeProps['variant']>> = {
  pending: 'neutral',
  in_progress: 'primary',
  completed: 'success',
  cancelled: 'danger',
}

export const STATUS_LABEL: Record<TaskStatus, string> = {
  pending: 'Beklemede',
  in_progress: 'Devam Ediyor',
  completed: 'Tamamlandı',
  cancelled: 'İptal Edildi',
}

export const STATUS_OPTIONS = (Object.keys(STATUS_LABEL) as TaskStatus[]).map((value) => ({
  value,
  label: STATUS_LABEL[value],
}))

/** Oluşturma/düzenleme formunda `completed` seçilemez — tamamlama ayrı bir akış (bkz. görev tanımı,
 * ve `TaskFormModal.tsx` başındaki genişletilmiş gerekçe: backend `/complete` dışındaki uçlardan
 * `completed_at`'i asla yazmaz). */
export const CREATE_STATUS_OPTIONS = STATUS_OPTIONS.filter((option) => option.value !== 'completed')
