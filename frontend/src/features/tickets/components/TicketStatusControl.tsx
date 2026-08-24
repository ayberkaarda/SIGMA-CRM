// Durum akışı kontrolü — `docs/SLA-DESIGN.md` §4. Yalnızca `STATUS_TRANSITIONS`'ta o anki
// durum için listelenen HEDEFLER buton olarak sunulur; backend'in 422
// `INVALID_STATUS_TRANSITION`'ı KULLANICIYA HİÇ GÖSTERİLMEZ (görev tanımı: "UI yalnızca geçerli
// geçişleri sunmalı"). `closed` terminal olduğu için o durumda hiç buton kalmaz.
//
// ÇÖZÜM NOTU — backend'de `resolution_note` diye bir ALAN YOKTUR (`StatusTicketRequest` yalnızca
// `status`'ü doğrular). Bu yüzden not istemcide UYDURULMAZ: kullanıcı "Çözüldü" durumuna
// geçerken opsiyonel bir not girerse, bu `POST /api/activities` ile `type: 'note'` olarak
// talebe bağlı NORMAL bir iç nota dönüşür (aynı mekanizma `TicketActivityFormModal`'ın
// kullandığı — bkz. `TicketResource` dokümanındaki "İç notlar için ayrı tablo yok" gerekçesi).
// Durum geçişi ile not kaydı iki AYRI istektir; not boşsa hiç gönderilmez.
import { useState } from 'react'
import type { FormEvent } from 'react'
import { Button, Modal, Textarea } from '../../../components/ui'
import { getErrorMessage } from '../../../lib/axios'
import { toast } from '../../../components/ui'
import { useCreateActivity } from '../../activities/api/activitiesApi'
import { useChangeTicketStatus } from '../api/ticketsApi'
import { allowedTransitions, STATUS_LABEL } from './ticketStatusMeta'
import type { Ticket, TicketStatus } from '../types'

export function TicketStatusControl({ ticket }: { ticket: Ticket }) {
  const changeStatus = useChangeTicketStatus()
  const createNote = useCreateActivity()

  const [resolveOpen, setResolveOpen] = useState(false)
  const [resolutionNote, setResolutionNote] = useState('')
  const [pendingTarget, setPendingTarget] = useState<TicketStatus | null>(null)

  const targets = allowedTransitions(ticket.status)

  async function runTransition(target: TicketStatus) {
    setPendingTarget(target)
    try {
      await changeStatus.mutateAsync({ id: ticket.id, status: target })
    } finally {
      setPendingTarget(null)
    }
  }

  function handleClick(target: TicketStatus) {
    if (target === 'resolved') {
      setResolutionNote('')
      setResolveOpen(true)
      return
    }
    void runTransition(target)
  }

  async function handleResolveSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPendingTarget('resolved')
    try {
      await changeStatus.mutateAsync({ id: ticket.id, status: 'resolved' })
      if (resolutionNote.trim()) {
        try {
          await createNote.mutateAsync({
            type: 'note',
            subject: 'Çözüm notu',
            body: resolutionNote.trim(),
            occurred_at: new Date().toISOString(),
            activityable_type: 'ticket',
            activityable_id: ticket.id,
          })
        } catch (error) {
          // Durum geçişi zaten BAŞARILI oldu (üstteki await patlamadı); not eklemesi ayrı bir
          // istektir ve başarısız olsa dahi durum geçişini GERİ ALMAYIZ — kullanıcıyı yalnızca
          // notun kaydedilmediği konusunda uyarırız.
          toast.error(`Durum güncellendi ama not kaydedilemedi: ${getErrorMessage(error)}`)
        }
      }
      setResolveOpen(false)
    } finally {
      setPendingTarget(null)
    }
  }

  if (targets.length === 0) {
    return <p className="text-sm text-fg-muted">"Kapandı" durumu terminaldir; bu talebin durumu artık değiştirilemez.</p>
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-fg-muted">Durumu değiştir:</span>
        {targets.map((target) => (
          <Button
            key={target}
            type="button"
            variant="secondary"
            size="sm"
            loading={changeStatus.isPending && pendingTarget === target}
            disabled={changeStatus.isPending && pendingTarget !== target}
            onClick={() => handleClick(target)}
          >
            {STATUS_LABEL[target]}
          </Button>
        ))}
      </div>

      <Modal
        open={resolveOpen}
        onClose={() => setResolveOpen(false)}
        title="Talebi Çözüldü Olarak İşaretle"
        description="Çözüm notu eklemek zorunlu değildir ama önerilir — eklerseniz talebe iç not olarak kaydedilir."
        footer={
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setResolveOpen(false)}>
              Vazgeç
            </Button>
            <Button type="submit" form="ticket-resolve-form" loading={changeStatus.isPending && pendingTarget === 'resolved'}>
              Çözüldü Olarak İşaretle
            </Button>
          </div>
        }
      >
        <form id="ticket-resolve-form" onSubmit={handleResolveSubmit}>
          <Textarea
            label="Çözüm Notu (opsiyonel)"
            value={resolutionNote}
            onChange={(e) => setResolutionNote(e.target.value)}
            placeholder="Sorun nasıl çözüldü?"
          />
        </form>
      </Modal>
    </>
  )
}
