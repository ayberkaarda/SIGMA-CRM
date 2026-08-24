// Fırsat detay sayfası — özet kart, kapanış şeridi, ilişkili kayıtlar, özel alanlar.
//
// İletişim geçmişi NOTU (görev tanımı): Faz 6'da `components/shared/Timeline.tsx` yazıldı ve
// `GET /api/contacts/{id}/timeline` ile `GET /api/companies/{id}/timeline` uçları var, ama
// fırsat (deal) için ayrı bir timeline ucu YOK. Bu yüzden burada timeline gösterilmiyor —
// bunun yerine deal'ın bağlı olduğu kişinin (yoksa firmanın) kendi detay sayfasına bağlantı
// veriliyor; kullanıcı oradaki zaman çizelgesini görüntüleyebilir.
import { useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  CheckCircle2,
  History,
  LayoutGrid,
  Pencil,
  Trash2,
  User as UserIcon,
  Users,
  XCircle,
} from 'lucide-react'
import { Badge, Button, Card, CardBody, CardHeader, Modal, Skeleton } from '../../../components/ui'
import { formatMoney } from '../../../lib/money'
import { usePermission } from '../../auth/hooks/usePermission'
import { RecordChatPanel } from '../../chat/record'
import { DealStageBadge } from '../components/DealStageBadge'
import { DealStatusBadge } from '../components/DealStatusBadge'
import { DealFormModal } from '../components/DealFormModal'
import { AssignDealOwnerModal } from '../components/AssignDealOwnerModal'
import { useDeal, useDeleteDeal } from '../api/dealsApi'

const formatCurrency = formatMoney

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium' }).format(new Date(iso))
  } catch {
    return iso
  }
}

function formatDateTime(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso))
  } catch {
    return iso
  }
}

export function DealDetailPage() {
  const params = useParams<{ id: string }>()
  const dealId = Number(params.id)
  const navigate = useNavigate()
  const { can } = usePermission()

  const { data: deal, isLoading, isError, refetch } = useDeal(Number.isFinite(dealId) ? dealId : undefined)
  const deleteDeal = useDeleteDeal()

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

  if (isError || !deal) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <p className="text-sm text-fg-muted">Fırsat yüklenirken bir hata oluştu.</p>
        <Button variant="secondary" onClick={() => refetch()}>
          Tekrar dene
        </Button>
      </div>
    )
  }

  const isWon = deal.status === 'won'
  const isLost = deal.status === 'lost'

  return (
    <div className="flex flex-col gap-4">
      <nav aria-label="breadcrumb" className="flex items-center gap-1.5 text-xs text-fg-muted">
        <Link to="/deals/list" className="inline-flex items-center gap-1 hover:text-fg">
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          Fırsatlar
        </Link>
        <span className="mx-1">/</span>
        <span className="text-primary">{deal.title}</span>
      </nav>

      {isWon && (
        <div className="flex flex-col gap-2 rounded-lg bg-success-tint p-4 text-success sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="size-5 shrink-0" aria-hidden="true" />
            <div className="flex flex-col gap-0.5">
              <p className="text-sm font-medium">Bu fırsat {formatDateTime(deal.closed_at)} tarihinde kazanıldı.</p>
              <p className="text-sm">{deal.won_reason || 'Neden belirtilmemiş.'}</p>
            </div>
          </div>
        </div>
      )}
      {isLost && (
        <div className="flex flex-col gap-2 rounded-lg bg-danger-tint p-4 text-danger sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-2">
            <XCircle className="size-5 shrink-0" aria-hidden="true" />
            <div className="flex flex-col gap-0.5">
              <p className="text-sm font-medium">Bu fırsat {formatDateTime(deal.closed_at)} tarihinde kaybedildi.</p>
              <p className="text-sm">{deal.lost_reason || 'Neden belirtilmemiş.'}</p>
            </div>
          </div>
        </div>
      )}

      <Card>
        <CardHeader
          title={deal.title}
          subtitle={formatCurrency(deal.amount, deal.currency)}
          action={
            <div className="flex items-center gap-2">
              <Button variant="secondary" leftIcon={<LayoutGrid className="size-4" aria-hidden="true" />} onClick={() => navigate('/deals')}>
                Panoda Göster
              </Button>
              {/* `deals.assign` saf izin kontrolüdür (sahiplik boyutu yok), bkz. `DealPolicy::assign` —
                  `deal.can.assign` her zaman modül izniyle aynıdır, gizlemek yeterli. */}
              {can('deals.assign') && deal.can.assign && (
                <Button variant="secondary" leftIcon={<Users className="size-4" aria-hidden="true" />} onClick={() => setAssignOpen(true)}>
                  Sahip Ata
                </Button>
              )}
              {/* Faz 13: izin var ama `can.update` false ise (sahip/sahipsiz/atama yetkisi yok)
                  buton GİZLENMEZ — devre dışı + tooltip ile neden anlaşılır kılınır. */}
              {can('deals.update') && (
                <Button
                  variant="secondary"
                  leftIcon={<Pencil className="size-4" aria-hidden="true" />}
                  onClick={() => setEditOpen(true)}
                  disabled={!deal.can.update}
                  title={deal.can.update ? undefined : 'Bu kaydın sahibi değilsiniz, düzenleyemezsiniz.'}
                >
                  Düzenle
                </Button>
              )}
              {/* Kapanmış (won/lost) fırsat silinemez — sahiplikten bağımsız, herkes için geçerli bir
                  durum kuralı (bkz. `DealPolicy::delete`); bu yüzden disabled değil GİZLEME. İstemci
                  artık kendi `isClosed` kopyasını tutmaz, backend'in `can.delete`'ine güvenir. */}
              {can('deals.delete') && deal.can.delete && (
                <Button variant="danger" leftIcon={<Trash2 className="size-4" aria-hidden="true" />} onClick={() => setDeleteOpen(true)}>
                  Sil
                </Button>
              )}
            </div>
          }
        >
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <DealStageBadge stage={deal.pipeline_stage} />
            <DealStatusBadge status={deal.status} />
            {deal.probability !== null && <Badge variant="neutral">{`Olasılık: %${deal.probability}`}</Badge>}
          </div>
        </CardHeader>
        <CardBody className="flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <DetailField label="Firma">
              {deal.company ? (
                <Link to={`/companies/${deal.company.id}`} className="flex items-center gap-1.5 text-sm text-primary hover:underline">
                  <Building2 className="size-3.5" aria-hidden="true" />
                  {deal.company.name}
                </Link>
              ) : (
                <span className="text-sm text-fg-muted">—</span>
              )}
            </DetailField>
            <DetailField label="Kişi">
              {deal.contact ? (
                <Link to={`/contacts/${deal.contact.id}`} className="flex items-center gap-1.5 text-sm text-primary hover:underline">
                  <UserIcon className="size-3.5" aria-hidden="true" />
                  {deal.contact.full_name}
                </Link>
              ) : (
                <span className="text-sm text-fg-muted">—</span>
              )}
            </DetailField>
            <DetailField label="Sahip">
              <span className="text-sm text-fg">{deal.owner?.name ?? 'Atanmamış'}</span>
            </DetailField>
            <DetailField label="Tahmini Kapanış">
              <span className={deal.is_overdue ? 'flex items-center gap-1.5 text-sm font-medium text-danger' : 'text-sm text-fg'}>
                {deal.is_overdue && <AlertTriangle className="size-3.5" aria-hidden="true" />}
                {formatDate(deal.expected_close_date)}
                {deal.is_overdue && ' (gecikmiş)'}
              </span>
            </DetailField>
          </div>

          {deal.description && (
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-fg-muted">Açıklama</span>
              <p className="whitespace-pre-wrap text-sm text-fg-secondary">{deal.description}</p>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">Etiketler</p>
            <div className="flex flex-wrap gap-1.5">
              {deal.tags.length === 0 && <span className="text-sm text-fg-muted">Etiket yok.</span>}
              {deal.tags.map((tag) => (
                <Badge key={tag.id} variant="neutral">
                  {tag.name}
                </Badge>
              ))}
            </div>
          </div>
        </CardBody>
      </Card>

      {Object.keys(deal.custom_fields).length > 0 && (
        <Card>
          <CardHeader title="Özel Alanlar" />
          <CardBody>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Object.entries(deal.custom_fields).map(([key, value]) => (
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
        <CardHeader title="İletişim Geçmişi" />
        <CardBody className="flex flex-col gap-3">
          <div className="flex items-start gap-3 rounded-lg bg-surface-2 p-4">
            <History className="mt-0.5 size-5 shrink-0 text-fg-muted" aria-hidden="true" />
            <div className="flex flex-col gap-1">
              <p className="text-sm text-fg-secondary">
                Fırsatlara özel bir zaman çizelgesi uç noktası henüz yok. Bunun yerine bu fırsatın bağlı olduğu
                kişinin ya da firmanın kendi zaman çizelgesini görüntüleyebilirsiniz.
              </p>
              {deal.contact ? (
                <Link to={`/contacts/${deal.contact.id}`} className="text-sm font-medium text-primary hover:underline">
                  Bu fırsatın kişisinin iletişim geçmişini görüntüle
                </Link>
              ) : deal.company ? (
                <Link to={`/companies/${deal.company.id}`} className="text-sm font-medium text-primary hover:underline">
                  Bu fırsatın firmasının iletişim geçmişini görüntüle
                </Link>
              ) : (
                <span className="text-sm text-fg-muted">Bu fırsata bağlı bir kişi veya firma yok.</span>
              )}
            </div>
          </div>
        </CardBody>
      </Card>

      <RecordChatPanel recordType="deal" recordId={deal.id} />

      <DealFormModal open={editOpen} onClose={() => setEditOpen(false)} deal={deal} />
      <AssignDealOwnerModal open={assignOpen} onClose={() => setAssignOpen(false)} deal={deal} />

      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Fırsatı sil"
        description="Bu işlem geri alınamaz. Fırsat kalıcı olarak silinecek."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDeleteOpen(false)}>
              Vazgeç
            </Button>
            <Button
              variant="danger"
              loading={deleteDeal.isPending}
              onClick={async () => {
                await deleteDeal.mutateAsync(deal.id)
                setDeleteOpen(false)
                navigate('/deals/list')
              }}
            >
              Sil
            </Button>
          </div>
        }
      >
        <p className="text-sm text-fg-secondary">
          <strong className="text-fg">{deal.title}</strong> adlı fırsatı silmek istediğinize emin misiniz?
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
