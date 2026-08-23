// Kişi detay sayfası — özet kart + özel alanlar + notlar + zaman çizelgesi (bkz. görev tanımı).
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Pencil, Trash2, Users as UsersIcon } from 'lucide-react'
import { Badge, Button, Card, CardBody, CardHeader, Modal, Skeleton } from '../../../components/ui'
import { tokenBadgeVariant } from '../../../components/shared/tokenBadgeVariant'
import { Timeline } from '../../../components/shared/Timeline'
import type { TimelineItem } from '../../../components/shared/Timeline'
import { usePermission } from '../../auth/hooks/usePermission'
import { useContact, useContactTimeline, useCustomFields, useDeleteContact } from '../api/contactsApi'
import { ContactFormModal } from '../components/ContactFormModal'

function SummarySkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Skeleton variant="circle" width={48} height={48} />
        <div className="flex flex-col gap-2">
          <Skeleton variant="text" width={160} />
          <Skeleton variant="text" width={100} />
        </div>
      </div>
      <Skeleton variant="text" lines={5} />
    </div>
  )
}

export function ContactDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const contactId = id ? Number(id) : undefined
  const { can } = usePermission()

  const [formOpen, setFormOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const { data: contact, isLoading, isError, refetch } = useContact(contactId, { enabled: contactId !== undefined })
  const { data: customFieldDefs } = useCustomFields()
  const deleteContact = useDeleteContact()

  const {
    data: timelineData,
    isLoading: timelineLoading,
    isError: timelineError,
    refetch: refetchTimeline,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useContactTimeline(contactId)

  const timelineItems: TimelineItem[] = timelineData?.pages.flatMap((page) => page.data) ?? []

  if (isError) {
    return (
      <div className="flex flex-col gap-4">
        <nav aria-label="breadcrumb" className="text-xs text-fg-muted">
          <Link to="/contacts" className="hover:text-fg">
            Kişiler
          </Link>
          <span className="mx-1.5">/</span>
          <span className="text-primary">Hata</span>
        </nav>
        <Card>
          <CardBody>
            <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
              <p className="text-sm text-fg-muted">Kişi yüklenirken bir hata oluştu.</p>
              <Button variant="secondary" onClick={() => refetch()}>
                Tekrar dene
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <nav aria-label="breadcrumb" className="text-xs text-fg-muted">
        <Link to="/contacts" className="hover:text-fg">
          Kişiler
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-primary">{isLoading ? '…' : contact?.full_name}</span>
      </nav>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader
            title="Kişi Özeti"
            action={
              !isLoading &&
              contact && (
                <div className="flex items-center gap-1">
                  {can('contacts.update') && (
                    <Button variant="ghost" size="sm" onClick={() => setFormOpen(true)} aria-label="Düzenle" title="Düzenle">
                      <Pencil className="size-4" aria-hidden="true" />
                    </Button>
                  )}
                  {can('contacts.delete') && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setConfirmDelete(true)}
                      aria-label="Sil"
                      title="Sil"
                      className="hover:text-danger"
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </Button>
                  )}
                </div>
              )
            }
          />
          <CardBody>
            {isLoading || !contact ? (
              <SummarySkeleton />
            ) : (
              <div className="flex flex-col gap-5">
                <div className="flex items-start gap-3">
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-surface-2 text-fg-secondary">
                    <UsersIcon className="size-6" aria-hidden="true" />
                  </div>
                  <div className="flex min-w-0 flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-lg font-medium text-fg">{contact.full_name}</p>
                      {contact.is_primary && <Badge variant="primary">Birincil</Badge>}
                    </div>
                    {contact.position && <p className="text-sm text-fg-muted">{contact.position}</p>}
                    <div className="flex flex-wrap gap-1.5">
                      {typeof contact.deals_count === 'number' && contact.deals_count > 0 && (
                        <Badge variant="success" size="sm">
                          {contact.deals_count} fırsat
                        </Badge>
                      )}
                      {typeof contact.tickets_count === 'number' && contact.tickets_count > 0 && (
                        <Badge variant="warning" size="sm">
                          {contact.tickets_count} talep
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <dl className="flex flex-col gap-3 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-fg-muted">Firma</dt>
                    <dd className="text-right text-fg">
                      {contact.company ? (
                        <Link to={`/companies/${contact.company.id}`} className="text-primary hover:underline">
                          {contact.company.name}
                        </Link>
                      ) : (
                        '—'
                      )}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-fg-muted">E-posta</dt>
                    <dd className="text-right text-fg">{contact.email ?? '—'}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-fg-muted">Telefon</dt>
                    <dd className="text-right text-fg">{contact.phone ?? '—'}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-fg-muted">Mobil</dt>
                    <dd className="text-right text-fg">{contact.mobile ?? '—'}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-fg-muted">Adres</dt>
                    <dd className="text-right text-fg">{contact.address ?? '—'}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-fg-muted">Şehir / Ülke</dt>
                    <dd className="text-right text-fg">
                      {[contact.city, contact.country].filter(Boolean).join(' / ') || '—'}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-fg-muted">Sahip</dt>
                    <dd className="text-right text-fg">{contact.owner?.name ?? '—'}</dd>
                  </div>
                </dl>

                {contact.tags.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    <p className="text-xs font-medium text-fg-muted">Etiketler</p>
                    <div className="flex flex-wrap gap-1.5">
                      {contact.tags.map((tag) => (
                        <Badge key={tag.id} variant={tokenBadgeVariant(tag.color)}>
                          {tag.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {(customFieldDefs ?? []).length > 0 && (
                  <div className="flex flex-col gap-2 border-t border-border-subtle pt-4">
                    <p className="text-xs font-medium text-fg-muted">Özel Alanlar</p>
                    <dl className="flex flex-col gap-3 text-sm">
                      {(customFieldDefs ?? []).map((def) => (
                        <div key={def.key} className="flex justify-between gap-4">
                          <dt className="text-fg-muted">{def.label}</dt>
                          <dd className="text-right text-fg">{contact.custom_fields[def.key] ?? '—'}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                )}

                <div className="flex flex-col gap-1.5 border-t border-border-subtle pt-4">
                  <p className="text-xs font-medium text-fg-muted">Notlar</p>
                  <p className="whitespace-pre-wrap text-sm text-fg-secondary">{contact.notes || '—'}</p>
                </div>
              </div>
            )}
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Zaman Çizelgesi" />
          <CardBody>
            <Timeline
              items={timelineItems}
              isLoading={timelineLoading}
              isError={timelineError}
              onRetry={() => refetchTimeline()}
              hasMore={!!hasNextPage}
              onLoadMore={() => fetchNextPage()}
              isLoadingMore={isFetchingNextPage}
              emptyDescription="Bu kişi için henüz görüntülenecek bir etkileşim yok."
            />
          </CardBody>
        </Card>
      </div>

      {contact && <ContactFormModal open={formOpen} onClose={() => setFormOpen(false)} contact={contact} />}

      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Kişiyi sil"
        description="Bu işlem geri alınamaz. Kişi kalıcı olarak silinecek."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setConfirmDelete(false)}>
              Vazgeç
            </Button>
            <Button
              variant="danger"
              loading={deleteContact.isPending}
              onClick={async () => {
                if (!contact) return
                await deleteContact.mutateAsync(contact.id)
                setConfirmDelete(false)
                // Kayıt artık yok — sayfada kalırsa detay sorgusu 404 döner ve hata durumu
                // gösterilir. Silme başarılı olduğunda listeye geri dön.
                navigate('/contacts')
              }}
            >
              Sil
            </Button>
          </div>
        }
      >
        {contact && (
          <p className="text-sm text-fg-secondary">
            <strong className="text-fg">{contact.full_name}</strong> adlı kişiyi silmek istediğinize emin misiniz?
          </p>
        )}
      </Modal>
    </div>
  )
}
