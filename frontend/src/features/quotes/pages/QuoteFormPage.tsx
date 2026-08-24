// Teklif oluşturma/düzenleme sayfası — `/quotes/new` ve `/quotes/:id/edit`. Ayrı bir SAYFA
// (Modal DEĞİL, görev tanımı: "Modal bu iş için dar") çünkü kalem editörü başlı başına geniş bir
// tablo + toplamlar bloğu taşıyor.
//
// KİLİT DAVRANIŞI (docs/QUOTE-FINANCIALS.md + QuoteService::AMOUNT_LOCKED_FIELDS): `draft`
// DIŞINDAKİ her durumda `items`, `discount_type`, `discount_value`, `company_id`, `contact_id`
// PATCH'TEN DEĞİŞTİRİLEMEZ (422 `QUOTE_LOCKED`). `title`, `notes`, `terms`, `valid_until`,
// `deal_id` KİLİTLİ DEĞİLDİR — sunum metni/idari bağ, tutarı etkilemez. Bu yüzden kilitli bir
// teklifte SADECE kalem editörü + indirim + firma/kişi salt-okunur olur; başlık/fırsat/tarih/
// notlar/şartlar yine düzenlenebilir kalır ve kaydedilebilir. Değişiklik payload'ı kilitli
// alanları HİÇ GÖNDERMEZ (undefined) — UpdateQuoteRequest'in "missing" kuralı yalnızca
// status/quote_number/toplamlar gibi sunucu-hesaplı alanlar için, company_id/contact_id/items/
// discount_* için `sometimes` kuralı geçerli: gövdede bulunurlarsa QUOTE_LOCKED tetiklenir.
import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, GitBranch, Info, Lock, Save } from 'lucide-react'
import { Button, Card, CardBody, CardHeader, Input, Modal, Select, Skeleton, Textarea, toast } from '../../../components/ui'
import { getErrorMessage, getFieldErrors } from '../../../lib/axios'
import { usePermission } from '../../auth/hooks/usePermission'
import { CompanyCombobox } from '../components/CompanyCombobox'
import { DealCombobox } from '../components/DealCombobox'
import { QuoteItemsEditor } from '../components/QuoteItemsEditor'
import { toEditableItem, toQuoteItemInput } from '../utils/quoteItems'
import type { EditableQuoteItem } from '../utils/quoteItems'
import { QuoteTotalsPanel } from '../components/QuoteTotalsPanel'
import { useQuoteCalculate } from '../hooks/useQuoteCalculate'
import { resolveProductPrice, useContactOptionsSearch } from '../api/catalogApi'
import type { CompanyOption, ContactOption, DealOption } from '../api/catalogApi'
import { usePriceLists } from '../../price-lists/api/priceListsApi'
import { useCreateQuote, useQuote, useReviseQuote, useUpdateQuote } from '../api/quotesApi'
import type { DiscountType, QuotePayload, QuoteStatus } from '../types'

const STATUS_LABELS: Record<QuoteStatus, string> = {
  draft: 'Taslak',
  sent: 'Gönderildi',
  accepted: 'Kabul Edildi',
  rejected: 'Reddedildi',
  expired: 'Süresi Doldu',
}

/** Kilitli bir alanın altında/yanında gösterilen küçük ipucu — kullanıcı ALAN BAZINDA neden
 * değiştiremediğini görsün (koordinatör düzeltmesi: yalnızca kart altlığı yetmiyordu). */
function LockedFieldHint() {
  return (
    <p className="mt-1 flex items-center gap-1 text-xs text-fg-muted">
      <Lock className="size-3" aria-hidden="true" />
      Gönderildikten sonra değiştirilemez.
    </p>
  )
}

export function QuoteFormPage() {
  const params = useParams<{ id?: string }>()
  const navigate = useNavigate()
  const { can } = usePermission()

  const isEdit = params.id !== undefined
  const quoteId = isEdit ? Number(params.id) : undefined
  const { data: quote, isLoading, isError, refetch } = useQuote(quoteId, { enabled: isEdit })

  const createQuote = useCreateQuote()
  const updateQuote = useUpdateQuote()
  const reviseQuote = useReviseQuote()

  const [title, setTitle] = useState('')
  const [deal, setDeal] = useState<DealOption | null>(null)
  const [company, setCompany] = useState<CompanyOption | null>(null)
  const [contact, setContact] = useState<ContactOption | null>(null)
  const [validUntil, setValidUntil] = useState('')
  const [notes, setNotes] = useState('')
  const [terms, setTerms] = useState('')
  const [discountType, setDiscountType] = useState<DiscountType>('amount')
  const [discountValue, setDiscountValue] = useState('0')
  const [items, setItems] = useState<EditableQuoteItem[]>([])
  const [priceListId, setPriceListId] = useState<number | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [confirmPriceList, setConfirmPriceList] = useState<{ nextId: number | null } | null>(null)
  const [updatingPrices, setUpdatingPrices] = useState(false)
  const [lastCompanyId, setLastCompanyId] = useState<number | null>(null)

  // Düzenleme modunda kayıtlı teklif geldiğinde formu BİR KEZ doldurur — `DealFormModal`'daki
  // `openKey`/`lastOpenKey` render-phase deseniyle AYNI (useEffect YERİNE): state'i render
  // sırasında ayarlamak React'ı bu render'ın JSX'ini atıp YENİ state'le HEMEN yeniden render
  // etmeye zorlar (bkz. React dokümanı "adjusting state when a prop changes"), bu yüzden
  // `lastCompanyId` de AYNI senkron blokta yazılır — aşağıdaki "firma değişince kişiyi sıfırla"
  // kontrolü hydration anında YANLIŞLIKLA tetiklenip az önce doldurulan `contact`'ı SIFIRLAMAZ.
  // useEffect kullanılsaydı bu iki güncelleme İKİ AYRI COMMIT'E düşer ve arada bir render
  // hydrated `contact`'ı görüp henüz eski `lastCompanyId`'yle karşılaştırıp SİLERDİ.
  const hydrationKey = isEdit ? (quote ? `edit-${quote.id}` : null) : 'create'
  const [lastHydrationKey, setLastHydrationKey] = useState<string | null>(null)
  if (hydrationKey !== null && hydrationKey !== lastHydrationKey) {
    setLastHydrationKey(hydrationKey)
    if (isEdit && quote) {
      setTitle(quote.title)
      setDeal(quote.deal ? { id: quote.deal.id, title: quote.deal.title } : null)
      setCompany(quote.company ? { id: quote.company.id, name: quote.company.name } : null)
      setContact(quote.contact ? { id: quote.contact.id, full_name: quote.contact.full_name } : null)
      setValidUntil(quote.valid_until ?? '')
      setNotes(quote.notes ?? '')
      setTerms(quote.terms ?? '')
      setDiscountType(quote.discount_type)
      setDiscountValue(String(quote.discount_value))
      setItems((quote.items ?? []).map(toEditableItem))
      setLastCompanyId(quote.company?.id ?? null)
    } else {
      setLastCompanyId(null)
    }
  }
  const hydrated = hydrationKey !== null && hydrationKey === lastHydrationKey

  const locked = isEdit && !!quote && quote.status !== 'draft'
  const revisable = !!quote && (quote.status === 'sent' || quote.status === 'rejected' || quote.status === 'expired')

  // Firma değişince kişi seçimini sıfırlar (aşağıdaki liste seçili firmaya göre filtrelenir) —
  // yukarıdaki hydration bloğu `lastCompanyId`'yi de senkron ayarladığı için bu yalnızca
  // KULLANICININ firma seçimini gerçekten değiştirdiği durumda eşleşmez.
  const currentCompanyId = company?.id ?? null
  if (hydrated && currentCompanyId !== lastCompanyId) {
    setLastCompanyId(currentCompanyId)
    setContact(null)
  }

  const { data: contactOptions } = useContactOptionsSearch(company?.id, '', { enabled: hydrated && !locked })
  // D şeridin `features/price-lists/` modülünden DOĞRUDAN yeniden kullanılıyor.
  const { data: priceListsData } = usePriceLists({ is_active: true, per_page: 100, sort: 'name' })
  const priceListOptions = priceListsData?.data

  const calcInput = useMemo(
    () => ({
      items: items.map(toQuoteItemInput),
      discount_type: discountType,
      discount_value: Number(discountValue) || 0,
    }),
    [items, discountType, discountValue],
  )
  const { result: calcResult, isCalculating } = useQuoteCalculate(calcInput, hydrated && !locked)

  const totals = locked && quote
    ? {
        subtotal: quote.subtotal,
        discount_amount: quote.discount_amount,
        tax_amount: quote.tax_amount,
        total: quote.total,
        tax_breakdown: quote.tax_breakdown ?? [],
      }
    : {
        subtotal: calcResult?.subtotal ?? 0,
        discount_amount: calcResult?.discount_amount ?? 0,
        tax_amount: calcResult?.tax_amount ?? 0,
        total: calcResult?.total ?? 0,
        tax_breakdown: calcResult?.tax_breakdown ?? [],
      }

  // İtemsRef: fiyat listesi değişiminde ürün bazlı kalemleri yeniden fiyatlandırırken en GÜNCEL
  // `items` state'ine erişmek için (async `resolveProductPrice` çağrıları arasında kullanıcı
  // başka bir satırı düzenlemiş olabilir).
  const itemsRef = useRef(items)
  useEffect(() => {
    itemsRef.current = items
  }, [items])

  function handlePriceListChange(value: string) {
    const nextId = value ? Number(value) : null
    const hasProductItems = items.some((item) => item.product_id !== null)
    if (hasProductItems) {
      setConfirmPriceList({ nextId })
    } else {
      setPriceListId(nextId)
    }
  }

  async function applyPriceListChange(updateExisting: boolean) {
    if (!confirmPriceList) return
    const { nextId } = confirmPriceList
    setPriceListId(nextId)
    setConfirmPriceList(null)

    if (!updateExisting) return

    setUpdatingPrices(true)
    try {
      const current = itemsRef.current
      const updated = await Promise.all(
        current.map(async (item) => {
          if (item.product_id === null) return item
          try {
            const resolved = await resolveProductPrice(item.product_id, nextId)
            return { ...item, unit_price: String(resolved.unit_price), tax_rate: String(resolved.tax_rate) }
          } catch {
            return item
          }
        }),
      )
      setItems(updated)
      toast.success('Ürün bazlı kalemlerin fiyatları yeni listeye göre güncellendi.')
    } finally {
      setUpdatingPrices(false)
    }
  }

  function fieldError(field: string): string | undefined {
    return fieldErrors[field]?.[0]
  }

  function buildPayload(): QuotePayload {
    const payload: QuotePayload = {
      title: title.trim(),
      deal_id: deal?.id ?? null,
      valid_until: validUntil || null,
      notes: notes || null,
      terms: terms || null,
    }
    // Kilitli (draft dışı) bir teklifte tutarı etkileyen alanlar HİÇ GÖNDERİLMEZ — gönderilse
    // (null olsa dahi) 422 QUOTE_LOCKED tetiklenir (bkz. dosya başındaki not).
    if (!locked) {
      payload.company_id = company?.id ?? null
      payload.contact_id = contact?.id ?? null
      payload.discount_type = discountType
      payload.discount_value = Number(discountValue) || 0
      payload.items = items.map(toQuoteItemInput)
    }
    return payload
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const errors: Record<string, string[]> = {}
    if (!title.trim()) errors.title = ['Teklif başlığı zorunludur.']
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    const payload = buildPayload()
    try {
      if (isEdit && quote) {
        const updated = await updateQuote.mutateAsync({ id: quote.id, payload })
        navigate(`/quotes/${updated.id}`)
      } else {
        const created = await createQuote.mutateAsync(payload)
        navigate(`/quotes/${created.id}`)
      }
    } catch (error) {
      const serverFieldErrors = getFieldErrors(error)
      if (serverFieldErrors) setFieldErrors(serverFieldErrors)
      else toast.error(getErrorMessage(error))
    }
  }

  async function handleRevise() {
    if (!quote) return
    try {
      const revised = await reviseQuote.mutateAsync(quote.id)
      navigate(`/quotes/${revised.id}/edit`)
    } catch {
      // Hata zaten useReviseQuote içinde toast ile gösterildi.
    }
  }

  if (isEdit && isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton variant="text" width={200} />
        <Card>
          <CardBody>
            <Skeleton variant="text" width={320} height={24} />
          </CardBody>
        </Card>
      </div>
    )
  }

  if (isEdit && (isError || !quote)) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <p className="text-sm text-fg-muted">Teklif yüklenirken bir hata oluştu.</p>
        <Button variant="secondary" onClick={() => refetch()}>
          Tekrar dene
        </Button>
      </div>
    )
  }

  const isPending = createQuote.isPending || updateQuote.isPending
  const priceListSelectOptions = [
    { value: '', label: '(Varsayılan fiyat listesi)' },
    ...(priceListOptions ?? []).map((pl) => ({ value: String(pl.id), label: pl.is_default ? `${pl.name} (varsayılan)` : pl.name })),
  ]
  const contactSelectOptions = [
    { value: '', label: 'Kişi yok' },
    ...(contactOptions ?? []).map((c) => ({ value: String(c.id), label: c.full_name })),
  ]

  return (
    <div className="flex flex-col gap-4">
      <nav aria-label="breadcrumb" className="flex items-center gap-1.5 text-xs text-fg-muted">
        <Link to="/quotes" className="inline-flex items-center gap-1 hover:text-fg">
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          Teklifler
        </Link>
        <span className="mx-1">/</span>
        <span className="text-primary">{isEdit ? quote?.quote_number : 'Yeni Teklif'}</span>
      </nav>

      {locked && quote && (
        <div className="flex flex-col gap-2 rounded-lg bg-warning-tint p-4 text-warning sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-2">
            <Info className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
            <div className="flex flex-col gap-1 text-sm">
              <p>
                Bu teklif &quot;{STATUS_LABELS[quote.status]}&quot; durumunda. <strong>Değiştirilemez:</strong>{' '}
                kalemler, indirim, firma, kişi. <strong>Düzenlenebilir:</strong> başlık, fırsat, geçerlilik
                tarihi, notlar, şartlar — bunlar yalnızca sunum/idari bilgidir, teklifin tutarını etkilemez ve
                normal &quot;Kaydet&quot; ile kaydedilir.
              </p>
              {revisable ? (
                <p>Kalemleri veya indirimi değiştirmeniz gerekiyorsa yeni bir revizyon oluşturun.</p>
              ) : (
                <p>
                  Bu teklif kabul edildiği için revizyon oluşturulamaz (kabul edilmiş bir taahhüt geri
                  alınamaz) — tutarı etkileyen bir değişiklik gerekiyorsa bağımsız yeni bir teklif açın.
                </p>
              )}
            </div>
          </div>
          {revisable && can('quotes.create') && (
            <Button
              type="button"
              variant="secondary"
              leftIcon={<GitBranch className="size-4" aria-hidden="true" />}
              loading={reviseQuote.isPending}
              onClick={handleRevise}
            >
              Revizyon Oluştur
            </Button>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Card>
          <CardHeader title={isEdit ? `${quote?.quote_number} — Düzenle` : 'Yeni Teklif'} />
          <CardBody className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Input
                  label="Başlık"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  error={fieldError('title')}
                  required
                />
              </div>
              <DealCombobox value={deal} onChange={setDeal} error={fieldError('deal_id')} />
              <Input
                label="Geçerlilik Tarihi"
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                error={fieldError('valid_until')}
              />
              <div>
                <CompanyCombobox value={company} onChange={setCompany} error={fieldError('company_id')} disabled={locked} />
                {locked && <LockedFieldHint />}
              </div>
              <div>
                <Select
                  label="Kişi"
                  value={contact ? String(contact.id) : ''}
                  onChange={(e) => {
                    const id = e.target.value ? Number(e.target.value) : null
                    const found = (contactOptions ?? []).find((c) => c.id === id)
                    setContact(found ?? null)
                  }}
                  options={contactSelectOptions}
                  disabled={locked}
                  error={fieldError('contact_id')}
                />
                {locked && <LockedFieldHint />}
              </div>
            </div>
            <Textarea label="Notlar" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
            <Textarea label="Şartlar" value={terms} onChange={(e) => setTerms(e.target.value)} rows={3} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Kalemler"
            subtitle={
              locked && (
                <span className="flex items-center gap-1">
                  <Lock className="size-3" aria-hidden="true" />
                  Tutarı etkilediği için salt okunur — değişiklik revizyon gerektirir.
                </span>
              )
            }
            action={
              !locked && (
                <div className="w-56">
                  <Select
                    label="Fiyat Listesi"
                    value={priceListId ? String(priceListId) : ''}
                    onChange={(e) => handlePriceListChange(e.target.value)}
                    options={priceListSelectOptions}
                    disabled={updatingPrices}
                  />
                </div>
              )
            }
          />
          <CardBody>
            <QuoteItemsEditor
              items={items}
              onChange={setItems}
              priceListId={priceListId}
              fieldErrors={fieldErrors}
              readOnly={locked}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="İndirim"
            subtitle={
              locked && (
                <span className="flex items-center gap-1">
                  <Lock className="size-3" aria-hidden="true" />
                  Gönderildikten sonra değiştirilemez.
                </span>
              )
            }
          />
          <CardBody>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:max-w-md">
              <Select
                label="İndirim Tipi"
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as DiscountType)}
                options={[
                  { value: 'amount', label: 'Sabit Tutar' },
                  { value: 'percent', label: 'Yüzde' },
                ]}
                disabled={locked}
                error={fieldError('discount_type')}
              />
              <Input
                label="İndirim Değeri"
                type="number"
                min={0}
                max={discountType === 'percent' ? 100 : undefined}
                step="0.01"
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                disabled={locked}
                rightIcon={<span className="text-xs text-fg-muted">{discountType === 'percent' ? '%' : 'TRY'}</span>}
                error={fieldError('discount_value')}
              />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Toplamlar" />
          <CardBody>
            <QuoteTotalsPanel
              subtotal={totals.subtotal}
              discountType={discountType}
              discountValue={Number(discountValue) || 0}
              discountAmount={totals.discount_amount}
              taxAmount={totals.tax_amount}
              total={totals.total}
              taxBreakdown={totals.tax_breakdown}
              isCalculating={!locked && isCalculating}
            />
          </CardBody>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => navigate(-1)}>
            Vazgeç
          </Button>
          <Button type="submit" leftIcon={<Save className="size-4" aria-hidden="true" />} loading={isPending}>
            Kaydet
          </Button>
        </div>
      </form>

      <Modal
        open={!!confirmPriceList}
        onClose={() => applyPriceListChange(false)}
        title="Fiyat listesi değişti"
        description="Ürün bazlı mevcut kalemlerin fiyatlarını yeni fiyat listesine göre de güncellemek ister misiniz? Serbest (ürünsüz) kalemler bu işlemden etkilenmez. Güncellemezseniz mevcut kalemler eski fiyatlarıyla kalır, yalnızca bundan sonra eklenen ürünler yeni listeyi kullanır."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => applyPriceListChange(false)}>
              Hayır, mevcut fiyatları koru
            </Button>
            <Button onClick={() => applyPriceListChange(true)}>Evet, güncelle</Button>
          </div>
        }
      >
        <p className="text-sm text-fg-secondary">Bu işlem geri alınamaz; ancak kaydetmeden formdan çıkarsanız değişiklik uygulanmaz.</p>
      </Modal>
    </div>
  )
}
