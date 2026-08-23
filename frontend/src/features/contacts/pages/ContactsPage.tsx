// Kişiler listesi — server-side sayfalama/sıralama/arama/filtreleme, tüm durum gösterge deseni
// (yükleme/boş/hata) ve izin kontrollü işlemler (bkz. `UsersPage.tsx` referans deseni).
import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Eye, Pencil, Plus, Search, Trash2, Users as UsersIcon } from 'lucide-react'
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  Input,
  Modal,
  Pagination,
  Select,
  Skeleton,
  Table,
  TBody,
  Td,
  THead,
  Th,
  Tr,
} from '../../../components/ui'
import { cn } from '../../../lib/cn'
import { tokenBadgeVariant } from '../../../components/shared/tokenBadgeVariant'
import { usePermission } from '../../auth/hooks/usePermission'
import { useAllCompanyOptions, useDeleteContact, useContacts, useTags, useUserOptions } from '../api/contactsApi'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { ContactFormModal } from '../components/ContactFormModal'
import type { Contact, ContactsQuery } from '../types'

const DEFAULT_PER_PAGE = 10
const SEARCH_DEBOUNCE_MS = 300

function IconButton({
  label,
  onClick,
  children,
  danger,
}: {
  label: string
  onClick: () => void
  children: ReactNode
  danger?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex size-8 items-center justify-center rounded-md text-fg-muted hover:bg-surface-2 hover:text-fg',
        'transition-colors duration-150 motion-reduce:transition-none',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-1',
        danger && 'hover:text-danger'
      )}
    >
      {children}
    </button>
  )
}

type FormModalState = { mode: 'create' } | { mode: 'edit'; contact: Contact } | null

export function ContactsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { can } = usePermission()
  const canViewUsers = can('users.view')

  const [searchDraft, setSearchDraft] = useState(searchParams.get('q') ?? '')
  const debouncedSearch = useDebouncedValue(searchDraft, SEARCH_DEBOUNCE_MS)

  const [formModal, setFormModal] = useState<FormModalState>(null)
  const [confirmDeleteContact, setConfirmDeleteContact] = useState<Contact | null>(null)

  function updateParams(patch: Record<string, string | null>) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      for (const [key, value] of Object.entries(patch)) {
        if (value === null || value === '') next.delete(key)
        else next.set(key, value)
      }
      return next
    })
  }

  // Arama kutusu debounce edilir; sonuç URL'e yazılır ki sayfa yenilenince kaybolmasın.
  useEffect(() => {
    const currentQ = searchParams.get('q') ?? ''
    if (debouncedSearch === currentQ) return
    updateParams({ q: debouncedSearch || null, page: '1' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch])

  const query: ContactsQuery = useMemo(
    () => ({
      page: Number(searchParams.get('page') ?? '1') || 1,
      per_page: Number(searchParams.get('per_page') ?? String(DEFAULT_PER_PAGE)) || DEFAULT_PER_PAGE,
      sort: searchParams.get('sort') ?? undefined,
      q: searchParams.get('q') ?? undefined,
      company_id: searchParams.has('company_id') ? Number(searchParams.get('company_id')) : undefined,
      owner_id: searchParams.has('owner_id') ? Number(searchParams.get('owner_id')) : undefined,
      is_primary: searchParams.has('is_primary') ? searchParams.get('is_primary') === 'true' : undefined,
      city: searchParams.get('city') ?? undefined,
      tag_id: searchParams.has('tag_id') ? Number(searchParams.get('tag_id')) : undefined,
      from: searchParams.get('from') ?? undefined,
      to: searchParams.get('to') ?? undefined,
    }),
    [searchParams]
  )

  const { data, isLoading, isError, refetch } = useContacts(query)
  const { data: companyOptions } = useAllCompanyOptions()
  const { data: userOptions } = useUserOptions({ enabled: canViewUsers })
  const { data: tagOptions } = useTags()
  const deleteContact = useDeleteContact()

  function sortDirectionFor(field: string): 'asc' | 'desc' | null {
    if (query.sort === field) return 'asc'
    if (query.sort === `-${field}`) return 'desc'
    return null
  }

  function toggleSort(field: string) {
    const current = query.sort
    let nextSort: string | null
    if (current === field) nextSort = `-${field}`
    else if (current === `-${field}`) nextSort = null
    else nextSort = field
    updateParams({ sort: nextSort, page: '1' })
  }

  const companyFilterOptions = [
    { value: '', label: 'Tüm firmalar' },
    ...(companyOptions ?? []).map((c) => ({ value: String(c.id), label: c.name })),
  ]

  const ownerFilterOptions = [
    { value: '', label: 'Tüm sahipler' },
    ...(userOptions ?? []).map((u) => ({ value: String(u.id), label: u.name })),
  ]

  const tagFilterOptions = [
    { value: '', label: 'Tüm etiketler' },
    ...(tagOptions ?? []).map((t) => ({ value: String(t.id), label: t.name })),
  ]

  const primaryFilterOptions = [
    { value: '', label: 'Tümü' },
    { value: 'true', label: 'Evet' },
    { value: 'false', label: 'Hayır' },
  ]

  const contacts = data?.data ?? []
  const total = data?.meta.pagination.total ?? 0
  const isEmpty = !isLoading && !isError && contacts.length === 0

  return (
    <div className="flex flex-col gap-4">
      <nav aria-label="breadcrumb" className="text-xs text-fg-muted">
        <span>Anasayfa</span>
        <span className="mx-1.5">/</span>
        <span className="text-primary">Kişiler</span>
      </nav>

      <Card>
        <CardHeader
          title="Kişiler"
          subtitle={`${total} kişi`}
          action={
            can('contacts.create') && (
              <Button leftIcon={<Plus className="size-4" aria-hidden="true" />} onClick={() => setFormModal({ mode: 'create' })}>
                Yeni Kişi
              </Button>
            )
          }
        />
        <CardBody noPadding>
          <div className="flex flex-col gap-3 border-b border-border-subtle p-4 lg:flex-row lg:flex-wrap lg:items-end">
            <div className="w-full lg:max-w-xs">
              <Input
                value={searchDraft}
                onChange={(e) => setSearchDraft(e.target.value)}
                placeholder="İsim, e-posta veya telefon ara..."
                leftIcon={<Search className="size-4" aria-hidden="true" />}
                aria-label="Kişi ara"
              />
            </div>
            <div className="w-full lg:w-48">
              <Select
                value={query.company_id ? String(query.company_id) : ''}
                onChange={(e) => updateParams({ company_id: e.target.value || null, page: '1' })}
                options={companyFilterOptions}
                aria-label="Firma filtresi"
              />
            </div>
            {canViewUsers && (
              <div className="w-full lg:w-48">
                <Select
                  value={query.owner_id ? String(query.owner_id) : ''}
                  onChange={(e) => updateParams({ owner_id: e.target.value || null, page: '1' })}
                  options={ownerFilterOptions}
                  aria-label="Sahip filtresi"
                />
              </div>
            )}
            <div className="w-full lg:w-40">
              <Input
                value={query.city ?? ''}
                onChange={(e) => updateParams({ city: e.target.value || null, page: '1' })}
                placeholder="Şehir"
                aria-label="Şehir filtresi"
              />
            </div>
            <div className="w-full lg:w-44">
              <Select
                value={query.tag_id ? String(query.tag_id) : ''}
                onChange={(e) => updateParams({ tag_id: e.target.value || null, page: '1' })}
                options={tagFilterOptions}
                aria-label="Etiket filtresi"
              />
            </div>
            <div className="w-full lg:w-36">
              <Select
                value={query.is_primary === undefined ? '' : String(query.is_primary)}
                onChange={(e) => updateParams({ is_primary: e.target.value || null, page: '1' })}
                options={primaryFilterOptions}
                aria-label="Birincil filtresi"
              />
            </div>
            <div className="flex w-full items-end gap-2 lg:w-auto">
              <div className="w-full lg:w-40">
                <Input
                  type="date"
                  value={query.from ?? ''}
                  onChange={(e) => updateParams({ from: e.target.value || null, page: '1' })}
                  aria-label="Başlangıç tarihi"
                  max={query.to || undefined}
                />
              </div>
              <span className="pb-2.5 text-xs text-fg-muted">—</span>
              <div className="w-full lg:w-40">
                <Input
                  type="date"
                  value={query.to ?? ''}
                  onChange={(e) => updateParams({ to: e.target.value || null, page: '1' })}
                  aria-label="Bitiş tarihi"
                  min={query.from || undefined}
                />
              </div>
            </div>
          </div>

          {isError ? (
            <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
              <p className="text-sm text-fg-muted">Kişiler yüklenirken bir hata oluştu.</p>
              <Button variant="secondary" onClick={() => refetch()}>
                Tekrar dene
              </Button>
            </div>
          ) : isEmpty ? (
            <EmptyState
              icon={<UsersIcon className="size-6" aria-hidden="true" />}
              title="Kişi bulunamadı"
              description="Arama veya filtre kriterlerinizle eşleşen kişi yok."
            />
          ) : (
            <Table>
              <THead>
                <Tr>
                  <Th sortable sortDirection={sortDirectionFor('last_name')} onSort={() => toggleSort('last_name')}>
                    Kişi
                  </Th>
                  <Th>Firma</Th>
                  <Th sortable sortDirection={sortDirectionFor('email')} onSort={() => toggleSort('email')}>
                    E-posta
                  </Th>
                  <Th>Telefon</Th>
                  <Th sortable sortDirection={sortDirectionFor('city')} onSort={() => toggleSort('city')}>
                    Şehir
                  </Th>
                  <Th>Sahip</Th>
                  <Th>Etiketler</Th>
                  <Th align="center">Birincil</Th>
                  <Th align="right">İşlemler</Th>
                </Tr>
              </THead>
              <TBody aria-busy={isLoading}>
                {isLoading
                  ? Array.from({ length: query.per_page ?? DEFAULT_PER_PAGE }).map((_, i) => (
                      <Tr key={i}>
                        <Td>
                          <div className="flex items-center gap-3">
                            <Skeleton variant="circle" width={32} height={32} />
                            <Skeleton variant="text" width={140} />
                          </div>
                        </Td>
                        <Td><Skeleton variant="text" width={100} /></Td>
                        <Td><Skeleton variant="text" width={140} /></Td>
                        <Td><Skeleton variant="text" width={100} /></Td>
                        <Td><Skeleton variant="text" width={80} /></Td>
                        <Td><Skeleton variant="text" width={100} /></Td>
                        <Td><Skeleton variant="text" width={100} /></Td>
                        <Td align="center"><Skeleton variant="text" width={60} className="mx-auto" /></Td>
                        <Td align="right"><Skeleton variant="text" width={70} className="ml-auto" /></Td>
                      </Tr>
                    ))
                  : contacts.map((c) => (
                      <Tr key={c.id}>
                        <Td>
                          <div className="flex items-center gap-3">
                            <Avatar name={c.full_name} size="sm" />
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-fg">{c.full_name}</p>
                              {c.position && <p className="truncate text-xs text-fg-muted">{c.position}</p>}
                            </div>
                          </div>
                        </Td>
                        <Td>
                          {c.company ? (
                            <Link to={`/companies/${c.company.id}`} className="text-primary hover:underline">
                              {c.company.name}
                            </Link>
                          ) : (
                            <span className="text-fg-muted">—</span>
                          )}
                        </Td>
                        <Td>{c.email ?? <span className="text-fg-muted">—</span>}</Td>
                        <Td>{c.phone ?? c.mobile ?? <span className="text-fg-muted">—</span>}</Td>
                        <Td>{c.city ?? <span className="text-fg-muted">—</span>}</Td>
                        <Td>{c.owner?.name ?? <span className="text-fg-muted">—</span>}</Td>
                        <Td>
                          {c.tags.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {c.tags.map((tag) => (
                                <Badge key={tag.id} variant={tokenBadgeVariant(tag.color)} size="sm">
                                  {tag.name}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-fg-muted">—</span>
                          )}
                        </Td>
                        <Td align="center">
                          {c.is_primary && <Badge variant="primary">Birincil</Badge>}
                        </Td>
                        <Td align="right">
                          <div className="flex items-center justify-end gap-1">
                            <Link
                              to={`/contacts/${c.id}`}
                              aria-label="Detay"
                              title="Detay"
                              className={cn(
                                'inline-flex size-8 items-center justify-center rounded-md text-fg-muted hover:bg-surface-2 hover:text-fg',
                                'transition-colors duration-150 motion-reduce:transition-none',
                                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-1'
                              )}
                            >
                              <Eye className="size-4" aria-hidden="true" />
                            </Link>
                            {can('contacts.update') && (
                              <IconButton label="Düzenle" onClick={() => setFormModal({ mode: 'edit', contact: c })}>
                                <Pencil className="size-4" aria-hidden="true" />
                              </IconButton>
                            )}
                            {can('contacts.delete') && (
                              <IconButton label="Sil" danger onClick={() => setConfirmDeleteContact(c)}>
                                <Trash2 className="size-4" aria-hidden="true" />
                              </IconButton>
                            )}
                          </div>
                        </Td>
                      </Tr>
                    ))}
              </TBody>
            </Table>
          )}

          {!isError && !isEmpty && (
            <div className="border-t border-border-subtle p-4">
              <Pagination
                currentPage={query.page ?? 1}
                totalItems={total}
                pageSize={query.per_page ?? DEFAULT_PER_PAGE}
                onPageChange={(page) => updateParams({ page: String(page) })}
              />
            </div>
          )}
        </CardBody>
      </Card>

      <ContactFormModal
        open={!!formModal}
        onClose={() => setFormModal(null)}
        contact={formModal?.mode === 'edit' ? formModal.contact : null}
      />

      <Modal
        open={!!confirmDeleteContact}
        onClose={() => setConfirmDeleteContact(null)}
        title="Kişiyi sil"
        description="Bu işlem geri alınamaz. Kişi kalıcı olarak silinecek."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setConfirmDeleteContact(null)}>
              Vazgeç
            </Button>
            <Button
              variant="danger"
              loading={deleteContact.isPending}
              onClick={async () => {
                if (!confirmDeleteContact) return
                await deleteContact.mutateAsync(confirmDeleteContact.id)
                setConfirmDeleteContact(null)
              }}
            >
              Sil
            </Button>
          </div>
        }
      >
        {confirmDeleteContact && (
          <p className="text-sm text-fg-secondary">
            <strong className="text-fg">{confirmDeleteContact.full_name}</strong> adlı kişiyi silmek istediğinize
            emin misiniz?
          </p>
        )}
      </Modal>
    </div>
  )
}
