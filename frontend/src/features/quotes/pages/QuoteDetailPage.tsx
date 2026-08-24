// Teklif detay sayfası — özet, revizyon şeridi, kalem tablosu, toplamlar, PDF önizleme, aksiyonlar.
import { useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Briefcase,
  Building2,
  Download,
  FileText,
  GitBranch,
  Pencil,
  Send,
  Trash2,
  User as UserIcon,
} from 'lucide-react'
import { Badge, Button, Card, CardBody, CardHeader, Modal, Select, Skeleton, Textarea } from '../../../components/ui'
import { usePermission } from '../../auth/hooks/usePermission'
import { QuoteStatusBadge } from '../components/QuoteStatusBadge'
import { QuoteTotalsPanel } from '../components/QuoteTotalsPanel'
import { formatDate, formatDateTime, formatTRY } from '../utils/money'
import {
  buildQuotePdfUrl,
  useChangeQuoteStatus,
  useDeleteQuote,
  useParentQuote,
  useQuote,
  useQuoteRevisionFamily,
  useReviseQuote,
  useSendQuote,
} from '../api/quotesApi'
import { MANUAL_QUOTE_STATUSES } from '../types'
import type { QuoteStatus } from '../types'

const MANUAL_STATUS_LABELS: Record<QuoteStatus, string> = {
  draft: 'Taslak',
  sent: 'Gönderildi',
  accepted: 'Kabul Edildi',
  rejected: 'Reddedildi',
  expired: 'Süresi Doldu',
}

export function QuoteDetailPage() {
  const params = useParams<{ id: string }>()
  const quoteId = Number(params.id)
  const navigate = useNavigate()
  const { can } = usePermission()

  const { data: quote, isLoading, isError, refetch } = useQuote(Number.isFinite(quoteId) ? quoteId : undefined)
  const { data: parentQuote } = useParentQuote(quote?.parent_quote_id)
  const { data: revisionFamily } = useQuoteRevisionFamily(quote)

  const sendQuote = useSendQuote()
  const deleteQuote = useDeleteQuote()
  const reviseQuote = useReviseQuote()
  const changeStatus = useChangeQuoteStatus()

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [statusOpen, setStatusOpen] = useState(false)
  const [statusTarget, setStatusTarget] = useState<QuoteStatus>('accepted')
  const [statusReason, setStatusReason] = useState('')

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton variant="text" width={200} />
        <Card>
          <CardBody>
            <Skeleton variant="text" width={280} height={24} />
          </CardBody>
        </Card>
      </div>
    )
  }

  if (isError || !quote) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <p className="text-sm text-fg-muted">Teklif yüklenirken bir hata oluştu.</p>
        <Button variant="secondary" onClick={() => refetch()}>
          Tekrar dene
        </Button>
      </div>
    )
  }

  // KARAR: "Düzenle" TÜM durumlarda gösterilir, yalnızca `draft`'ta değil — backend
  // `QuoteService::AMOUNT_LOCKED_FIELDS` kilidi `status !== 'draft'` bazlıdır ve `accepted`'ı
  // diğerlerinden AYIRMAZ; `title`/`notes`/`terms`/`valid_until`/`deal_id` her durumda
  // düzenlenebilir kalır (form zaten bu alanları locked=false gönderir, kilitli alanları hiç
  // göndermez). `accepted` için ayrıca ÖZEL KISITLAMA KONMADI: `revise()` `accepted`'ı reddeder
  // (QUOTE_NOT_REVISABLE) — yani kabul edilmiş bir teklifte başlıkta/notta bir yazım hatasını
  // düzeltmenin TEK yolu bu düzenleme formudur; "Düzenle"yi burada da gizlemek kullanıcıyı
  // çıkışsız bırakırdı. Bu, backend'in bilinçli yetki sınırına UYMAKTIR — UI'da fazladan bir
  // kısıtlama icat etmek `usePermission.ts`'in kendi notuyla ("asıl yetki kontrolü daima
  // backend'dedir") çelişirdi.
  const canEdit = can('quotes.update')
  const canSend = quote.status === 'draft' && quote.items_count > 0 && can('quotes.send')
  const canChangeStatus = quote.status === 'sent' && can('quotes.update')
  const isRevisable = ['sent', 'rejected', 'expired'].includes(quote.status)
  const canRevise = isRevisable && can('quotes.create')
  const canDelete = can('quotes.delete') && quote.status !== 'accepted' && quote.status !== 'rejected'

  const siblings = (revisionFamily ?? []).filter((q) => q.id !== quote.id)
  const pdfUrl = buildQuotePdfUrl(quote.id)

  async function handleSend() {
    await sendQuote.mutateAsync(quote!.id)
  }

  async function handleRevise() {
    try {
      const revised = await reviseQuote.mutateAsync(quote!.id)
      navigate(`/quotes/${revised.id}/edit`)
    } catch {
      // toast zaten hook içinde gösterildi
    }
  }

  async function handleChangeStatus() {
    try {
      await changeStatus.mutateAsync({ id: quote!.id, status: statusTarget, reason: statusReason || undefined })
      setStatusOpen(false)
      setStatusReason('')
    } catch {
      // toast zaten hook içinde gösterildi
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <nav aria-label="breadcrumb" className="flex items-center gap-1.5 text-xs text-fg-muted">
        <Link to="/quotes" className="inline-flex items-center gap-1 hover:text-fg">
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          Teklifler
        </Link>
        <span className="mx-1">/</span>
        <span className="text-primary">{quote.quote_number}</span>
      </nav>

      {quote.parent_quote_id !== null && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-primary-tint px-4 py-3 text-sm text-primary">
          <GitBranch className="size-4 shrink-0" aria-hidden="true" />
          <span>
            Bu, {parentQuote ? (
              <Link to={`/quotes/${parentQuote.id}`} className="font-medium underline">
                {parentQuote.quote_number}
              </Link>
            ) : (
              'ebeveyn teklifin'
            )}{' '}
            {quote.revision}. revizyonudur.
          </span>
        </div>
      )}

      {siblings.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-surface-2 px-4 py-3 text-sm text-fg-secondary">
          <GitBranch className="size-4 shrink-0 text-fg-muted" aria-hidden="true" />
          <span>Bu teklifin diğer revizyonları:</span>
          {siblings.map((sibling) => (
            <Link key={sibling.id} to={`/quotes/${sibling.id}`} className="font-medium text-primary hover:underline">
              {sibling.quote_number}
            </Link>
          ))}
        </div>
      )}

      <Card>
        <CardHeader
          // `CardHeader`'ın `title` prop'u `HTMLAttributes<HTMLDivElement>`'i de içerdiğinden
          // (native `title` tooltip özniteliğiyle isim çakışması) yalnızca STRING kabul eder —
          // JSX verilirse tip hatası. Teklif no + başlık burada düz metin, monospace vurgusu
          // olmadan; büyük toplam `subtitle`'da (o alan çakışmıyor, JSX kabul eder).
          title={`${quote.quote_number} — ${quote.title}`}
          subtitle={<span className="text-2xl font-semibold text-fg">{formatTRY(quote.total)}</span>}
          action={
            <div className="flex flex-wrap items-center justify-end gap-2">
              {canEdit && (
                <Button variant="secondary" leftIcon={<Pencil className="size-4" aria-hidden="true" />} onClick={() => navigate(`/quotes/${quote.id}/edit`)}>
                  Düzenle
                </Button>
              )}
              {canSend && (
                <Button leftIcon={<Send className="size-4" aria-hidden="true" />} loading={sendQuote.isPending} onClick={handleSend}>
                  Gönder
                </Button>
              )}
              {canChangeStatus && (
                <Button variant="secondary" onClick={() => setStatusOpen(true)}>
                  Durum Değiştir
                </Button>
              )}
              {canRevise && (
                <Button
                  variant="secondary"
                  leftIcon={<GitBranch className="size-4" aria-hidden="true" />}
                  loading={reviseQuote.isPending}
                  onClick={handleRevise}
                >
                  Revize Et
                </Button>
              )}
              <a href={pdfUrl} target="_blank" rel="noreferrer">
                <Button variant="secondary" leftIcon={<Download className="size-4" aria-hidden="true" />}>
                  PDF İndir
                </Button>
              </a>
              {canDelete && (
                <Button variant="danger" leftIcon={<Trash2 className="size-4" aria-hidden="true" />} onClick={() => setDeleteOpen(true)}>
                  Sil
                </Button>
              )}
            </div>
          }
        >
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <QuoteStatusBadge status={quote.status} />
            {quote.revision > 1 && <Badge variant="neutral">{`Revizyon ${quote.revision}`}</Badge>}
            {quote.is_expired && quote.status === 'sent' && <Badge variant="warning">Süresi Doldu</Badge>}
          </div>
        </CardHeader>
        <CardBody className="flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <DetailField label="Firma">
              {quote.company ? (
                <Link to={`/companies/${quote.company.id}`} className="flex items-center gap-1.5 text-sm text-primary hover:underline">
                  <Building2 className="size-3.5" aria-hidden="true" />
                  {quote.company.name}
                </Link>
              ) : (
                <span className="text-sm text-fg-muted">—</span>
              )}
            </DetailField>
            <DetailField label="Kişi">
              {quote.contact ? (
                <Link to={`/contacts/${quote.contact.id}`} className="flex items-center gap-1.5 text-sm text-primary hover:underline">
                  <UserIcon className="size-3.5" aria-hidden="true" />
                  {quote.contact.full_name}
                </Link>
              ) : (
                <span className="text-sm text-fg-muted">—</span>
              )}
            </DetailField>
            <DetailField label="Fırsat">
              {quote.deal ? (
                <Link to={`/deals/${quote.deal.id}`} className="flex items-center gap-1.5 text-sm text-primary hover:underline">
                  <Briefcase className="size-3.5" aria-hidden="true" />
                  {quote.deal.title}
                </Link>
              ) : (
                <span className="text-sm text-fg-muted">—</span>
              )}
            </DetailField>
            <DetailField label="Geçerlilik Tarihi">
              <span className={quote.is_expired ? 'text-sm font-medium text-warning' : 'text-sm text-fg'}>
                {formatDate(quote.valid_until)}
                {quote.is_expired && ' (süresi doldu)'}
              </span>
            </DetailField>
            <DetailField label="Oluşturan">
              <span className="text-sm text-fg">{quote.creator?.name ?? '—'}</span>
            </DetailField>
            <DetailField label="Oluşturma Tarihi">
              <span className="text-sm text-fg">{formatDateTime(quote.created_at)}</span>
            </DetailField>
            {quote.sent_at && (
              <DetailField label="Gönderim Tarihi">
                <span className="text-sm text-fg">{formatDateTime(quote.sent_at)}</span>
              </DetailField>
            )}
            {quote.accepted_at && (
              <DetailField label="Kabul Tarihi">
                <span className="text-sm text-success">{formatDateTime(quote.accepted_at)}</span>
              </DetailField>
            )}
            {quote.rejected_at && (
              <DetailField label="Red Tarihi">
                <span className="text-sm text-danger">{formatDateTime(quote.rejected_at)}</span>
              </DetailField>
            )}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Kalemler" subtitle={`${quote.items_count} kalem`} />
        <CardBody noPadding>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-border-subtle">
                  <th className="px-4 py-3 text-xs font-medium text-fg-muted">#</th>
                  <th className="px-4 py-3 text-xs font-medium text-fg-muted">Kalem</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-fg-muted">Miktar</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-fg-muted">Birim Fiyat</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-fg-muted">İndirim %</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-fg-muted">KDV %</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-fg-muted">Satır Toplamı</th>
                </tr>
              </thead>
              <tbody>
                {(quote.items ?? []).map((item) => (
                  <tr key={item.id} className="border-b border-border-subtle last:border-0">
                    <td className="px-4 py-3 text-fg-muted">{item.position}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="text-fg">{item.name}</span>
                        {item.description && <span className="text-xs text-fg-muted">{item.description}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-fg">{item.quantity}</td>
                    <td className="px-4 py-3 text-right text-fg">{formatTRY(item.unit_price)}</td>
                    <td className="px-4 py-3 text-right text-fg">%{item.discount_percent}</td>
                    <td className="px-4 py-3 text-right text-fg">%{item.tax_rate}</td>
                    <td className="px-4 py-3 text-right font-medium text-fg">{formatTRY(item.line_total)}</td>
                  </tr>
                ))}
                {(quote.items ?? []).length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-sm text-fg-muted">
                      Bu teklifte henüz kalem yok.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Toplamlar" />
        <CardBody>
          <QuoteTotalsPanel
            subtotal={quote.subtotal}
            discountType={quote.discount_type}
            discountValue={quote.discount_value}
            discountAmount={quote.discount_amount}
            taxAmount={quote.tax_amount}
            total={quote.total}
            taxBreakdown={quote.tax_breakdown ?? []}
          />
        </CardBody>
      </Card>

      {(quote.notes || quote.terms) && (
        <Card>
          <CardHeader title="Notlar ve Şartlar" />
          <CardBody className="flex flex-col gap-4">
            {quote.notes && (
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium uppercase tracking-wide text-fg-muted">Notlar</span>
                <p className="whitespace-pre-wrap text-sm text-fg-secondary">{quote.notes}</p>
              </div>
            )}
            {quote.terms && (
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium uppercase tracking-wide text-fg-muted">Şartlar</span>
                <p className="whitespace-pre-wrap text-sm text-fg-secondary">{quote.terms}</p>
              </div>
            )}
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader
          title="PDF Önizleme"
          action={
            <a href={pdfUrl} target="_blank" rel="noreferrer">
              <Button variant="secondary" size="sm" leftIcon={<FileText className="size-4" aria-hidden="true" />}>
                Yeni Sekmede Aç
              </Button>
            </a>
          }
        />
        <CardBody noPadding>
          {/* Sabit yükseklik TOKEN SÖZLEŞMESİ gereği arbitrary Tailwind sınıfıyla (`h-[720px]`)
              DEĞİL, inline `style` ile verilir — `ScoreIndicator`/`SlaCountdown` ile aynı
              kabul edilmiş desen (dinamik/precise boyut için tek çıkış yolu). */}
          <iframe
            src={pdfUrl}
            title="Teklif PDF Önizleme"
            className="w-full rounded-b-lg border-0"
            style={{ height: 720 }}
          />
        </CardBody>
      </Card>

      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Teklifi sil"
        description="Bu işlem geri alınamaz. Teklif kalıcı olarak silinecek."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDeleteOpen(false)}>
              Vazgeç
            </Button>
            <Button
              variant="danger"
              loading={deleteQuote.isPending}
              onClick={async () => {
                await deleteQuote.mutateAsync(quote.id)
                setDeleteOpen(false)
                navigate('/quotes')
              }}
            >
              Sil
            </Button>
          </div>
        }
      >
        <p className="text-sm text-fg-secondary">
          <strong className="text-fg">
            {quote.quote_number} — {quote.title}
          </strong>{' '}
          adlı teklifi silmek istediğinize emin misiniz?
        </p>
      </Modal>

      <Modal
        open={statusOpen}
        onClose={() => setStatusOpen(false)}
        title="Teklif durumunu değiştir"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setStatusOpen(false)}>
              Vazgeç
            </Button>
            <Button loading={changeStatus.isPending} onClick={handleChangeStatus}>
              Kaydet
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          <Select
            label="Yeni Durum"
            value={statusTarget}
            onChange={(e) => setStatusTarget(e.target.value as QuoteStatus)}
            options={MANUAL_QUOTE_STATUSES.map((status) => ({ value: status, label: MANUAL_STATUS_LABELS[status] }))}
          />
          <Textarea
            label="Gerekçe (opsiyonel)"
            value={statusReason}
            onChange={(e) => setStatusReason(e.target.value)}
            rows={3}
          />
        </div>
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
