// Lead oluşturma/düzenleme modalı. `lead` prop'u verilmezse (null/undefined) oluşturma modu.
//
// DUPLICATE UYARISI (Faz 6/E kilit özelliği): email/phone/first_name/last_name/
// company_name alanlarından herhangi biri doluyken 500ms debounce sonrası
// `POST /api/leads/check-duplicates` çağrılır. Sonuç formu ENGELLEMEZ, yalnızca
// üstte bir uyarı paneli gösterir — kaydetme butonu her zaman aktif kalır
// (uyarı varken metni "Yine de Kaydet" olur).
import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Info } from 'lucide-react'
import { Button, Input, Modal, Select, Textarea } from '../../../components/ui'
import { getFieldErrors } from '../../../lib/axios'
import { useCheckDuplicates, useCreateLead, useCustomFields, useOwnerOptions, useUpdateLead } from '../api/leadsApi'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { EDITABLE_STATUS_OPTIONS, SOURCE_OPTIONS } from '../utils'
import { DuplicateWarningPanel } from './DuplicateWarningPanel'
import { TagMultiSelect } from './TagMultiSelect'
import { CustomFieldsSection } from './CustomFieldsSection'
import type { DuplicateCandidate, Lead, LeadSource, LeadStatus } from '../types'

export type LeadFormModalProps = {
  open: boolean
  onClose: () => void
  lead?: Lead | null
}

const DUPLICATE_DEBOUNCE_MS = 500

export function LeadFormModal({ open, onClose, lead }: LeadFormModalProps) {
  const isEdit = !!lead
  const createLead = useCreateLead()
  const updateLead = useUpdateLead()
  const checkDuplicates = useCheckDuplicates()
  const { data: ownerOptions, isForbidden: ownersForbidden } = useOwnerOptions()
  const { data: customFields } = useCustomFields('leads')

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [position, setPosition] = useState('')
  const [source, setSource] = useState<LeadSource>('website')
  const [status, setStatus] = useState<LeadStatus>('new')
  const [score, setScore] = useState('')
  const [ownerId, setOwnerId] = useState('')
  const [notes, setNotes] = useState('')
  const [tagIds, setTagIds] = useState<number[]>([])
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({})
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [candidates, setCandidates] = useState<DuplicateCandidate[]>([])

  // Modal her açılışında (veya farklı bir lead için açıldığında) formu sıfırla/doldur —
  // `UserFormModal`'daki render-sırasında-senkronizasyon deseniyle aynı.
  const openKey = open ? (lead ? `edit-${lead.id}` : 'create') : null
  const [lastOpenKey, setLastOpenKey] = useState<string | null>(null)
  if (openKey !== lastOpenKey) {
    setLastOpenKey(openKey)
    if (openKey) {
      setFirstName(lead?.first_name ?? '')
      setLastName(lead?.last_name ?? '')
      setEmail(lead?.email ?? '')
      setPhone(lead?.phone ?? '')
      setCompanyName(lead?.company_name ?? '')
      setPosition(lead?.position ?? '')
      setSource(lead?.source ?? 'website')
      setStatus((lead?.status && lead.status !== 'converted' ? lead.status : 'new') as LeadStatus)
      setScore(lead?.score !== undefined && lead?.score !== null ? String(lead.score) : '')
      setOwnerId(lead?.owner ? String(lead.owner.id) : '')
      setNotes(lead?.notes ?? '')
      setTagIds(lead?.tags.map((t) => t.id) ?? [])
      setCustomFieldValues(lead?.custom_fields ?? {})
      setFieldErrors({})
      setCandidates([])
    }
  }

  const dupInput = useMemo(
    () => ({
      email: email.trim(),
      phone: phone.trim(),
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      company_name: companyName.trim(),
    }),
    [email, phone, firstName, lastName, companyName]
  )
  const debouncedDupKey = useDebouncedValue(JSON.stringify(dupInput), DUPLICATE_DEBOUNCE_MS)

  // Boş girdide state'i senkron temizlemek yerine (bkz. `react-hooks/set-state-in-effect`),
  // görünürlük render sırasında `dupInput`'tan türetilir (`hasDuplicateInput` — aşağıda).
  // Bu effect yalnızca doluyken ASENKRON mutasyonu tetikler.
  useEffect(() => {
    if (!open) return
    const parsed = JSON.parse(debouncedDupKey) as typeof dupInput
    const hasAny = Object.values(parsed).some((v) => v !== '')
    if (!hasAny) return
    checkDuplicates.mutate(
      {
        email: parsed.email || undefined,
        phone: parsed.phone || undefined,
        first_name: parsed.first_name || undefined,
        last_name: parsed.last_name || undefined,
        company_name: parsed.company_name || undefined,
        exclude_lead_id: lead?.id,
      },
      {
        onSuccess: (data) => setCandidates(data),
        onError: () => setCandidates([]),
      }
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedDupKey, open])

  const hasDuplicateInput = Object.values(dupInput).some((v) => v !== '')
  const visibleCandidates = hasDuplicateInput ? candidates : []

  const isPending = createLead.isPending || updateLead.isPending

  function fieldError(field: string): string | undefined {
    return fieldErrors[field]?.[0]
  }

  function validate(): boolean {
    const errors: Record<string, string[]> = {}
    if (!firstName.trim()) errors.first_name = ['Ad alanı zorunludur.']
    if (!lastName.trim()) errors.last_name = ['Soyad alanı zorunludur.']
    if (!source) errors.source = ['Kaynak alanı zorunludur.']
    if (score.trim() !== '') {
      const n = Number(score)
      if (Number.isNaN(n) || n < 0 || n > 100) errors.score = ['Skor 0 ile 100 arasında olmalıdır.']
    }
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!validate()) return

    const payload = {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email: email.trim() || null,
      phone: phone.trim() || null,
      company_name: companyName.trim() || null,
      position: position.trim() || null,
      source,
      status,
      score: score.trim() === '' ? null : Number(score),
      owner_id: ownerId ? Number(ownerId) : null,
      notes: notes.trim() || null,
      tag_ids: tagIds,
      custom_fields: customFieldValues,
    }

    try {
      if (isEdit && lead) {
        await updateLead.mutateAsync({ id: lead.id, payload })
      } else {
        await createLead.mutateAsync(payload)
      }
      onClose()
    } catch (error) {
      const serverFieldErrors = getFieldErrors(error)
      if (serverFieldErrors) setFieldErrors(serverFieldErrors)
    }
  }

  const ownerSelectOptions = [
    { value: '', label: 'Atanmamış' },
    ...(ownerOptions ?? []).map((owner) => ({ value: String(owner.id), label: owner.name })),
  ]

  const hasDuplicateWarning = visibleCandidates.length > 0

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Müşteri Adayını Düzenle' : 'Yeni Müşteri Adayı'}
      size="lg"
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Vazgeç
          </Button>
          <Button type="submit" form="lead-form" loading={isPending}>
            {hasDuplicateWarning ? 'Yine de Kaydet' : isEdit ? 'Kaydet' : 'Oluştur'}
          </Button>
        </div>
      }
    >
      <form id="lead-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        {(hasDuplicateWarning || checkDuplicates.isPending) && (
          <DuplicateWarningPanel candidates={visibleCandidates} loading={checkDuplicates.isPending} />
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Ad" value={firstName} onChange={(e) => setFirstName(e.target.value)} error={fieldError('first_name')} required />
          <Input label="Soyad" value={lastName} onChange={(e) => setLastName(e.target.value)} error={fieldError('last_name')} required />
          <Input label="E-posta" type="email" value={email} onChange={(e) => setEmail(e.target.value)} error={fieldError('email')} />
          <Input label="Telefon" value={phone} onChange={(e) => setPhone(e.target.value)} error={fieldError('phone')} />
          <Input label="Firma Adı" value={companyName} onChange={(e) => setCompanyName(e.target.value)} error={fieldError('company_name')} />
          <Input label="Pozisyon" value={position} onChange={(e) => setPosition(e.target.value)} error={fieldError('position')} />
          <Select
            label="Kaynak"
            value={source}
            onChange={(e) => setSource(e.target.value as LeadSource)}
            options={SOURCE_OPTIONS}
            error={fieldError('source')}
          />
          <Select
            label="Durum"
            value={status}
            onChange={(e) => setStatus(e.target.value as LeadStatus)}
            options={EDITABLE_STATUS_OPTIONS}
            error={fieldError('status')}
          />
          <Input
            label="Skor (0-100)"
            type="number"
            min={0}
            max={100}
            value={score}
            onChange={(e) => setScore(e.target.value)}
            error={fieldError('score')}
          />
          {!ownersForbidden && (
            <Select
              label="Sahip"
              value={ownerId}
              onChange={(e) => setOwnerId(e.target.value)}
              options={ownerSelectOptions}
              error={fieldError('owner_id')}
            />
          )}
        </div>

        <TagMultiSelect selectedIds={tagIds} onChange={setTagIds} />

        <Textarea label="Notlar" value={notes} onChange={(e) => setNotes(e.target.value)} error={fieldError('notes')} />

        <CustomFieldsSection
          fields={customFields ?? []}
          values={customFieldValues}
          onChange={(key, value) => setCustomFieldValues((prev) => ({ ...prev, [key]: value }))}
        />

        {hasDuplicateWarning && (
          <div className="flex items-start gap-2 rounded-md bg-warning-tint p-3 text-xs text-warning">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <p>
              Olası eşleşen kayıtlar yukarıda listelendi. Kaydetmek yine de mümkündür — karar sizindir.
            </p>
          </div>
        )}
      </form>
    </Modal>
  )
}
