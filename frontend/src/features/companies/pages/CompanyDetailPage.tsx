// Firma detay sayfası — özet kart, bağlı kişiler mini tablosu ve zaman çizelgesi.
import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  Globe,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Trash2,
  Users as UsersIcon,
} from 'lucide-react'
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  Modal,
  Skeleton,
  Table,
  TBody,
  Td,
  THead,
  Th,
  Tr,
} from '../../../components/ui'
import { Timeline } from '../../../components/shared/Timeline'
import { tokenBadgeVariant } from '../../../components/shared/tokenBadgeVariant'
import type { TimelineItem } from '../../../components/shared/Timeline'
import { usePermission } from '../../auth/hooks/usePermission'
import { useCompany, useCompanyContacts, useCompanyTimeline, useCustomFields, useDeleteCompany } from '../api/companiesApi'
import { CompanyFormModal } from '../components/CompanyFormModal'

const currencyFormatter = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' })

function formatCurrency(value: number | null): string {
  if (value === null) return '—'
  return currencyFormatter.format(value)
}

function formatNumber(value: number | null): string {
  if (value === null) return '—'
  return new Intl.NumberFormat('tr-TR').format(value)
}

export function CompanyDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const companyId = id ? Number(id) : undefined
  const { can } = usePermission()

  const { data: company, isLoading, isError, refetch } = useCompany(companyId)
  const { data: customFields } = useCustomFields()
  const { data: linkedContacts, isLoading: isContactsLoading, isError: isContactsError, refetch: refetchContacts } =
    useCompanyContacts(companyId)

  const {
    data: timelineData,
    isLoading: isTimelineLoading,
    isError: isTimelineError,
    refetch: refetchTimeline,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useCompanyTimeline(companyId)

  const timelineItems: TimelineItem[] = useMemo(
    () => timelineData?.pages.flatMap((page) => page.data) ?? [],
    [timelineData]
  )

  const [editOpen, setEditOpen] = useState(false)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const deleteCompany = useDeleteCompany()

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton variant="text" width={200} />
        <Card>
          <CardBody className="flex flex-col gap-4">
            <Skeleton variant="text" width={240} height={24} />
            <Skeleton variant="text" lines={3} />
          </CardBody>
        </Card>
      </div>
    )
  }

  if (isError || !company) {
    return (
      <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
        <p className="text-sm text-fg-muted">Firma yüklenirken bir hata oluştu.</p>
        <Button variant="secondary" onClick={() => refetch()}>
          Tekrar dene
        </Button>
      </div>
    )
  }

  const customFieldEntries = (customFields ?? []).filter((field) => company.custom_fields[field.key])

  return (
    <div className="flex flex-col gap-4">
      <nav aria-label="breadcrumb" className="text-xs text-fg-muted">
        <span>Anasayfa</span>
        <span className="mx-1.5">/</span>
        <Link to="/companies" className="hover:text-fg hover:underline">
          Firmalar
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-primary">{company.name}</span>
      </nav>

      <Card>
        <CardHeader
          title={company.name}
          subtitle={company.industry ?? undefined}
          action={
            <div className="flex items-center gap-2">
              {can('companies.update') && (
                <Button variant="secondary" leftIcon={<Pencil className="size-4" aria-hidden="true" />} onClick={() => setEditOpen(true)}>
                  Düzenle
                </Button>
              )}
              {can('companies.delete') && (
                <Button variant="danger" leftIcon={<Trash2 className="size-4" aria-hidden="true" />} onClick={() => setConfirmDeleteOpen(true)}>
                  Sil
                </Button>
              )}
            </div>
          }
        >
          <div className="flex flex-wrap gap-1.5 pt-1">
            <Badge variant="neutral">{`${company.contacts_count} kişi`}</Badge>
            <Badge variant="neutral">{`${company.deals_count} fırsat`}</Badge>
          </div>
        </CardHeader>
        <CardBody className="flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex items-center gap-2 text-sm">
              <Mail className="size-4 text-fg-muted" aria-hidden="true" />
              <span className="text-fg">{company.email ?? '—'}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Phone className="size-4 text-fg-muted" aria-hidden="true" />
              <span className="text-fg">{company.phone ?? '—'}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Globe className="size-4 text-fg-muted" aria-hidden="true" />
              {company.website ? (
                <a
                  href={company.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="truncate text-primary hover:underline"
                >
                  {company.website}
                </a>
              ) : (
                <span className="text-fg">—</span>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm sm:col-span-2">
              <MapPin className="size-4 shrink-0 text-fg-muted" aria-hidden="true" />
              <span className="text-fg">
                {[company.address, company.city, company.country].filter(Boolean).join(', ') || '—'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <UsersIcon className="size-4 text-fg-muted" aria-hidden="true" />
              <span className="text-fg">{formatNumber(company.employee_count)} çalışan</span>
            </div>
            <div className="flex flex-col gap-1 text-sm">
              <span className="text-xs font-medium text-fg-muted">Yıllık Ciro</span>
              <span className="text-fg">{formatCurrency(company.annual_revenue)}</span>
            </div>
            <div className="flex flex-col gap-1 text-sm">
              <span className="text-xs font-medium text-fg-muted">Sahip</span>
              <span className="text-fg">{company.owner?.name ?? '—'}</span>
            </div>
          </div>

          {company.tags.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-fg-muted">Etiketler</span>
              <div className="flex flex-wrap gap-1.5">
                {company.tags.map((tag) => (
                  <Badge key={tag.id} variant={tokenBadgeVariant(tag.color)}>
                    {tag.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {customFieldEntries.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium text-fg-muted">Özel Alanlar</span>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {customFieldEntries.map((field) => (
                  <div key={field.key} className="flex flex-col gap-0.5">
                    <span className="text-xs text-fg-muted">{field.label}</span>
                    <span className="text-sm text-fg">{company.custom_fields[field.key]}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {company.notes && (
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-fg-muted">Notlar</span>
              <p className="whitespace-pre-wrap text-sm text-fg-secondary">{company.notes}</p>
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Bağlı Kişiler" subtitle={`${linkedContacts?.length ?? 0} kişi`} />
        <CardBody noPadding>
          {isContactsError ? (
            <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
              <p className="text-sm text-fg-muted">Bağlı kişiler yüklenirken bir hata oluştu.</p>
              <Button variant="secondary" onClick={() => refetchContacts()}>
                Tekrar dene
              </Button>
            </div>
          ) : !isContactsLoading && (linkedContacts ?? []).length === 0 ? (
            <EmptyState
              icon={<UsersIcon className="size-6" aria-hidden="true" />}
              title="Bağlı kişi yok"
              description="Bu firmaya bağlı kişi yok."
            />
          ) : (
            <Table>
              <THead>
                <Tr>
                  <Th>Ad Soyad</Th>
                  <Th>Pozisyon</Th>
                  <Th>E-posta</Th>
                  <Th>Telefon</Th>
                </Tr>
              </THead>
              <TBody aria-busy={isContactsLoading}>
                {isContactsLoading
                  ? Array.from({ length: 3 }).map((_, i) => (
                      <Tr key={i}>
                        <Td><Skeleton variant="text" width={140} /></Td>
                        <Td><Skeleton variant="text" width={100} /></Td>
                        <Td><Skeleton variant="text" width={140} /></Td>
                        <Td><Skeleton variant="text" width={100} /></Td>
                      </Tr>
                    ))
                  : (linkedContacts ?? []).map((contact) => (
                      <Tr key={contact.id}>
                        <Td>
                          <div className="flex items-center gap-2">
                            <Link to={`/contacts/${contact.id}`} className="text-primary hover:underline">
                              {contact.full_name}
                            </Link>
                            {contact.is_primary && <Badge variant="primary">Birincil</Badge>}
                          </div>
                        </Td>
                        <Td>{contact.position ?? '—'}</Td>
                        <Td>{contact.email ?? '—'}</Td>
                        <Td>{contact.phone ?? '—'}</Td>
                      </Tr>
                    ))}
              </TBody>
            </Table>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Zaman Çizelgesi" />
        <CardBody className="flex flex-col gap-3">
          <p className="text-xs text-fg-muted">
            Bu zaman çizelgesi, firmaya bağlı kişilerin etkileşimlerini de içerir.
          </p>
          <Timeline
            items={timelineItems}
            isLoading={isTimelineLoading}
            isError={isTimelineError}
            onRetry={() => refetchTimeline()}
            hasMore={!!hasNextPage}
            onLoadMore={() => fetchNextPage()}
            isLoadingMore={isFetchingNextPage}
            emptyDescription="Bu firma için henüz görüntülenecek bir etkileşim yok."
          />
        </CardBody>
      </Card>

      <CompanyFormModal open={editOpen} onClose={() => setEditOpen(false)} company={company} />

      <Modal
        open={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        title="Firmayı sil"
        description="Bu işlem geri alınamaz. Firma kalıcı olarak silinecek."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setConfirmDeleteOpen(false)}>
              Vazgeç
            </Button>
            <Button
              variant="danger"
              loading={deleteCompany.isPending}
              onClick={async () => {
                // 422 (açık fırsatı olan firma silinemez) durumunda hata yukarı fırlatılır,
                // böylece modal kapanmaz ve gerçek backend mesajı toast'a düşer.
                await deleteCompany.mutateAsync(company.id)
                setConfirmDeleteOpen(false)
                // Kayıt artık yok — sayfada kalırsa detay sorgusu 404 döner ve hata durumu
                // gösterilir. Silme başarılı olduğunda listeye geri dön.
                navigate('/companies')
              }}
            >
              Sil
            </Button>
          </div>
        }
      >
        <p className="text-sm text-fg-secondary">
          <strong className="text-fg">{company.name}</strong> firmasını silmek istediğinize emin misiniz?
        </p>
      </Modal>
    </div>
  )
}
