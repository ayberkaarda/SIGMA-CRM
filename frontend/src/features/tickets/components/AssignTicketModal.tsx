// Atama modalı — `PATCH /api/tickets/{id}/assign` ({ assigned_to }). Liste ve detay
// sayfalarının ikisi de kullanır (bkz. `deals/components/AssignDealOwnerModal.tsx` deseni).
//
// Deals'tan FARKI: backend `AssignTicketRequest` `assigned_to`'nun NULL olmasına izin verir
// (bkz. o dosyanın gerekçesi: yanlış kişiye düşmüş bir talebi havuza geri bırakmak gerçek bir
// destek akışıdır) — bu yüzden burada "Atamayı kaldır" seçeneği de sunulur.
import { useState } from 'react'
import { Button, Modal, Select } from '../../../components/ui'
import { useAssignTicket } from '../api/ticketsApi'
import { useTicketUserOptions } from './ticketsShared'
import type { Ticket } from '../types'

export type AssignTicketModalProps = {
  open: boolean
  onClose: () => void
  ticket: Ticket | null
}

const UNASSIGNED_VALUE = '__unassigned__'

export function AssignTicketModal({ open, onClose, ticket }: AssignTicketModalProps) {
  const { data: userOptions, isForbidden } = useTicketUserOptions()
  const assignTicket = useAssignTicket()
  const [assignedTo, setAssignedTo] = useState(UNASSIGNED_VALUE)

  const openKey = open ? `assign-${ticket?.id}` : null
  const [lastOpenKey, setLastOpenKey] = useState<string | null>(null)
  if (openKey !== lastOpenKey) {
    setLastOpenKey(openKey)
    if (openKey) setAssignedTo(ticket?.assignee ? String(ticket.assignee.id) : UNASSIGNED_VALUE)
  }

  if (!ticket) return null

  async function handleAssign() {
    if (!ticket) return
    await assignTicket.mutateAsync({ id: ticket.id, assignedTo: assignedTo === UNASSIGNED_VALUE ? null : Number(assignedTo) })
    onClose()
  }

  const options = [
    { value: UNASSIGNED_VALUE, label: 'Atanmamış (havuza bırak)' },
    ...(userOptions ?? []).map((u) => ({ value: String(u.id), label: u.name })),
  ]

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Talep Ata"
      description={`${ticket.ticket_number} — ${ticket.subject} için atanan kişiyi seçin.`}
      size="sm"
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Vazgeç
          </Button>
          <Button type="button" loading={assignTicket.isPending} onClick={handleAssign}>
            Ata
          </Button>
        </div>
      }
    >
      {isForbidden ? (
        <p className="text-sm text-fg-muted">Kullanıcı listesine erişim izniniz yok.</p>
      ) : (
        <Select label="Atanan" value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} options={options} />
      )}
    </Modal>
  )
}
