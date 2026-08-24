// Kayıp/kazanma nedeni sorgusu — kart kapanış aşamasına bırakıldığında, İSTEK GÖNDERİLMEDEN
// ÖNCE açılır.
//
// Neden önce sorulur: `lost_reason` sunucuda ZORUNLUDUR. Önce istek gönderip 422 aldıktan
// sonra sormak, kullanıcıya önce bir hata gösterip sonra form açmak demektir; üstelik iyimser
// güncelleme bu arada geri alınıp tekrar uygulanacağı için kart iki kez zıplar.
//
// İptal, "kartı yine de taşı" anlamına GELMEZ: iyimser güncelleme geri alınır ve istek hiç
// gitmez (bkz. `useDealBoard.cancelReason`).
import { useState } from 'react'
import { Button, Modal, Textarea } from '../../../../components/ui'
import type { PendingReasonMove } from '../../hooks/useDealBoard'

export type StageReasonModalProps = {
  pending: PendingReasonMove | null
  onSubmit: (reason: string) => void
  onCancel: () => void
}

export function StageReasonModal({ pending, onSubmit, onCancel }: StageReasonModalProps) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | undefined>(undefined)

  // Yeni bir bekleyen taşıma geldiğinde alan sıfırlanır; aksi hâlde bir önceki kartın
  // nedeni yeni kartta hazır dururdu. Bu, efektle değil RENDER SIRASINDA prop değişimine
  // uyum deseniyle yapılır: efektle yazılsaydı modal bir kare eski metinle çizilir, sonra
  // ikinci bir render'da temizlenirdi.
  const pendingKey = pending ? `${pending.dealId}-${pending.kind}` : null
  const [lastPendingKey, setLastPendingKey] = useState<string | null>(pendingKey)
  if (pendingKey !== lastPendingKey) {
    setLastPendingKey(pendingKey)
    setReason('')
    setError(undefined)
  }

  const isLost = pending?.kind === 'lost'

  function handleSubmit() {
    if (isLost && reason.trim() === '') {
      setError('Kayıp nedeni zorunludur.')
      return
    }
    onSubmit(reason)
  }

  return (
    <Modal
      open={pending !== null}
      onClose={onCancel}
      // Zorunlu alan varken arka plana tıklayarak kapatmak, kullanıcının farkında olmadan
      // taşımayı iptal etmesine yol açar.
      closeOnBackdrop={!isLost}
      size="md"
      title={isLost ? 'Kayıp nedeni' : 'Kazanma nedeni'}
      description={
        pending
          ? `"${pending.dealTitle}" kartı "${pending.stageName}" aşamasına taşınıyor.`
          : undefined
      }
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel}>
            Vazgeç
          </Button>
          <Button variant={isLost ? 'danger' : 'primary'} onClick={handleSubmit}>
            {isLost ? 'Kaybedildi olarak taşı' : 'Kazanıldı olarak taşı'}
          </Button>
        </div>
      }
    >
      <Textarea
        label={isLost ? 'Kayıp nedeni' : 'Kazanma nedeni (opsiyonel)'}
        value={reason}
        onChange={(event) => {
          setReason(event.target.value)
          if (error) setError(undefined)
        }}
        error={error}
        maxLength={255}
        rows={3}
        placeholder={
          isLost ? 'Örn. Fiyat rakip teklifin üzerinde kaldı' : 'Örn. Referans müşteri etkisi'
        }
        hint={
          isLost
            ? 'Kayıp nedeni satış analitiğinin en değerli verisidir; bu yüzden zorunludur.'
            : 'Boş bırakabilirsiniz.'
        }
      />
    </Modal>
  )
}
