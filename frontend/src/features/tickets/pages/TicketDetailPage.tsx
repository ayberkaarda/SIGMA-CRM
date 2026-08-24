// Destek Talebi detay sayfası — SLA göstergesi, durum akışı kontrolü, notlar/etkileşimler,
// bağlı görevler. Sayfa yapısı `deals/pages/DealDetailPage.tsx` deseniyle uyumludur.
import { useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Building2, Pencil, Trash2, User as UserIcon, Users } from 'lucide-react'
import { Badge, Button, Card, CardBody, CardHeader, Modal, Skeleton } from '../../../components/ui'
import { usePermission } from '../../auth/hooks/usePermission'
import { RecordChatPanel } from '../../chat/record'
import { TicketPriorityBadge } from '../components/TicketPriorityBadge'
import { TicketStatusBadge } from '../components/TicketStatusBadge'
import { TicketStatusControl } from '../components/TicketStatusControl'
import { SlaCountdownPanel } from '../components/SlaCountdown'
import { TicketFormModal } from '../components/TicketFormModal'
import { AssignTicketModal } from '../components/AssignTicketModal'
import { TicketActivityPanel } from '../components/TicketActivityPanel'
import { TicketTasksPanel } from '../components/TicketTasksPanel'
import { useDeleteTicket, useTicket } from '../api/ticketsApi'
import { useTicketRealtime } from '../hooks/useTicketRealtime'

function formatDateTime(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso))
  } catch {
    return iso
  }
}

export function TicketDetailPage() {
  const params = useParams<{ id: string }>()
  const ticketId = Number(params.id)
  const navigate = useNavigate()
  const { can } = usePermission()

  // Yalnızca bu ticket'ın SLA olaylarıyla ilgilenmiyoruz — kanal modül-geneli (tek `private-
  // tickets`), bu yüzden hook parametresizdir ve cache'te bu ticket'ı bulursa yamar (bkz. hook
  // başındaki gerekçe).
  useTicketRealtime()

  const { data: ticket, isLoading, isError, refetch } = useTicket(Number.isFinite(ticketId) ? ticketId : undefined)
  const deleteTicket = useDeleteTicket()

  const [editOpen, setEditOpen] = useState(false)
  const [assignOpen, setAssignOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton variant="text" width={200} />
        <Card>
          <CardBody>
            <div className="flex flex-col gap-3">
              <Skeleton variant="text" width={220} height={24} />
              <Skeleton variant="text" width={320} />
              <Skeleton variant="text" width={280} />
            </div>
          </CardBody>
        </Card>
      </div>
    )
  }

  if (isError || !ticket) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <p className="text-sm text-fg-muted">Talep yüklenirken bir hata oluştu.</p>
        <Button variant="secondary" onClick={() => refetch()}>
          Tekrar dene
        </Button>
      </div>
    )
  }

  const canDelete = ticket.status !== 'resolved' && ticket.status !== 'closed'

  return (
    <div className="flex flex-col gap-4">
      <nav aria-label="breadcrumb" className="flex items-center gap-1.5 text-xs text-fg-muted">
        <Link to="/tickets" className="inline-flex items-center gap-1 hover:text-fg">
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          Destek Talepleri
        </Link>
        <span className="mx-1">/</span>
        <span className="text-primary">{ticket.ticket_number}</span>
      </nav>

      <Card>
        <CardHeader
          title={`${ticket.ticket_number} — ${ticket.subject}`}
          action={
            <div className="flex items-center gap-2">
              {can('tickets.assign') && (
                <Button variant="secondary" leftIcon={<Users className="size-4" aria-hidden="true" />} onClick={() => setAssignOpen(true)}>
                  Ata
                </Button>
              )}
              {can('tickets.update') && (
                <Button variant="secondary" leftIcon={<Pencil className="size-4" aria-hidden="true" />} onClick={() => setEditOpen(true)}>
                  Düzenle
                </Button>
              )}
              {canDelete && can('tickets.delete') && (
                <Button variant="danger" leftIcon={<Trash2 className="size-4" aria-hidden="true" />} onClick={() => setDeleteOpen(true)}>
                  Sil
                </Button>
              )}
            </div>
          }
        >
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <TicketPriorityBadge priority={ticket.priority} />
            <TicketStatusBadge status={ticket.status} />
            {ticket.category && <Badge variant="neutral">{ticket.category}</Badge>}
          </div>
        </CardHeader>
        <CardBody className="flex flex-col gap-6">
          <SlaCountdownPanel ticket={ticket} />

          <TicketStatusControl ticket={ticket} />

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <DetailField label="Firma">
              {ticket.company ? (
                <Link to={`/companies/${ticket.company.id}`} className="flex items-center gap-1.5 text-sm text-primary hover:underline">
                  <Building2 className="size-3.5" aria-hidden="true" />
                  {ticket.company.name}
                </Link>
              ) : (
                <span className="text-sm text-fg-muted">—</span>
              )}
            </DetailField>
            <DetailField label="Kişi">
              {ticket.contact ? (
                <Link to={`/contacts/${ticket.contact.id}`} className="flex items-center gap-1.5 text-sm text-primary hover:underline">
                  <UserIcon className="size-3.5" aria-hidden="true" />
                  {ticket.contact.full_name}
                </Link>
              ) : (
                <span className="text-sm text-fg-muted">—</span>
              )}
            </DetailField>
            <DetailField label="Atanan">
              <span className="text-sm text-fg">{ticket.assignee?.name ?? 'Atanmamış'}</span>
            </DetailField>
            <DetailField label="Oluşturan">
              <span className="text-sm text-fg">{ticket.creator?.name ?? '—'}</span>
            </DetailField>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-fg-muted">Açıklama</span>
            <p className="whitespace-pre-wrap text-sm text-fg-secondary">{ticket.description}</p>
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">Etiketler</p>
            <div className="flex flex-wrap gap-1.5">
              {ticket.tags.length === 0 && <span className="text-sm text-fg-muted">Etiket yok.</span>}
              {ticket.tags.map((tag) => (
                <Badge key={tag.id} variant="neutral">
                  {tag.name}
                </Badge>
              ))}
            </div>
          </div>
        </CardBody>
      </Card>

      {Object.keys(ticket.custom_fields).length > 0 && (
        <Card>
          <CardHeader title="Özel Alanlar" />
          <CardBody>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Object.entries(ticket.custom_fields).map(([key, value]) => (
                <div key={key} className="flex flex-col gap-1">
                  <dt className="text-xs font-medium text-fg-muted">{key}</dt>
                  <dd className="text-sm text-fg">{value || '—'}</dd>
                </div>
              ))}
            </dl>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader title="Zaman Damgaları" />
        <CardBody>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <TimestampField label="Oluşturma" value={formatDateTime(ticket.created_at)} />
            <TimestampField
              label="İlk Yanıt"
              value={ticket.first_response_at ? formatDateTime(ticket.first_response_at) : 'Henüz yanıt verilmedi'}
              muted={!ticket.first_response_at}
            />
            <TimestampField label="Çözüm" value={ticket.resolved_at ? formatDateTime(ticket.resolved_at) : '—'} muted={!ticket.resolved_at} />
            <TimestampField label="Kapanış" value={ticket.closed_at ? formatDateTime(ticket.closed_at) : '—'} muted={!ticket.closed_at} />
            <TimestampField label="SLA Hedefi" value={ticket.sla_due_at ? formatDateTime(ticket.sla_due_at) : '—'} />
            <TimestampField label="SLA Hedef Süresi" value={`${ticket.sla_target_hours} saat`} />
          </dl>
        </CardBody>
      </Card>

      <TicketActivityPanel ticket={ticket} />

      <TicketTasksPanel ticket={ticket} />

      <RecordChatPanel recordType="ticket" recordId={ticket.id} />

      <TicketFormModal open={editOpen} onClose={() => setEditOpen(false)} ticket={ticket} />
      <AssignTicketModal open={assignOpen} onClose={() => setAssignOpen(false)} ticket={ticket} />

      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Talebi sil"
        description="Bu işlem geri alınamaz. Talep kalıcı olarak silinecek."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDeleteOpen(false)}>
              Vazgeç
            </Button>
            <Button
              variant="danger"
              loading={deleteTicket.isPending}
              onClick={async () => {
                await deleteTicket.mutateAsync(ticket.id)
                setDeleteOpen(false)
                navigate('/tickets')
              }}
            >
              Sil
            </Button>
          </div>
        }
      >
        <p className="text-sm text-fg-secondary">
          <strong className="text-fg">
            {ticket.ticket_number} — {ticket.subject}
          </strong>{' '}
          adlı talebi silmek istediğinize emin misiniz?
        </p>
      </Modal>
    </div>
  )
}

function DetailField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">{label}</p>
      {children}
    </div>
  )
}

function TimestampField({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs font-medium text-fg-muted">{label}</dt>
      <dd className={muted ? 'text-sm text-fg-muted' : 'text-sm text-fg'}>{value}</dd>
    </div>
  )
}
