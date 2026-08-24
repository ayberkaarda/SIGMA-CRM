// Fırsatlar tablo görünümü — server-side sayfalama/sıralama/arama/filtreleme, tüm durum
// URL query string'inde (bkz. `LeadsPage`/`UsersPage` deseni). Görünüm değiştirici (Pano /
// Liste) `/deals` ↔ `/deals/list` arasında geçiş yapar; işaretlemesi C'nin `DealsBoardPage.tsx`
// dosyasındaki denetimle BİREBİR aynı tutulur (bkz. aşağıdaki blok) — iki sayfa arasında geçiş
// yapan kullanıcı için kontrol yerinden oynamamalı.
import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Handshake, KanbanSquare, List as ListIcon, Pencil, Plus, Search, Trash2, UserCog, Users } from 'lucide-react'
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
import { formatMoney } from '../../../lib/money'
import { usePermission } from '../../auth/hooks/usePermission'
import { DealStageBadge } from '../components/DealStageBadge'
import { DealStatusBadge } from '../components/DealStatusBadge'
import { DealFormModal } from '../components/DealFormModal'
import { AssignDealOwnerModal } from '../components/AssignDealOwnerModal'
import { useDealTags } from '../components/dealsShared'
import { useDeals, useDeleteDeal } from '../api/dealsApi'
import type { DealsQuery } from '../api/dealsApi'
import { useDealCompanyOptions, useDealOwnerOptions, usePipelineStages } from '../api/boardApi'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import type { Deal } from '../types'

const DEFAULT_PER_PAGE = 10
const SEARCH_DEBOUNCE_MS = 300

const formatCurrency = formatMoney

/**
 * `GET /api/deals` yanıtına `meta.totals` eklenmesi B şeridin PARALEL işiydi — bu görev
 * başladığında C'nin `DealsListResponse` tipinde (dolayısıyla `api/dealsApi.ts`'te, ki o dosyaya
 * DOKUNMUYORUM) henüz YOKTU. `api/dealsApi.ts` güncellenene kadar tipi burada YEREL olarak
 * tanımlayıp güvenli bir cast ile OKUYORUM — alan gerçekten gelmiyorsa `totals` `undefined`
 * kalır ve bölüm tamamen gizlenir (aşağıya bkz.); geldiğinde otomatik görünür, uydurma/varsayım
 * YOK.
 */
type DealsTotals = {
  count: number
  total_amount: number
  open_amount: number
  won_amount: number
  lost_amount: number
  currency: string
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium' }).format(new Date(iso))
  } catch {
    return iso
  }
}

type FormModalState = { mode: 'create' } | { mode: 'edit'; deal: Deal } | null

export function DealsListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { can } = usePermission()

  const [searchDraft, setSearchDraft] = useState(searchParams.get('q') ?? '')
  const debouncedSearch = useDebouncedValue(searchDraft, SEARCH_DEBOUNCE_MS)

  const [formModal, setFormModal] = useState<FormModalState>(null)
  const [assignDeal, setAssignDeal] = useState<Deal | null>(null)
  const [deleteDealState, setDeleteDealState] = useState<Deal | null>(null)

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

  const query: DealsQuery = useMemo(() => {
    const stageId = searchParams.get('stage_id')
    const ownerId = searchParams.get('owner_id')
    const companyId = searchParams.get('company_id')
    const tagId = searchParams.get('tag_id')
    const amountMin = searchParams.get('amount_min')
    const amountMax = searchParams.get('amount_max')
    return {
      page: Number(searchParams.get('page') ?? '1') || 1,
      per_page: Number(searchParams.get('per_page') ?? String(DEFAULT_PER_PAGE)) || DEFAULT_PER_PAGE,
      sort: searchParams.get('sort') ?? undefined,
      q: searchParams.get('q') ?? undefined,
      stage_id: stageId ? Number(stageId) : undefined,
      status: (searchParams.get('status') ?? undefined) as DealsQuery['status'],
      owner_id: ownerId ? Number(ownerId) : undefined,
      company_id: companyId ? Number(companyId) : undefined,
      tag_id: tagId ? Number(tagId) : undefined,
      amount_min: amountMin ? Number(amountMin) : undefined,
      amount_max: amountMax ? Number(amountMax) : undefined,
      from: searchParams.get('from') ?? undefined,
      to: searchParams.get('to') ?? undefined,
    }
  }, [searchParams])

  const { data, isLoading, isError, refetch } = useDeals(query)
  const { data: pipelineStages } = usePipelineStages()
  const { data: ownerOptions, isForbidden: ownersForbidden } = useDealOwnerOptions()
  const { data: companyOptions } = useDealCompanyOptions()
  const { data: tags } = useDealTags()
  const deleteDealMutation = useDeleteDeal()

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

  const stageFilterOptions = [
    { value: '', label: 'Tüm aşamalar' },
    ...(pipelineStages ?? []).map((stage) => ({ value: String(stage.id), label: stage.name })),
  ]
  const statusFilterOptions = [
    { value: '', label: 'Tüm durumlar' },
    { value: 'open', label: 'Açık' },
    { value: 'won', label: 'Kazanıldı' },
    { value: 'lost', label: 'Kaybedildi' },
  ]
  const ownerFilterOptions = [
    { value: '', label: 'Tüm sahipler' },
    ...(ownerOptions ?? []).map((owner) => ({ value: String(owner.id), label: owner.name })),
  ]
  const companyFilterOptions = [
    { value: '', label: 'Tüm firmalar' },
    ...(companyOptions ?? []).map((c) => ({ value: String(c.id), label: c.name })),
  ]
  const tagFilterOptions = [
    { value: '', label: 'Tüm etiketler' },
    ...(tags ?? []).map((tag) => ({ value: String(tag.id), label: tag.name })),
  ]

  const deals = data?.data ?? []
  const total = data?.meta.pagination.total ?? 0
  const isEmpty = !isLoading && !isError && deals.length === 0
  const totals = (data?.meta as { totals?: DealsTotals } | undefined)?.totals

  return (
    <div className="flex flex-col gap-4">
      <nav aria-label="breadcrumb" className="text-xs text-fg-muted">
        <span>Anasayfa</span>
        <span className="mx-1.5">/</span>
        <span className="text-primary">Fırsatlar</span>
      </nav>

      <Card>
        <CardHeader
          title="Fırsatlar"
          subtitle={`${total} fırsat`}
          action={
            <div className="flex items-center gap-2">
              {/* Görünüm değiştirici — C'nin `DealsBoardPage.tsx`'teki denetimiyle BİREBİR aynı
                  yerleşim/boyut/token'lar (yalnızca aktif taraf ters çevrilmiştir), bkz. D şeridi
                  raporu: iki sayfa arasında geçişte kontrol yerinden oynamasın diye kasıtlı. */}
              <div
                className="flex items-center gap-1 rounded-lg border border-border bg-surface-1 p-1"
                role="group"
                aria-label="Görünüm"
              >
                <Link
                  to="/deals"
                  className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium text-fg-muted hover:bg-surface-2 hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  <KanbanSquare className="size-4" aria-hidden="true" />
                  Pano
                </Link>
                <span
                  aria-current="page"
                  className={cn('flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium', 'bg-primary-tint text-primary')}
                >
                  <ListIcon className="size-4" aria-hidden="true" />
                  Liste
                </span>
              </div>
              {can('deals.create') && (
                <Button leftIcon={<Plus className="size-4" aria-hidden="true" />} onClick={() => setFormModal({ mode: 'create' })}>
                  Yeni Fırsat
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
                  placeholder="Fırsat başlığı ara..."
                  leftIcon={<Search className="size-4" aria-hidden="true" />}
                  aria-label="Fırsat ara"
                />
              </div>
              <div className="w-full lg:w-44">
                <Select
                  value={query.stage_id ? String(query.stage_id) : ''}
                  onChange={(e) => updateParams({ stage_id: e.target.value || null, page: '1' })}
                  options={stageFilterOptions}
                  aria-label="Aşama filtresi"
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
              {!ownersForbidden && (
                <div className="w-full lg:w-44">
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
                  value={query.company_id ? String(query.company_id) : ''}
                  onChange={(e) => updateParams({ company_id: e.target.value || null, page: '1' })}
                  options={companyFilterOptions}
                  aria-label="Firma filtresi"
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
            <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
              <div className="flex w-full items-end gap-2 lg:w-auto">
                <div className="w-full lg:w-32">
                  <Input
                    type="number"
                    min={0}
                    value={query.amount_min ?? ''}
                    onChange={(e) => updateParams({ amount_min: e.target.value || null, page: '1' })}
                    placeholder="Min tutar"
                    aria-label="Minimum tutar"
                  />
                </div>
                <span className="pb-2.5 text-xs text-fg-muted">—</span>
                <div className="w-full lg:w-32">
                  <Input
                    type="number"
                    min={0}
                    value={query.amount_max ?? ''}
                    onChange={(e) => updateParams({ amount_max: e.target.value || null, page: '1' })}
                    placeholder="Maks tutar"
                    aria-label="Maksimum tutar"
                  />
                </div>
              </div>
              <div className="flex w-full items-end gap-2 lg:w-auto">
                <div className="w-full lg:w-40">
                  <Input
                    type="date"
                    value={query.from ?? ''}
                    onChange={(e) => updateParams({ from: e.target.value || null, page: '1' })}
                    aria-label="Başlangıç tarihi (tahmini kapanış)"
                    max={query.to || undefined}
                  />
                </div>
                <span className="pb-2.5 text-xs text-fg-muted">—</span>
                <div className="w-full lg:w-40">
                  <Input
                    type="date"
                    value={query.to ?? ''}
                    onChange={(e) => updateParams({ to: e.target.value || null, page: '1' })}
                    aria-label="Bitiş tarihi (tahmini kapanış)"
                    min={query.from || undefined}
                  />
                </div>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="border-b border-border-subtle px-4 py-3">
              <Skeleton variant="text" width={280} />
            </div>
          ) : totals ? (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-border-subtle px-4 py-3 text-sm">
              <span className="text-fg-secondary">
                <strong className="text-fg">{totals.count}</strong> kayıt (filtrelenmiş toplam)
              </span>
              <span
                className="font-medium text-primary"
                title={`Toplam: ${formatCurrency(totals.total_amount, totals.currency)} · Kazanılan: ${formatCurrency(totals.won_amount, totals.currency)} · Kaybedilen: ${formatCurrency(totals.lost_amount, totals.currency)}`}
              >
                Açık tutar: {formatCurrency(totals.open_amount, totals.currency)}
              </span>
              <span className="text-xs text-fg-muted">
                Kazanılan {formatCurrency(totals.won_amount, totals.currency)} · Kaybedilen{' '}
                {formatCurrency(totals.lost_amount, totals.currency)}
              </span>
            </div>
          ) : null}

          {isError ? (
            <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
              <p className="text-sm text-fg-muted">Fırsatlar yüklenirken bir hata oluştu.</p>
              <Button variant="secondary" onClick={() => refetch()}>
                Tekrar dene
              </Button>
            </div>
          ) : isEmpty ? (
            <EmptyState
              icon={<Handshake className="size-6" aria-hidden="true" />}
              title="Fırsat bulunamadı"
              description="Arama veya filtre kriterlerinizle eşleşen fırsat yok."
            />
          ) : (
            <Table>
              <THead>
                <Tr>
                  <Th sortable sortDirection={sortDirectionFor('title')} onSort={() => toggleSort('title')}>
                    Başlık
                  </Th>
                  <Th>Firma</Th>
                  <Th>Kişi</Th>
                  <Th>Aşama</Th>
                  <Th sortable sortDirection={sortDirectionFor('status')} onSort={() => toggleSort('status')}>
                    Durum
                  </Th>
                  <Th align="right" sortable sortDirection={sortDirectionFor('amount')} onSort={() => toggleSort('amount')}>
                    Tutar
                  </Th>
                  <Th>Olasılık</Th>
                  <Th
                    sortable
                    sortDirection={sortDirectionFor('expected_close_date')}
                    onSort={() => toggleSort('expected_close_date')}
                  >
                    Tahmini Kapanış
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
                        <Td><Skeleton variant="text" width={160} /></Td>
                        <Td><Skeleton variant="text" width={100} /></Td>
                        <Td><Skeleton variant="text" width={100} /></Td>
                        <Td><Skeleton variant="text" width={80} /></Td>
                        <Td><Skeleton variant="text" width={70} /></Td>
                        <Td align="right"><Skeleton variant="text" width={90} className="ml-auto" /></Td>
                        <Td><Skeleton variant="text" width={50} /></Td>
                        <Td><Skeleton variant="text" width={90} /></Td>
                        <Td><Skeleton variant="text" width={90} /></Td>
                        <Td><Skeleton variant="text" width={80} /></Td>
                        <Td align="right"><Skeleton variant="text" width={100} className="ml-auto" /></Td>
                      </Tr>
                    ))
                  : deals.map((deal) => {
                      const isClosed = deal.status !== 'open'
                      return (
                        <Tr key={deal.id}>
                          <Td>
                            <Link to={`/deals/${deal.id}`} className="font-medium text-fg hover:text-primary hover:underline">
                              {deal.title}
                            </Link>
                          </Td>
                          <Td>{deal.company?.name ?? '—'}</Td>
                          <Td>{deal.contact?.full_name ?? '—'}</Td>
                          <Td>
                            <DealStageBadge stage={deal.pipeline_stage} />
                          </Td>
                          <Td>
                            <DealStatusBadge status={deal.status} />
                          </Td>
                          <Td align="right" className="whitespace-nowrap font-medium">
                            {formatCurrency(deal.amount, deal.currency)}
                          </Td>
                          <Td>{deal.probability !== null ? `%${deal.probability}` : '—'}</Td>
                          <Td className={cn(deal.is_overdue && 'font-medium text-danger')}>
                            {formatDate(deal.expected_close_date)}
                          </Td>
                          <Td>
                            {deal.owner ? (
                              <div className="flex items-center gap-2">
                                <Avatar name={deal.owner.name} size="xs" />
                                <span className="truncate text-sm text-fg">{deal.owner.name}</span>
                              </div>
                            ) : (
                              <span className="text-fg-muted">—</span>
                            )}
                          </Td>
                          <Td>
                            <div className="flex flex-wrap gap-1">
                              {deal.tags.length === 0 && <span className="text-fg-muted">—</span>}
                              {deal.tags.map((tag) => (
                                <Badge key={tag.id} variant="neutral" size="sm">
                                  {tag.name}
                                </Badge>
                              ))}
                            </div>
                          </Td>
                          <Td align="right">
                            <div className="flex items-center justify-end gap-1">
                              <IconLinkButton label="Detay" to={`/deals/${deal.id}`}>
                                <UserCog className="size-4" aria-hidden="true" />
                              </IconLinkButton>
                              {can('deals.update') && (
                                <IconButton label="Düzenle" onClick={() => setFormModal({ mode: 'edit', deal })}>
                                  <Pencil className="size-4" aria-hidden="true" />
                                </IconButton>
                              )}
                              {can('deals.assign') && (
                                <IconButton label="Sahip ata" onClick={() => setAssignDeal(deal)}>
                                  <Users className="size-4" aria-hidden="true" />
                                </IconButton>
                              )}
                              {!isClosed && can('deals.delete') && (
                                <IconButton label="Sil" danger onClick={() => setDeleteDealState(deal)}>
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

      <DealFormModal open={!!formModal} onClose={() => setFormModal(null)} deal={formModal?.mode === 'edit' ? formModal.deal : null} />
      <AssignDealOwnerModal open={!!assignDeal} onClose={() => setAssignDeal(null)} deal={assignDeal} />

      <Modal
        open={!!deleteDealState}
        onClose={() => setDeleteDealState(null)}
        title="Fırsatı sil"
        description="Bu işlem geri alınamaz. Fırsat kalıcı olarak silinecek."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDeleteDealState(null)}>
              Vazgeç
            </Button>
            <Button
              variant="danger"
              loading={deleteDealMutation.isPending}
              onClick={async () => {
                if (!deleteDealState) return
                await deleteDealMutation.mutateAsync(deleteDealState.id)
                setDeleteDealState(null)
              }}
            >
              Sil
            </Button>
          </div>
        }
      >
        {deleteDealState && (
          <p className="text-sm text-fg-secondary">
            <strong className="text-fg">{deleteDealState.title}</strong> adlı fırsatı silmek istediğinize emin misiniz?
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
