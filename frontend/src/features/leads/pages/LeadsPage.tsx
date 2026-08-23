// Müşteri Adayları (Leads) listesi — server-side sayfalama/sıralama/arama/filtreleme,
// tüm durum URL query string'inde (bkz. `UsersPage`/`LogsPage` deseni).
import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Pencil, Plus, Repeat, Search, Trash2, Upload, UserCog, Users } from 'lucide-react'
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
import { usePermission } from '../../auth/hooks/usePermission'
import { useDeleteLead, useLeads, useOwnerOptions, useTags } from '../api/leadsApi'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { LeadFormModal } from '../components/LeadFormModal'
import { ConvertLeadModal } from '../components/ConvertLeadModal'
import { AssignOwnerModal } from '../components/AssignOwnerModal'
import { ImportLeadsModal } from '../components/ImportLeadsModal'
import { ScoreIndicator } from '../components/ScoreIndicator'
import { SOURCE_LABELS, SOURCE_OPTIONS, STATUS_BADGE_VARIANT, STATUS_LABELS } from '../utils'
import type { Lead, LeadsQuery } from '../types'

const DEFAULT_PER_PAGE = 10
const SEARCH_DEBOUNCE_MS = 300

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'Tüm durumlar' },
  ...(Object.keys(STATUS_LABELS) as Array<keyof typeof STATUS_LABELS>).map((value) => ({
    value,
    label: STATUS_LABELS[value],
  })),
]

const SOURCE_FILTER_OPTIONS = [{ value: '', label: 'Tüm kaynaklar' }, ...SOURCE_OPTIONS]

type FormModalState = { mode: 'create' } | { mode: 'edit'; lead: Lead } | null

export function LeadsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { can } = usePermission()

  const [searchDraft, setSearchDraft] = useState(searchParams.get('q') ?? '')
  const debouncedSearch = useDebouncedValue(searchDraft, SEARCH_DEBOUNCE_MS)

  const [formModal, setFormModal] = useState<FormModalState>(null)
  const [convertLead, setConvertLead] = useState<Lead | null>(null)
  const [assignLead, setAssignLead] = useState<Lead | null>(null)
  const [deleteLead, setDeleteLeadState] = useState<Lead | null>(null)
  const [importOpen, setImportOpen] = useState(false)

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

  useEffect(() => {
    const currentQ = searchParams.get('q') ?? ''
    if (debouncedSearch === currentQ) return
    updateParams({ q: debouncedSearch || null, page: '1' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch])

  const query: LeadsQuery = useMemo(() => {
    const ownerId = searchParams.get('owner_id')
    const tagId = searchParams.get('tag_id')
    const scoreMin = searchParams.get('score_min')
    const scoreMax = searchParams.get('score_max')
    return {
      page: Number(searchParams.get('page') ?? '1') || 1,
      per_page: Number(searchParams.get('per_page') ?? String(DEFAULT_PER_PAGE)) || DEFAULT_PER_PAGE,
      sort: searchParams.get('sort') ?? undefined,
      q: searchParams.get('q') ?? undefined,
      status: searchParams.get('status') ?? undefined,
      source: searchParams.get('source') ?? undefined,
      owner_id: ownerId ? Number(ownerId) : undefined,
      tag_id: tagId ? Number(tagId) : undefined,
      score_min: scoreMin ? Number(scoreMin) : undefined,
      score_max: scoreMax ? Number(scoreMax) : undefined,
      from: searchParams.get('from') ?? undefined,
      to: searchParams.get('to') ?? undefined,
    }
  }, [searchParams])

  const { data, isLoading, isError, refetch } = useLeads(query)
  const { data: ownerOptions, isForbidden: ownersForbidden } = useOwnerOptions()
  const { data: tags } = useTags()
  const deleteLeadMutation = useDeleteLead()

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

  const ownerFilterOptions = [
    { value: '', label: 'Tüm sahipler' },
    ...(ownerOptions ?? []).map((owner) => ({ value: String(owner.id), label: owner.name })),
  ]
  const tagFilterOptions = [
    { value: '', label: 'Tüm etiketler' },
    ...(tags ?? []).map((tag) => ({ value: String(tag.id), label: tag.name })),
  ]

  const leads = data?.data ?? []
  const total = data?.meta.pagination.total ?? 0
  const isEmpty = !isLoading && !isError && leads.length === 0

  return (
    <div className="flex flex-col gap-4">
      <nav aria-label="breadcrumb" className="text-xs text-fg-muted">
        <span>Anasayfa</span>
        <span className="mx-1.5">/</span>
        <span className="text-primary">Müşteri Adayları</span>
      </nav>

      <Card>
        <CardHeader
          title="Müşteri Adayları"
          subtitle={`${total} aday`}
          action={
            <div className="flex items-center gap-2">
              {can('leads.import') && (
                <Button variant="secondary" leftIcon={<Upload className="size-4" aria-hidden="true" />} onClick={() => setImportOpen(true)}>
                  İçe Aktar
                </Button>
              )}
              {can('leads.create') && (
                <Button leftIcon={<Plus className="size-4" aria-hidden="true" />} onClick={() => setFormModal({ mode: 'create' })}>
                  Yeni Aday
                </Button>
              )}
            </div>
          }
        />
        <CardBody noPadding>
          <div className="flex flex-col gap-3 border-b border-border-subtle p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
              <div className="w-full lg:max-w-xs">
                <Input
                  value={searchDraft}
                  onChange={(e) => setSearchDraft(e.target.value)}
                  placeholder="İsim, e-posta veya firma ara..."
                  leftIcon={<Search className="size-4" aria-hidden="true" />}
                  aria-label="Aday ara"
                />
              </div>
              <div className="w-full lg:w-44">
                <Select
                  value={query.status ?? ''}
                  onChange={(e) => updateParams({ status: e.target.value || null, page: '1' })}
                  options={STATUS_FILTER_OPTIONS}
                  aria-label="Durum filtresi"
                />
              </div>
              <div className="w-full lg:w-48">
                <Select
                  value={query.source ?? ''}
                  onChange={(e) => updateParams({ source: e.target.value || null, page: '1' })}
                  options={SOURCE_FILTER_OPTIONS}
                  aria-label="Kaynak filtresi"
                />
              </div>
              {!ownersForbidden && (
                <div className="w-full lg:w-48">
                  <Select
                    value={query.owner_id ? String(query.owner_id) : ''}
                    onChange={(e) => updateParams({ owner_id: e.target.value || null, page: '1' })}
                    options={ownerFilterOptions}
                    aria-label="Sahip filtresi"
                  />
                </div>
              )}
              <div className="w-full lg:w-44">
                <Select
                  value={query.tag_id ? String(query.tag_id) : ''}
                  onChange={(e) => updateParams({ tag_id: e.target.value || null, page: '1' })}
                  options={tagFilterOptions}
                  aria-label="Etiket filtresi"
                />
              </div>
            </div>
            <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
              <div className="flex w-full items-end gap-2 lg:w-auto">
                <div className="w-full lg:w-28">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={query.score_min ?? ''}
                    onChange={(e) => updateParams({ score_min: e.target.value || null, page: '1' })}
                    placeholder="Min skor"
                    aria-label="Minimum skor"
                  />
                </div>
                <span className="pb-2.5 text-xs text-fg-muted">—</span>
                <div className="w-full lg:w-28">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={query.score_max ?? ''}
                    onChange={(e) => updateParams({ score_max: e.target.value || null, page: '1' })}
                    placeholder="Maks skor"
                    aria-label="Maksimum skor"
                  />
                </div>
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
          </div>

          {isError ? (
            <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
              <p className="text-sm text-fg-muted">Müşteri adayları yüklenirken bir hata oluştu.</p>
              <Button variant="secondary" onClick={() => refetch()}>
                Tekrar dene
              </Button>
            </div>
          ) : isEmpty ? (
            <EmptyState
              icon={<Users className="size-6" aria-hidden="true" />}
              title="Müşteri adayı bulunamadı"
              description="Arama veya filtre kriterlerinizle eşleşen aday yok."
            />
          ) : (
            <Table>
              <THead>
                <Tr>
                  <Th sortable sortDirection={sortDirectionFor('first_name')} onSort={() => toggleSort('first_name')}>
                    Ad Soyad
                  </Th>
                  <Th sortable sortDirection={sortDirectionFor('company_name')} onSort={() => toggleSort('company_name')}>
                    Firma
                  </Th>
                  <Th sortable sortDirection={sortDirectionFor('email')} onSort={() => toggleSort('email')}>
                    E-posta
                  </Th>
                  <Th>Telefon</Th>
                  <Th sortable sortDirection={sortDirectionFor('source')} onSort={() => toggleSort('source')}>
                    Kaynak
                  </Th>
                  <Th sortable sortDirection={sortDirectionFor('status')} onSort={() => toggleSort('status')}>
                    Durum
                  </Th>
                  <Th sortable sortDirection={sortDirectionFor('score')} onSort={() => toggleSort('score')}>
                    Skor
                  </Th>
                  <Th>Sahip</Th>
                  <Th>Etiketler</Th>
                  <Th align="right">İşlemler</Th>
                </Tr>
              </THead>
              <TBody aria-busy={isLoading}>
                {isLoading
                  ? Array.from({ length: query.per_page ?? DEFAULT_PER_PAGE }).map((_, i) => (
                      <Tr key={i}>
                        <Td><Skeleton variant="text" width={140} /></Td>
                        <Td><Skeleton variant="text" width={100} /></Td>
                        <Td><Skeleton variant="text" width={140} /></Td>
                        <Td><Skeleton variant="text" width={100} /></Td>
                        <Td><Skeleton variant="text" width={80} /></Td>
                        <Td><Skeleton variant="text" width={80} /></Td>
                        <Td><Skeleton variant="text" width={70} /></Td>
                        <Td><Skeleton variant="text" width={90} /></Td>
                        <Td><Skeleton variant="text" width={80} /></Td>
                        <Td align="right"><Skeleton variant="text" width={100} className="ml-auto" /></Td>
                      </Tr>
                    ))
                  : leads.map((lead) => {
                      const isConverted = lead.status === 'converted'
                      return (
                        <Tr key={lead.id}>
                          <Td>
                            <Link to={`/leads/${lead.id}`} className="font-medium text-fg hover:text-primary hover:underline">
                              {lead.full_name}
                            </Link>
                          </Td>
                          <Td>{lead.company_name ?? '—'}</Td>
                          <Td className="text-fg-secondary">{lead.email ?? '—'}</Td>
                          <Td className="text-fg-secondary">{lead.phone ?? '—'}</Td>
                          <Td>
                            <Badge variant="neutral">{SOURCE_LABELS[lead.source]}</Badge>
                          </Td>
                          <Td>
                            <Badge variant={STATUS_BADGE_VARIANT[lead.status]}>{STATUS_LABELS[lead.status]}</Badge>
                          </Td>
                          <Td>
                            <ScoreIndicator score={lead.score} />
                          </Td>
                          <Td>
                            {lead.owner ? (
                              <div className="flex items-center gap-2">
                                <Avatar name={lead.owner.name} size="xs" />
                                <span className="truncate text-sm text-fg">{lead.owner.name}</span>
                              </div>
                            ) : (
                              <span className="text-fg-muted">—</span>
                            )}
                          </Td>
                          <Td>
                            <div className="flex flex-wrap gap-1">
                              {lead.tags.length === 0 && <span className="text-fg-muted">—</span>}
                              {lead.tags.map((tag) => (
                                <Badge key={tag.id} variant="neutral" size="sm">
                                  {tag.name}
                                </Badge>
                              ))}
                            </div>
                          </Td>
                          <Td align="right">
                            <div className="flex items-center justify-end gap-1">
                              <IconLinkButton label="Detay" to={`/leads/${lead.id}`}>
                                <UserCog className="size-4" aria-hidden="true" />
                              </IconLinkButton>
                              {!isConverted && can('leads.update') && (
                                <IconButton label="Düzenle" onClick={() => setFormModal({ mode: 'edit', lead })}>
                                  <Pencil className="size-4" aria-hidden="true" />
                                </IconButton>
                              )}
                              {!isConverted && can('leads.convert') && (
                                <IconButton label="Dönüştür" onClick={() => setConvertLead(lead)}>
                                  <Repeat className="size-4" aria-hidden="true" />
                                </IconButton>
                              )}
                              {can('leads.assign') && (
                                <IconButton label="Sahip ata" onClick={() => setAssignLead(lead)}>
                                  <Users className="size-4" aria-hidden="true" />
                                </IconButton>
                              )}
                              {!isConverted && can('leads.delete') && (
                                <IconButton label="Sil" danger onClick={() => setDeleteLeadState(lead)}>
                                  <Trash2 className="size-4" aria-hidden="true" />
                                </IconButton>
                              )}
                            </div>
                          </Td>
                        </Tr>
                      )
                    })}
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

      <LeadFormModal open={!!formModal} onClose={() => setFormModal(null)} lead={formModal?.mode === 'edit' ? formModal.lead : null} />
      <ConvertLeadModal open={!!convertLead} onClose={() => setConvertLead(null)} lead={convertLead} />
      <AssignOwnerModal open={!!assignLead} onClose={() => setAssignLead(null)} lead={assignLead} />
      <ImportLeadsModal open={importOpen} onClose={() => setImportOpen(false)} />

      <Modal
        open={!!deleteLead}
        onClose={() => setDeleteLeadState(null)}
        title="Müşteri adayını sil"
        description="Bu işlem geri alınamaz. Aday kalıcı olarak silinecek."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDeleteLeadState(null)}>
              Vazgeç
            </Button>
            <Button
              variant="danger"
              loading={deleteLeadMutation.isPending}
              onClick={async () => {
                if (!deleteLead) return
                await deleteLeadMutation.mutateAsync(deleteLead.id)
                setDeleteLeadState(null)
              }}
            >
              Sil
            </Button>
          </div>
        }
      >
        {deleteLead && (
          <p className="text-sm text-fg-secondary">
            <strong className="text-fg">{deleteLead.full_name}</strong> adlı müşteri adayını silmek istediğinize
            emin misiniz?
          </p>
        )}
      </Modal>
    </div>
  )
}

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

function IconLinkButton({ label, to, children }: { label: string; to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex size-8 items-center justify-center rounded-md text-fg-muted hover:bg-surface-2 hover:text-fg',
        'transition-colors duration-150 motion-reduce:transition-none',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-1'
      )}
    >
      {children}
    </Link>
  )
}
