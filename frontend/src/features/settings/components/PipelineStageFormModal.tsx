// Pipeline aşaması oluşturma/düzenleme modalı. `stage` prop'u verilmezse oluşturma modu.
//
// `is_won` / `is_lost` alanları burada HİÇ düzenlenemez — bunlar sistem aşamalarının sabit
// nitelikleridir, yeni oluşturulan bir aşama her zaman normal (ne kazanma ne kayıp) bir
// aşamadır. Düzenleme modunda sistem aşaması olduğu bir rozetle bilgilendirilir.
import { useState } from 'react'
import type { FormEvent } from 'react'
import { Badge, Button, Input, Modal, Select } from '../../../components/ui'
import { getFieldErrors } from '../../../lib/axios'
import { tokenBadgeVariant } from '../../../components/shared/tokenBadgeVariant'
import { useCreatePipelineStage, useUpdatePipelineStage } from '../hooks/usePipelineStages'
import { STAGE_COLOR_TOKENS } from '../types'
import type { PipelineStage } from '../types'

const COLOR_LABELS: Record<(typeof STAGE_COLOR_TOKENS)[number], string> = {
  primary: 'Birincil',
  success: 'Yeşil (Başarı)',
  danger: 'Kırmızı (Tehlike)',
  warning: 'Turuncu (Uyarı)',
  neutral: 'Gri (Nötr)',
  info: 'Mavi (Bilgi)',
}

const COLOR_OPTIONS = STAGE_COLOR_TOKENS.map((token) => ({ value: token, label: COLOR_LABELS[token] }))

export type PipelineStageFormModalProps = {
  open: boolean
  onClose: () => void
  stage?: PipelineStage | null
}

export function PipelineStageFormModal({ open, onClose, stage }: PipelineStageFormModalProps) {
  const isEdit = !!stage

  const createStage = useCreatePipelineStage()
  const updateStage = useUpdatePipelineStage()

  const [name, setName] = useState('')
  const [probability, setProbability] = useState('50')
  const [color, setColor] = useState<string>('neutral')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})

  const openKey = open ? (stage ? `edit-${stage.id}` : 'create') : null
  const [lastOpenKey, setLastOpenKey] = useState<string | null>(null)
  if (openKey !== lastOpenKey) {
    setLastOpenKey(openKey)
    if (openKey) {
      setName(stage?.name ?? '')
      setProbability(String(stage?.probability ?? 50))
      setColor(stage?.color ?? 'neutral')
      setFieldErrors({})
    }
  }

  const isPending = createStage.isPending || updateStage.isPending

  function fieldError(field: string): string | undefined {
    return fieldErrors[field]?.[0]
  }

  function validate(): boolean {
    const errors: Record<string, string[]> = {}
    if (!name.trim()) errors.name = ['Aşama adı zorunludur.']
    const probabilityNum = Number(probability)
    if (probability.trim() === '' || Number.isNaN(probabilityNum) || probabilityNum < 0 || probabilityNum > 100) {
      errors.probability = ['Olasılık 0 ile 100 arasında bir sayı olmalıdır.']
    }
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!validate()) return

    try {
      if (isEdit && stage) {
        await updateStage.mutateAsync({
          id: stage.id,
          payload: { name, probability: Number(probability), color },
        })
      } else {
        await createStage.mutateAsync({ name, probability: Number(probability), color })
      }
      onClose()
    } catch (error) {
      const serverFieldErrors = getFieldErrors(error)
      if (serverFieldErrors) setFieldErrors(serverFieldErrors)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Aşamayı Düzenle' : 'Yeni Aşama'}
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Vazgeç
          </Button>
          <Button type="submit" form="pipeline-stage-form" loading={isPending}>
            {isEdit ? 'Kaydet' : 'Oluştur'}
          </Button>
        </div>
      }
    >
      <form id="pipeline-stage-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        {isEdit && stage && (stage.is_won || stage.is_lost) && (
          <div className="flex items-center gap-2 rounded-md bg-surface-2 px-3 py-2">
            <Badge variant={stage.is_won ? 'success' : 'danger'}>{stage.is_won ? 'Kazanıldı (sistem)' : 'Kaybedildi (sistem)'}</Badge>
            <span className="text-xs text-fg-muted">Bu aşama sistem aşamasıdır, pasifleştirilemez.</span>
          </div>
        )}

        <Input label="Aşama Adı" value={name} onChange={(e) => setName(e.target.value)} error={fieldError('name')} required />

        <Input
          label="Kazanma Olasılığı (%)"
          type="number"
          min={0}
          max={100}
          value={probability}
          onChange={(e) => setProbability(e.target.value)}
          error={fieldError('probability')}
          required
        />

        <div className="flex flex-col gap-2">
          <Select label="Renk" value={color} onChange={(e) => setColor(e.target.value)} options={COLOR_OPTIONS} error={fieldError('color')} />
          <div className="flex items-center gap-2">
            <span className="text-xs text-fg-muted">Önizleme:</span>
            <Badge variant={tokenBadgeVariant(color)}>{name || 'Aşama Adı'}</Badge>
          </div>
        </div>
      </form>
    </Modal>
  )
}
