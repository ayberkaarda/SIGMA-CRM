// Açık fırsatı olan bir aşama pasifleştirilmek istendiğinde açılan ikinci adım modalı.
//
// AKIŞ (görev tanımı): `PipelineStagesTab` önce `PATCH .../pipeline-stages/{id}` ile
// `{ is_active: false }` gönderir. Backend açık fırsat varsa 422 `STAGE_HAS_OPEN_DEALS` döner
// (`open_deals_count` + `available_stages`) — bu modal O ANDA açılır. Kullanıcı hedef aşamayı
// seçip onaylayınca `PipelineStagesTab` aynı ucu bu kez `{ is_active: false, move_to_stage_id }`
// ile tekrar çağırır.
import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button, Modal, Select } from '../../../components/ui'

export type DeactivateStageModalProps = {
  open: boolean
  stageName: string
  openDealsCount: number
  availableStages: { id: number; name: string }[]
  isSubmitting: boolean
  onClose: () => void
  onConfirm: (moveToStageId: number) => void
}

export function DeactivateStageModal({
  open,
  stageName,
  openDealsCount,
  availableStages,
  isSubmitting,
  onClose,
  onConfirm,
}: DeactivateStageModalProps) {
  const [selectedId, setSelectedId] = useState<string>('')

  const options = availableStages.map((stage) => ({ value: String(stage.id), label: stage.name }))

  return (
    <Modal
      open={open}
      onClose={() => {
        setSelectedId('')
        onClose()
      }}
      title="Aşamayı Pasifleştir"
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Vazgeç
          </Button>
          <Button
            type="button"
            variant="primary"
            loading={isSubmitting}
            disabled={!selectedId}
            onClick={() => selectedId && onConfirm(Number(selectedId))}
          >
            Taşı ve Pasifleştir
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-2 rounded-md bg-warning-tint px-3 py-2 text-sm text-warning">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>
            <strong>{stageName}</strong> aşamasında {openDealsCount} açık fırsat var. Pasifleştirmeden önce hangi
            aşamaya taşınsın?
          </span>
        </div>

        <Select
          label="Hedef Aşama"
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          options={options}
          placeholder="Bir aşama seçin…"
        />
      </div>
    </Modal>
  )
}
