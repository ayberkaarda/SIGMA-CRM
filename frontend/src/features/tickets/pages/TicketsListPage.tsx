// Destek Talepleri liste görünümü — server-side sayfalama/sıralama/arama/filtreleme, tüm durum
// URL query string'inde (bkz. `deals/pages/DealsListPage.tsx`/`activities/pages/ActivitiesPage.tsx`
// deseni).
//
// VARSAYILAN SIRALAMA KARARI: `sla_due_at` (artan — en acil/en yakın vadeli talep en üstte).
// Görev tanımı bu seçimi düşünüp raporlamamızı istedi: destek kuyruğunun birincil işi "hangi
// talep önce ele alınmalı" sorusuna cevap vermektir ve bu doğrudan SLA vadesiyle ölçülür — en
// yeni/en eski oluşturulan (`created_at`) bu soruyu yanıtlamaz, ihlale en yakın talebi gömebilir.
// Duraklamadaki (`pending`) talepler bu sırada bir yaklaşıklıkla karışabilir (dokümanın kabul
// ettiği bir durum, bkz. `docs/SLA-DESIGN.md` §5.4) ama bu, "hangi talebe önce bakmalıyım"
// sorusu için hâlâ en isabetli varsayılan sıralamadır.
import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { LifeBuoy, Pencil, Plus, Search, Trash2, UserCog, Users } from 'lucide-react'
import {
  Avatar,
  Button,
  Card,
  CardBody,
  CardHeader,
  Checkbox,
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
import { TicketPriorityBadge } from '../components/TicketPriorityBadge'
import { TicketStatusBadge } from '../components/TicketStatusBadge'
import { STATUS_OPTIONS } from '../components/ticketStatusMeta'
import { PRIORITY_OPTIONS } from '../components/ticketPriorityMeta'
import { TICKET_CATEGORY_OPTIONS } from '../components/ticketCategoryOptions'
import { SlaCountdownInline } from '../components/SlaCountdown'
import { TicketFormModal } from '../components/TicketFormModal'
import { AssignTicketModal } from '../components/AssignTicketModal'
import { useTicketCompanyOptions, useTicketTags, useTicketUserOptions } from '../components/ticketsShared'
import { useDeleteTicket, useTickets, useTicketStats } from '../api/ticketsApi'
import { useTicketRealtime } from '../hooks/useTicketRealtime'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import type { Ticket, TicketsQuery } from '../types'

const DEFAULT_PER_PAGE = 10
const SEARCH_DEBOUNCE_MS = 300
const DEFAULT_SORT = 'sla_due_at'

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium' }).format(new Date(iso))
  } catch {
    return iso
  }
}

function formatHours(hours: number | null): string {
  if (hours === null) return 'Veri yok'
  if (hours < 1) return `${Math.round(hours * 60)} dk`
  return `${hours.toFixed(1)} saat`
}

type FormModalState = { mode: 'create' } | { mode: 'edit'; ticket: Ticket } | null

export function TicketsListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { can } = usePermission()

  // Uyarı/ihlal olaylarında ilgili satır/istatistik cache'te yamanır ya da liste invalidate
  // edilir (bkz. hook başındaki gerekçe); ek olarak toast gösterir.
  useTicketRealtime()

  const [searchDraft, setSearchDraft] = useState(searchParams.get('q') ?? '')
  const debouncedSearch = useDebouncedValue(searchDraft, SEARCH_DEBOUNCE_MS)

  const [formModal, setFormModal] = useState<FormModalState>(null)
  const [assignTicket, setAssignTicket] = useState<Ticket | null>(null)
  const [deleteTicketState, setDeleteTicketState] = useState<Ticket | null>(null)

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

  const query: TicketsQuery = useMemo(() => {
    const assignedTo = searchParams.get('assigned_to')
    const companyId = searchParams.get('company_id')
    const tagId = searchParams.get('tag_id')
    return {
      page: Number(searchParams.get('page') ?? '1') || 1,
      per_page: Number(searchParams.get('per_page') ?? String(DEFAULT_PER_PAGE)) || DEFAULT_PER_PAGE,
      sort: searchParams.get('sort') ?? DEFAULT_SORT,
      q: searchParams.get('q') ?? undefined,
      status: (searchParams.get('status') ?? undefined) as TicketsQuery['status'],
      priority: (searchParams.get('priority') ?? undefined) as TicketsQuery['priority'],
      assigned_to: assignedTo ? Number(assignedTo) : undefined,
      company_id: companyId ? Number(companyId) : undefined,
      category: searchParams.get('category') ?? undefined,
      tag_id: tagId ? Number(tagId) : undefined,
      sla_breached: searchParams.get('sla_breached') === '1',
      from: searchParams.get('from') ?? undefined,
      to: searchParams.get('to') ?? undefined,
    }
  }, [searchParams])

  const { data, isLoading, isError, refetch } = useTickets(query)
  const { data: stats } = useTicketStats()
  const { data: userOptions, isForbidden: usersForbidden } = useTicketUserOptions()
  const { data: companyOptions } = useTicketCompanyOptions()
  const { data: tags } = useTicketTags()
  const deleteTicketMutation = useDeleteTicket()

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
    updateParams({ sort: nextSort ?? DEFAULT_SORT, page: '1' })
  }

  const statusFilterOptions = [{ value: '', label: 'Tüm durumlar' }, ...STATUS_OPTIONS]
  const priorityFilterOptions = [{ value: '', label: 'Tüm öncelikler' }, ...PRIORITY_OPTIONS]
  const assigneeFilterOptions = [
    { value: '', label: 'Tüm atananlar' },
    ...(userOptions ?? []).map((u) => ({ value: String(u.id), label: u.name })),
  ]
  const companyFilterOptions = [
    { value: '', label: 'Tüm firmalar' },
    ...(companyOptions ?? []).map((c) => ({ value: String(c.id), label: c.name })),
  ]
  const categoryFilterOptions = [{ value: '', label: 'Tüm kategoriler' }, ...TICKET_CATEGORY_OPTIONS]
  const tagFilterOptions = [
    { value: '', label: 'Tüm etiketler' },
    ...(tags ?? []).map((tag) => ({ value: String(tag.id), label: tag.name })),
  ]

  const tickets = data?.data ?? []
  const total = data?.meta.pagination.total ?? 0
  const isEmpty = !isLoading && !isError && tickets.length === 0

  return (
    <div className="flex flex-col gap-4">
      <nav aria-label="breadcrumb" className="text-xs text-fg-muted">
        <span>Anasayfa</span>
        <span className="mx-1.5">/</span>
        <span className="text-primary">Destek Talepleri</span>
      </nav>

      <Card>
        <CardHeader
          title="Destek Talepleri"
          subtitle={`${total} talep (filtrelenmiş)`}
          action={
            can('tickets.create') && (
              <Button leftIcon={<Plus className="size-4" aria-hidden="true" />} onClick={() => setFormModal({ mode: 'create' })}>
                Yeni Talep
              </Button>
            )
          }
        />
        <CardBody noPadding>
          {/* Özet kutuları FİLTRELERDEN BAĞIMSIZDIR (backend `stats` ucu, görev tanımı) —
              kullanıcıya bunun genel bir özet olduğunu belirtiyoruz. */}
          <div className="flex flex-col gap-1 border-b border-border-subtle px-4 py-3">
            <p className="text-xs text-fg-muted">Genel özet (aktif filtrelerden bağımsız):</p>
            {!stats ? (
              <Skeleton variant="text" width={320} />
            ) : (
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm">
                <span className="text-fg-secondary">
                  Toplam <strong className="text-fg">{stats.total}</strong>
                </span>
                <span className="text-fg-secondary">
                  Açık <strong className="text-fg">{stats.by_status.open}</strong> · Beklemede{' '}
                  <strong className="text-fg">{stats.by_status.pending}</strong> · Devam Ediyor{' '}
                  <strong className="text-fg">{stats.by_status.in_progress}</strong> · Çözüldü{' '}
                  <strong className="text-fg">{stats.by_status.resolved}</strong> · Kapandı{' '}
                  <strong className="text-fg">{stats.by_status.closed}</strong>
                </span>
                <span className="font-medium text-danger">SLA ihlali: {stats.breached_count}</span>
                <span className="font-medium text-warning">Risk altında: {stats.at_risk_count}</span>
                <span className="text-fg-secondary">Ort. çözüm süresi: {formatHours(stats.avg_resolution_hours)}</span>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3 border-b border-border-subtle p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
              <div className="w-full lg:max-w-xs">
                <Input
                  value={searchDraft}
                  onChange={(e) => setSearchDraft(e.target.value)}
                  placeholder="Talep no, konu ara..."
                  leftIcon={<Search className="size-4" aria-hidden="true" />}
                  aria-label="Talep ara"
                />
              </div>
              <div className="w-full lg:w-40">
                <Select
                  value={query.status ?? ''}
                  onChange={(e) => updateParams({ status: e.target.value || null, page: '1' })}
                  options={statusFilterOptions}
                  aria-label="Durum filtresi"
                />
              </div>
              <div className="w-full lg:w-40">
                <Select
                  value={query.priority ?? ''}
                  onChange={(e) => updateParams({ priority: e.target.value || null, page: '1' })}
                  options={priorityFilterOptions}
                  aria-label="Öncelik filtresi"
                />
              </div>
              {!usersForbidden && (
                <div className="w-full lg:w-44">
                  <Select
                    value={query.assigned_to ? String(query.assigned_to) : ''}
                    onChange={(e) => updateParams({ assigned_to: e.target.value || null, page: '1' })}
                    options={assigneeFilterOptions}
                    aria-label="Atanan filtresi"
                  />
                </div>
              )}
              <div className="w-full lg:w-44">
                <Select
                  value={query.company_id ? String(query.company_id) : ''}
                  onChange={(e) => updateParams({ company_id: e.target.value || null, page: '1' })}
                  options={companyFilterOptions}
                  aria-label="Firma filtresi"
                />
              </div>
              <div className="w-full lg:w-44">
                <Select
                  value={query.category ?? ''}
                  onChange={(e) => updateParams({ category: e.target.value || null, page: '1' })}
                  options={categoryFilterOptions}
                  aria-label="Kategori filtresi"
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
            </div>
            <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">
              <Checkbox
                label="Sadece SLA ihlalleri"
                checked={!!query.sla_breached}
                onChange={(e) => updateParams({ sla_breached: e.target.checked ? '1' : null, page: '1' })}
              />
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
              <p className="text-sm text-fg-muted">Talepler yüklenirken bir hata oluştu.</p>
              <Button variant="secondary" onClick={() => refetch()}>
                Tekrar dene
              </Button>
            </div>
          ) : isEmpty ? (
            <EmptyState
              icon={<LifeBuoy className="size-6" aria-hidden="true" />}
              title="Talep bulunamadı"
              description="Arama veya filtre kriterlerinizle eşleşen destek talebi yok."
            />
          ) : (
            <Table>
              <THead>
                <Tr>
                  <Th sortable sortDirection={sortDirectionFor('ticket_number')} onSort={() => toggleSort('ticket_number')}>
                    Talep No
                  </Th>
                  <Th sortable sortDirection={sortDirectionFor('subject')} onSort={() => toggleSort('subject')}>
                    Konu
                  </Th>
                  <Th sortable sortDirection={sortDirectionFor('priority')} onSort={() => toggleSort('priority')}>
                    Öncelik
                  </Th>
                  <Th sortable sortDirection={sortDirectionFor('status')} onSort={() => toggleSort('status')}>
                    Durum
                  </Th>
                  <Th sortable sortDirection={sortDirectionFor('sla_due_at')} onSort={() => toggleSort('sla_due_at')}>
                    SLA
                  </Th>
                  <Th>Firma / Kişi</Th>
                  <Th>Atanan</Th>
                  <Th sortable sortDirection={sortDirectionFor('created_at')} onSort={() => toggleSort('created_at')}>
                    Oluşturma
                  </Th>
                  <Th align="right">İşlemler</Th>
                </Tr>
              </THead>
              <TBody aria-busy={isLoading}>
                {isLoading
                  ? Array.from({ length: query.per_page ?? DEFAULT_PER_PAGE }).map((_, i) => (
                      <Tr key={i}>
                        <Td><Skeleton variant="text" width={90} /></Td>
                        <Td><Skeleton variant="text" width={180} /></Td>
                        <Td><Skeleton variant="text" width={70} /></Td>
                        <Td><Skeleton variant="text" width={90} /></Td>
                        <Td><Skeleton variant="text" width={110} /></Td>
                        <Td><Skeleton variant="text" width={120} /></Td>
                        <Td><Skeleton variant="text" width={100} /></Td>
                        <Td><Skeleton variant="text" width={90} /></Td>
                        <Td align="right"><Skeleton variant="text" width={100} className="ml-auto" /></Td>
                      </Tr>
                    ))
                  : tickets.map((ticket) => {
                      return (
                        <Tr key={ticket.id}>
                          <Td>
                            <Link
                              to={`/tickets/${ticket.id}`}
                              className="font-mono text-sm font-medium text-fg hover:text-primary hover:underline"
                            >
                              {ticket.ticket_number}
                            </Link>
                          </Td>
                          <Td className="max-w-64 truncate">
                            <Link to={`/tickets/${ticket.id}`} className="text-fg hover:text-primary hover:underline">
                              {ticket.subject}
                            </Link>
                          </Td>
                          <Td>
                            <TicketPriorityBadge priority={ticket.priority} />
                          </Td>
                          <Td>
                            <TicketStatusBadge status={ticket.status} />
                          </Td>
                          <Td>
                            <SlaCountdownInline ticket={ticket} />
                          </Td>
                          <Td>
                            <div className="flex flex-col text-sm">
                              <span className="truncate text-fg">{ticket.company?.name ?? '—'}</span>
                              {ticket.contact && <span className="truncate text-xs text-fg-muted">{ticket.contact.full_name}</span>}
                            </div>
                          </Td>
                          <Td>
                            {ticket.assignee ? (
                              <div className="flex items-center gap-2">
                                <Avatar name={ticket.assignee.name} size="xs" />
                                <span className="truncate text-sm text-fg">{ticket.assignee.name}</span>
                              </div>
                            ) : (
                              <span className="text-fg-muted">—</span>
                            )}
                          </Td>
                          <Td className="whitespace-nowrap">{formatDate(ticket.created_at)}</Td>
                          <Td align="right">
                            <div className="flex items-center justify-end gap-1">
                              <IconLinkButton label="Detay" to={`/tickets/${ticket.id}`}>
                                <UserCog className="size-4" aria-hidden="true" />
                              </IconLinkButton>
                              {/* Faz 13: izin var ama `can.update` false ise (sahiplik) buton GİZLENMEZ,
                                  devre dışı + tooltip gösterilir. */}
                              {can('tickets.update') && (
                                <IconButton
                                  label="Düzenle"
                                  disabled={!ticket.can.update}
                                  title={ticket.can.update ? 'Düzenle' : 'Bu talebin sahibi değilsiniz, düzenleyemezsiniz.'}
                                  onClick={() => setFormModal({ mode: 'edit', ticket })}
                                >
                                  <Pencil className="size-4" aria-hidden="true" />
                                </IconButton>
                              )}
                              {/* `tickets.assign` saf izin kontrolüdür — sahiplik boyutu yok. */}
                              {can('tickets.assign') && ticket.can.assign && (
                                <IconButton label="Ata" onClick={() => setAssignTicket(ticket)}>
                                  <Users className="size-4" aria-hidden="true" />
                                </IconButton>
                              )}
                              {/* Çözülmüş/kapanmış talep silinemez — durum kuralı, GİZLEME ile ele
                                  alınır (bkz. `TicketPolicy::delete`). */}
                              {can('tickets.delete') && ticket.can.delete && (
                                <IconButton label="Sil" danger onClick={() => setDeleteTicketState(ticket)}>
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

      <TicketFormModal open={!!formModal} onClose={() => setFormModal(null)} ticket={formModal?.mode === 'edit' ? formModal.ticket : null} />
      <AssignTicketModal open={!!assignTicket} onClose={() => setAssignTicket(null)} ticket={assignTicket} />

      <Modal
        open={!!deleteTicketState}
        onClose={() => setDeleteTicketState(null)}
        title="Talebi sil"
        description="Bu işlem geri alınamaz. Talep kalıcı olarak silinecek."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDeleteTicketState(null)}>
              Vazgeç
            </Button>
            <Button
              variant="danger"
              loading={deleteTicketMutation.isPending}
              onClick={async () => {
                if (!deleteTicketState) return
                await deleteTicketMutation.mutateAsync(deleteTicketState.id)
                setDeleteTicketState(null)
              }}
            >
              Sil
            </Button>
          </div>
        }
      >
        {deleteTicketState && (
          <p className="text-sm text-fg-secondary">
            <strong className="text-fg">
              {deleteTicketState.ticket_number} — {deleteTicketState.subject}
            </strong>{' '}
            adlı talebi silmek istediğinize emin misiniz?
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
  disabled,
  title,
}: {
  label: string
  onClick: () => void
  children: ReactNode
  danger?: boolean
  /** Faz 13: izin var ama bu kayıtta `can.*` false — buton görünür kalır, tıklanamaz olur. */
  disabled?: boolean
  /** Varsayılan tooltip `label`'dır; devre dışı durumda nedeni açıklayan bir metinle geçilebilir. */
  title?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={title ?? label}
      className={cn(
        'inline-flex size-8 items-center justify-center rounded-md text-fg-muted hover:bg-surface-2 hover:text-fg',
        'transition-colors duration-150 motion-reduce:transition-none',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-1',
        'disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-fg-muted',
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
