// Aktivite akışı — server-side sayfalama/sıralama/arama/filtreleme, tüm durum URL query
// string'inde (bkz. `DealsListPage`/`TasksPage` deseni).
import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ActivitySquare, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import {
  Avatar,
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
import { useAuthStore } from '../../auth/store'
import { useTaskUserOptions } from '../../tasks/api/tasksApi'
import { relatedRecordMeta, RELATED_RECORD_SELECTABLE_TYPES, relatedRecordTypeLabel } from '../../tasks/components/relatedRecordMeta'
import { ActivityTypeBadge } from '../components/ActivityTypeBadge'
import { ACTIVITY_TYPE_OPTIONS } from '../components/activityTypeMeta'
import { ActivityFormModal } from '../components/ActivityFormModal'
import { useActivities, useDeleteActivity } from '../api/activitiesApi'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import type { ActivitiesQuery, Activity } from '../types'

const DEFAULT_PER_PAGE = 10
const SEARCH_DEBOUNCE_MS = 300

function formatDateTime(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso))
  } catch {
    return iso
  }
}

type FormModalState = { mode: 'create' } | { mode: 'edit'; activity: Activity } | null

export function ActivitiesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { can } = usePermission()
  const currentUserId = useAuthStore((state) => state.user?.id)

  const [searchDraft, setSearchDraft] = useState(searchParams.get('q') ?? '')
  const debouncedSearch = useDebouncedValue(searchDraft, SEARCH_DEBOUNCE_MS)

  const [formModal, setFormModal] = useState<FormModalState>(null)
  const [deleteActivityState, setDeleteActivityState] = useState<Activity | null>(null)

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

  const query: ActivitiesQuery = useMemo(() => {
    const userId = searchParams.get('user_id')
    return {
      page: Number(searchParams.get('page') ?? '1') || 1,
      per_page: Number(searchParams.get('per_page') ?? String(DEFAULT_PER_PAGE)) || DEFAULT_PER_PAGE,
      sort: searchParams.get('sort') ?? '-occurred_at',
      q: searchParams.get('q') ?? undefined,
      type: (searchParams.get('type') ?? undefined) as ActivitiesQuery['type'],
      user_id: userId ? Number(userId) : undefined,
      activityable_type: (searchParams.get('activityable_type') ?? undefined) as ActivitiesQuery['activityable_type'],
      from: searchParams.get('from') ?? undefined,
      to: searchParams.get('to') ?? undefined,
    }
  }, [searchParams])

  const { data, isLoading, isError, refetch } = useActivities(query)
  const { data: userOptions, isForbidden: usersForbidden } = useTaskUserOptions()
  const deleteActivityMutation = useDeleteActivity()

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

  const typeFilterOptions = [{ value: '', label: 'Tüm türler' }, ...ACTIVITY_TYPE_OPTIONS]
  const userFilterOptions = [
    { value: '', label: 'Tüm kullanıcılar' },
    ...(userOptions ?? []).map((u) => ({ value: String(u.id), label: u.name })),
  ]
  const activityableFilterOptions = [
    { value: '', label: 'Tüm kayıt türleri' },
    ...RELATED_RECORD_SELECTABLE_TYPES.concat('ticket').map((type) => ({ value: type, label: relatedRecordTypeLabel(type) })),
  ]

  const activities = data?.data ?? []
  const total = data?.meta.pagination.total ?? 0
  const isEmpty = !isLoading && !isError && activities.length === 0

  function canDelete(activity: Activity): boolean {
    if (can('activities.delete')) return true
    return !!activity.user && activity.user.id === currentUserId
  }

  return (
    <div className="flex flex-col gap-4">
      <nav aria-label="breadcrumb" className="text-xs text-fg-muted">
        <span>Anasayfa</span>
        <span className="mx-1.5">/</span>
        <span className="text-primary">Aktiviteler</span>
      </nav>

      <Card>
        <CardHeader
          title="Aktiviteler"
          subtitle={`${total} aktivite`}
          action={
            can('activities.create') && (
              <Button leftIcon={<Plus className="size-4" aria-hidden="true" />} onClick={() => setFormModal({ mode: 'create' })}>
                Aktivite Kaydet
              </Button>
            )
          }
        />
        <CardBody noPadding>
          <div className="flex flex-col gap-3 border-b border-border-subtle p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
              <div className="w-full lg:max-w-xs">
                <Input
                  value={searchDraft}
                  onChange={(e) => setSearchDraft(e.target.value)}
                  placeholder="Konu ara..."
                  leftIcon={<Search className="size-4" aria-hidden="true" />}
                  aria-label="Aktivite ara"
                />
              </div>
              <div className="w-full lg:w-40">
                <Select
                  value={query.type ?? ''}
                  onChange={(e) => updateParams({ type: e.target.value || null, page: '1' })}
                  options={typeFilterOptions}
                  aria-label="Tür filtresi"
                />
              </div>
              {!usersForbidden && (
                <div className="w-full lg:w-44">
                  <Select
                    value={query.user_id ? String(query.user_id) : ''}
                    onChange={(e) => updateParams({ user_id: e.target.value || null, page: '1' })}
                    options={userFilterOptions}
                    aria-label="Kullanıcı filtresi"
                  />
                </div>
              )}
              <div className="w-full lg:w-44">
                <Select
                  value={query.activityable_type ?? ''}
                  onChange={(e) => updateParams({ activityable_type: e.target.value || null, page: '1' })}
                  options={activityableFilterOptions}
                  aria-label="İlgili kayıt türü filtresi"
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
          </div>

          {isError ? (
            <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
              <p className="text-sm text-fg-muted">Aktiviteler yüklenirken bir hata oluştu.</p>
              <Button variant="secondary" onClick={() => refetch()}>
                Tekrar dene
              </Button>
            </div>
          ) : isEmpty ? (
            <EmptyState
              icon={<ActivitySquare className="size-6" aria-hidden="true" />}
              title="Aktivite bulunamadı"
              description="Arama veya filtre kriterlerinizle eşleşen aktivite yok."
            />
          ) : (
            <Table>
              <THead>
                <Tr>
                  <Th>Tür</Th>
                  <Th sortable sortDirection={sortDirectionFor('subject')} onSort={() => toggleSort('subject')}>
                    Konu
                  </Th>
                  <Th>İlgili Kayıt</Th>
                  <Th>Kullanıcı</Th>
                  <Th sortable sortDirection={sortDirectionFor('occurred_at')} onSort={() => toggleSort('occurred_at')}>
                    Gerçekleşme
                  </Th>
                  <Th sortable sortDirection={sortDirectionFor('duration_minutes')} onSort={() => toggleSort('duration_minutes')}>
                    Süre
                  </Th>
                  <Th>Sonuç</Th>
                  <Th align="right">İşlemler</Th>
                </Tr>
              </THead>
              <TBody aria-busy={isLoading}>
                {isLoading
                  ? Array.from({ length: query.per_page ?? DEFAULT_PER_PAGE }).map((_, i) => (
                      <Tr key={i}>
                        <Td><Skeleton variant="text" width={90} /></Td>
                        <Td><Skeleton variant="text" width={180} /></Td>
                        <Td><Skeleton variant="text" width={110} /></Td>
                        <Td><Skeleton variant="text" width={100} /></Td>
                        <Td><Skeleton variant="text" width={120} /></Td>
                        <Td><Skeleton variant="text" width={50} /></Td>
                        <Td><Skeleton variant="text" width={100} /></Td>
                        <Td align="right"><Skeleton variant="text" width={80} className="ml-auto" /></Td>
                      </Tr>
                    ))
                  : activities.map((activity) => {
                      const meta = activity.activityable ? relatedRecordMeta(activity.activityable.type) : null
                      const Icon = meta?.icon
                      return (
                        <Tr key={activity.id}>
                          <Td>
                            <ActivityTypeBadge type={activity.type} />
                          </Td>
                          <Td className="font-medium text-fg">{activity.subject}</Td>
                          <Td>
                            {activity.activityable && meta && Icon ? (
                              <Link
                                to={meta.path(activity.activityable.id)}
                                className="inline-flex items-center gap-1.5 text-sm text-fg hover:text-primary hover:underline"
                              >
                                <Icon className="size-4 shrink-0 text-fg-muted" aria-hidden="true" />
                                <span className="max-w-40 truncate">{activity.activityable.label ?? meta.label}</span>
                              </Link>
                            ) : (
                              <span className="text-fg-muted">—</span>
                            )}
                          </Td>
                          <Td>
                            {activity.user ? (
                              <div className="flex items-center gap-2">
                                <Avatar name={activity.user.name} size="xs" />
                                <span className="truncate text-sm text-fg">{activity.user.name}</span>
                              </div>
                            ) : (
                              <span className="text-fg-muted">—</span>
                            )}
                          </Td>
                          <Td className="whitespace-nowrap">{formatDateTime(activity.occurred_at)}</Td>
                          <Td>{activity.duration_minutes !== null ? `${activity.duration_minutes} dk` : '—'}</Td>
                          <Td className="max-w-40 truncate">{activity.outcome ?? '—'}</Td>
                          <Td align="right">
                            <div className="flex items-center justify-end gap-1">
                              {can('activities.update') && (
                                <IconButton label="Düzenle" onClick={() => setFormModal({ mode: 'edit', activity })}>
                                  <Pencil className="size-4" aria-hidden="true" />
                                </IconButton>
                              )}
                              {canDelete(activity) && (
                                <IconButton label="Sil" danger onClick={() => setDeleteActivityState(activity)}>
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

      <ActivityFormModal
        open={!!formModal}
        onClose={() => setFormModal(null)}
        activity={formModal?.mode === 'edit' ? formModal.activity : null}
      />

      <Modal
        open={!!deleteActivityState}
        onClose={() => setDeleteActivityState(null)}
        title="Aktiviteyi sil"
        description="Bu işlem geri alınamaz. Aktivite kalıcı olarak silinecek."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDeleteActivityState(null)}>
              Vazgeç
            </Button>
            <Button
              variant="danger"
              loading={deleteActivityMutation.isPending}
              onClick={async () => {
                if (!deleteActivityState) return
                await deleteActivityMutation.mutateAsync(deleteActivityState.id)
                setDeleteActivityState(null)
              }}
            >
              Sil
            </Button>
          </div>
        }
      >
        {deleteActivityState && (
          <p className="text-sm text-fg-secondary">
            <strong className="text-fg">{deleteActivityState.subject}</strong> adlı aktiviteyi silmek istediğinize emin misiniz?
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
