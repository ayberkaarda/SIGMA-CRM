// Müşteri Adayı detay sayfası — özet kart, dönüşüm şeridi, özel alanlar, notlar.
import { useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Building2, CheckCircle2, Mail, Pencil, Phone, Repeat, Trash2, Users } from 'lucide-react'
import { Avatar, Badge, Button, Card, CardBody, CardHeader, Modal, Skeleton } from '../../../components/ui'
import { usePermission } from '../../auth/hooks/usePermission'
import { useDeleteLead, useLead } from '../api/leadsApi'
import { LeadFormModal } from '../components/LeadFormModal'
import { ConvertLeadModal } from '../components/ConvertLeadModal'
import { AssignOwnerModal } from '../components/AssignOwnerModal'
import { ScoreIndicator } from '../components/ScoreIndicator'
import { SOURCE_LABELS, STATUS_BADGE_VARIANT, STATUS_LABELS, formatDateTime } from '../utils'

export function LeadDetailPage() {
  const params = useParams<{ id: string }>()
  const leadId = Number(params.id)
  const navigate = useNavigate()
  const { can } = usePermission()

  const { data: lead, isLoading, isError, refetch } = useLead(Number.isFinite(leadId) ? leadId : undefined)
  const deleteLead = useDeleteLead()

  const [editOpen, setEditOpen] = useState(false)
  const [convertOpen, setConvertOpen] = useState(false)
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

  if (isError || !lead) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <p className="text-sm text-fg-muted">Müşteri adayı yüklenirken bir hata oluştu.</p>
        <Button variant="secondary" onClick={() => refetch()}>
          Tekrar dene
        </Button>
      </div>
    )
  }

  const isConverted = lead.status === 'converted'

  return (
    <div className="flex flex-col gap-4">
      <nav aria-label="breadcrumb" className="flex items-center gap-1.5 text-xs text-fg-muted">
        <Link to="/leads" className="inline-flex items-center gap-1 hover:text-fg">
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          Müşteri Adayları
        </Link>
        <span className="mx-1">/</span>
        <span className="text-primary">{lead.full_name}</span>
      </nav>

      {isConverted && (
        <div className="flex flex-col gap-2 rounded-lg bg-success-tint p-4 text-success sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-5 shrink-0" aria-hidden="true" />
            <p className="text-sm font-medium">
              Bu aday {formatDateTime(lead.converted_at)} tarihinde müşteriye dönüştürüldü.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 text-xs font-medium">
            {lead.converted_contact_id && (
              <Link to={`/contacts/${lead.converted_contact_id}`} className="underline hover:no-underline">
                Kişi kaydına git
              </Link>
            )}
            {lead.converted_company_id && (
              <Link to={`/companies/${lead.converted_company_id}`} className="underline hover:no-underline">
                Firma kaydına git
              </Link>
            )}
            {lead.converted_deal_id && (
              // Fırsat (Deal) route'u henüz yok — Faz 7'de eklenecek. Bağlantı bilerek
              // burada duruyor; tıklanırsa NotFoundPage'e düşer, bu normal/beklenen.
              <Link to={`/deals/${lead.converted_deal_id}`} className="underline hover:no-underline">
                Fırsat kaydına git
              </Link>
            )}
          </div>
        </div>
      )}

      <Card>
        <CardHeader
          title={lead.full_name}
          subtitle={lead.position ? `${lead.position}${lead.company_name ? ' — ' + lead.company_name : ''}` : lead.company_name ?? undefined}
          action={
            <div className="flex items-center gap-2">
              {/* `leads.assign` saf izin kontrolüdür — `can.assign` her zaman modül izniyle aynıdır. */}
              {can('leads.assign') && lead.can.assign && (
                <Button variant="secondary" leftIcon={<Users className="size-4" aria-hidden="true" />} onClick={() => setAssignOpen(true)}>
                  Sahip Ata
                </Button>
              )}
              {/* Faz 13: `!isConverted` durum kuralı korunur; kalan tek engel sahiplikse (can.convert
                  false) buton GİZLENMEZ, devre dışı + tooltip gösterilir. */}
              {!isConverted && can('leads.convert') && (
                <Button
                  variant="secondary"
                  leftIcon={<Repeat className="size-4" aria-hidden="true" />}
                  onClick={() => setConvertOpen(true)}
                  disabled={!lead.can.convert}
                  title={lead.can.convert ? undefined : 'Bu kaydın sahibi değilsiniz, dönüştüremezsiniz.'}
                >
                  Dönüştür
                </Button>
              )}
              {!isConverted && can('leads.update') && (
                <Button
                  variant="secondary"
                  leftIcon={<Pencil className="size-4" aria-hidden="true" />}
                  onClick={() => setEditOpen(true)}
                  disabled={!lead.can.update}
                  title={lead.can.update ? undefined : 'Bu kaydın sahibi değilsiniz, düzenleyemezsiniz.'}
                >
                  Düzenle
                </Button>
              )}
              {/* Dönüştürülmüş lead silinemez — sahiplikten bağımsız durum kuralı, GİZLEME ile ele
                  alınır (bkz. `LeadPolicy::delete`). */}
              {can('leads.delete') && lead.can.delete && (
                <Button variant="danger" leftIcon={<Trash2 className="size-4" aria-hidden="true" />} onClick={() => setDeleteOpen(true)}>
                  Sil
                </Button>
              )}
            </div>
          }
        />
        <CardBody>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <DetailField label="Durum">
              <Badge variant={STATUS_BADGE_VARIANT[lead.status]}>{STATUS_LABELS[lead.status]}</Badge>
            </DetailField>
            <DetailField label="Kaynak">
              <Badge variant="neutral">{SOURCE_LABELS[lead.source]}</Badge>
            </DetailField>
            <DetailField label="Skor">
              <ScoreIndicator score={lead.score} />
            </DetailField>
            <DetailField label="Sahip">
              {lead.owner ? (
                <div className="flex items-center gap-2">
                  <Avatar name={lead.owner.name} size="xs" />
                  <span className="text-sm text-fg">{lead.owner.name}</span>
                </div>
              ) : (
                <span className="text-sm text-fg-muted">Atanmamış</span>
              )}
            </DetailField>
            <DetailField label="E-posta">
              <span className="flex items-center gap-1.5 text-sm text-fg">
                <Mail className="size-3.5 text-fg-muted" aria-hidden="true" />
                {lead.email ?? '—'}
              </span>
            </DetailField>
            <DetailField label="Telefon">
              <span className="flex items-center gap-1.5 text-sm text-fg">
                <Phone className="size-3.5 text-fg-muted" aria-hidden="true" />
                {lead.phone ?? '—'}
              </span>
            </DetailField>
            <DetailField label="Firma">
              <span className="flex items-center gap-1.5 text-sm text-fg">
                <Building2 className="size-3.5 text-fg-muted" aria-hidden="true" />
                {lead.company_name ?? '—'}
              </span>
            </DetailField>
            <DetailField label="Oluşturulma">
              <span className="text-sm text-fg">{formatDateTime(lead.created_at)}</span>
            </DetailField>
          </div>

          <div className="mt-6 flex flex-col gap-2">
            <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">Etiketler</p>
            <div className="flex flex-wrap gap-1.5">
              {lead.tags.length === 0 && <span className="text-sm text-fg-muted">Etiket yok.</span>}
              {lead.tags.map((tag) => (
                <Badge key={tag.id} variant="neutral">
                  {tag.name}
                </Badge>
              ))}
            </div>
          </div>
        </CardBody>
      </Card>

      {Object.keys(lead.custom_fields).length > 0 && (
        <Card>
          <CardHeader title="Özel Alanlar" />
          <CardBody>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Object.entries(lead.custom_fields).map(([key, value]) => (
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
        <CardHeader title="Notlar" />
        <CardBody>
          <p className="whitespace-pre-wrap text-sm text-fg-secondary">{lead.notes || 'Not eklenmemiş.'}</p>
        </CardBody>
      </Card>

      <LeadFormModal open={editOpen} onClose={() => setEditOpen(false)} lead={lead} />
      <ConvertLeadModal open={convertOpen} onClose={() => setConvertOpen(false)} lead={lead} />
      <AssignOwnerModal open={assignOpen} onClose={() => setAssignOpen(false)} lead={lead} />

      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Müşteri adayını sil"
        description="Bu işlem geri alınamaz. Aday kalıcı olarak silinecek."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDeleteOpen(false)}>
              Vazgeç
            </Button>
            <Button
              variant="danger"
              loading={deleteLead.isPending}
              onClick={async () => {
                await deleteLead.mutateAsync(lead.id)
                setDeleteOpen(false)
                navigate('/leads')
              }}
            >
              Sil
            </Button>
          </div>
        }
      >
        <p className="text-sm text-fg-secondary">
          <strong className="text-fg">{lead.full_name}</strong> adlı müşteri adayını silmek istediğinize emin
          misiniz?
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
