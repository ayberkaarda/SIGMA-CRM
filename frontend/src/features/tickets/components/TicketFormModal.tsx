// Talep oluşturma/düzenleme modalı. `ticket` verilmezse (null/undefined) oluşturma modu.
//
// DURUM ALANI YOK (görev tanımı + `docs/SLA-DESIGN.md` §4): oluşturmada sunucu her zaman
// `open` yazar, düzenlemede `PATCH /api/tickets/{id}` gövdesinde `status` gönderilirse backend
// 422 `missing` hatası üretir — durum yalnızca `PATCH /api/tickets/{id}/status` ucundan
// (bkz. `TicketStatusControl.tsx`) değişir.
//
// ÖNCELİK DEĞİŞİMİ SLA'YI YENİDEN HESAPLAR (§5.2): `normal → urgent` gibi bir yükseltmede hedef
// süre kısalır ve talep ANINDA ihlale düşebilir — bu BİLİNÇLİ bir davranıştır (aciliyet gerçeği
// sonradan anlaşıldıysa taahhüt baştan beri kısaydı). Düzenleme modunda öncelik değiştirilirken
// bunu açıkça uyarıyoruz ki kullanıcı "neden birden ihlale düştü" diye şaşırmasın.
import { useState } from 'react'
import type { FormEvent } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button, Input, Modal, Select, Textarea } from '../../../components/ui'
import { getFieldErrors } from '../../../lib/axios'
import { TicketCompanyCombobox } from './TicketCompanyCombobox'
import { TicketCustomFieldsSection } from './TicketCustomFieldsSection'
import { TicketTagMultiSelect } from './TicketTagMultiSelect'
import { TICKET_CATEGORY_OPTIONS } from './ticketCategoryOptions'
import { PRIORITY_OPTIONS } from './ticketPriorityMeta'
import { useTicketContactOptions, useTicketCustomFields, useTicketTags, useTicketUserOptions } from './ticketsShared'
import type { ContactOption } from '../types'
import { useCreateTicket, useUpdateTicket } from '../api/ticketsApi'
import type { CompanyOption, Ticket, TicketTag } from '../types'

export type TicketFormModalProps = {
  open: boolean
  onClose: () => void
  /** Verilirse düzenleme, yoksa oluşturma modu. */
  ticket?: Ticket | null
}

export function TicketFormModal({ open, onClose, ticket }: TicketFormModalProps) {
  const isEdit = !!ticket

  const { data: tagOptions, isLoading: tagsLoading } = useTicketTags()
  const { data: customFieldDefs } = useTicketCustomFields()
  const { data: userOptions, isForbidden: usersForbidden } = useTicketUserOptions()
  const createTicket = useCreateTicket()
  const updateTicket = useUpdateTicket()

  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('normal')
  const [category, setCategory] = useState('')
  const [company, setCompany] = useState<CompanyOption | null>(null)
  const [contact, setContact] = useState<ContactOption | null>(null)
  const [assignedTo, setAssignedTo] = useState('')
  const [tags, setTags] = useState<TicketTag[]>([])
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({})
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})

  const openKey = open ? (ticket ? `edit-${ticket.id}` : 'create') : null
  const [lastOpenKey, setLastOpenKey] = useState<string | null>(null)
  const [lastCompanyId, setLastCompanyId] = useState<number | null>(null)
  const [initialPriority, setInitialPriority] = useState<string | null>(null)
  if (openKey !== lastOpenKey) {
    setLastOpenKey(openKey)
    if (openKey) {
      setSubject(ticket?.subject ?? '')
      setDescription(ticket?.description ?? '')
      setPriority(ticket?.priority ?? 'normal')
      setInitialPriority(ticket?.priority ?? 'normal')
      setCategory(ticket?.category ?? '')
      setCompany(ticket?.company ?? null)
      setContact(ticket?.contact ?? null)
      setAssignedTo(ticket?.assignee ? String(ticket.assignee.id) : '')
      setTags(ticket?.tags ?? [])
      setCustomFieldValues(ticket?.custom_fields ?? {})
      setFieldErrors({})
      setLastCompanyId(ticket?.company?.id ?? null)
    }
  }

  // Şirket seçimi değiştiğinde kişi seçimini sıfırlar — `DealFormModal`'daki aynı render-phase
  // state ayarlama deseni (bkz. o dosyadaki geniş gerekçe).
  const currentCompanyId = company?.id ?? null
  if (currentCompanyId !== lastCompanyId) {
    setLastCompanyId(currentCompanyId)
    setContact(null)
  }

  const { data: contactOptions, isLoading: contactsLoading } = useTicketContactOptions(company?.id, '', { enabled: open })

  const isPending = createTicket.isPending || updateTicket.isPending
  const priorityChanged = isEdit && initialPriority !== null && priority !== initialPriority

  function fieldError(field: string): string | undefined {
    return fieldErrors[field]?.[0]
  }

  const customFieldErrorMap: Record<string, string> = Object.fromEntries(
    Object.entries(fieldErrors)
      .filter(([key]) => key.startsWith('custom_fields'))
      .map(([key, messages]) => [key, messages[0]])
  )

  function validate(): boolean {
    const errors: Record<string, string[]> = {}
    if (!subject.trim()) errors.subject = ['Konu zorunludur.']
    if (!description.trim()) errors.description = ['Açıklama zorunludur.']
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!validate()) return

    const basePayload = {
      subject,
      description,
      priority: priority as Ticket['priority'],
      category: category || null,
      company_id: company?.id ?? null,
      contact_id: contact?.id ?? null,
      assigned_to: assignedTo ? Number(assignedTo) : null,
      tag_ids: tags.map((t) => t.id),
      custom_fields: customFieldValues,
    }

    try {
      if (isEdit && ticket) {
        await updateTicket.mutateAsync({ id: ticket.id, payload: basePayload })
      } else {
        await createTicket.mutateAsync(basePayload)
      }
      onClose()
    } catch (error) {
      const serverFieldErrors = getFieldErrors(error)
      if (serverFieldErrors) setFieldErrors(serverFieldErrors)
    }
  }

  const assigneeOptions = [
    { value: '', label: 'Atanmamış' },
    ...(userOptions ?? []).map((u) => ({ value: String(u.id), label: u.name })),
  ]

  const contactSelectOptions = [
    { value: '', label: contactOptions === undefined ? 'Yükleniyor…' : 'Kişi yok' },
    ...(contactOptions ?? []).map((c) => ({ value: String(c.id), label: c.full_name })),
  ]

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Talebi Düzenle' : 'Yeni Talep'}
      size="lg"
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Vazgeç
          </Button>
          <Button type="submit" form="ticket-form" loading={isPending}>
            {isEdit ? 'Kaydet' : 'Oluştur'}
          </Button>
        </div>
      }
    >
      <form id="ticket-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        {!isEdit && (
          <p className="rounded-md bg-surface-2 px-3 py-2 text-xs text-fg-muted">
            Talep numarası ve durum sunucu tarafından belirlenir; yeni talepler her zaman "Açık" durumunda oluşturulur.
          </p>
        )}

        <Input label="Konu" value={subject} onChange={(e) => setSubject(e.target.value)} error={fieldError('subject')} required />

        <Textarea
          label="Açıklama"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          error={fieldError('description')}
          required
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Select
              label="Öncelik"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              options={PRIORITY_OPTIONS}
              error={fieldError('priority')}
            />
            {priorityChanged && (
              <p className="flex items-start gap-1.5 text-xs text-warning">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                SLA hedefi yeniden hesaplanacak; talep anında ihlale düşebilir (öncelik yükseltmesi hedefi kısaltır).
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="ticket-category" className="text-xs font-medium text-fg-muted">
              Kategori
            </label>
            <Input
              id="ticket-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Kategori seçin veya yazın"
              list="ticket-category-options"
              error={fieldError('category')}
            />
            <datalist id="ticket-category-options">
              {TICKET_CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value} />
              ))}
            </datalist>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TicketCompanyCombobox value={company} onChange={setCompany} error={fieldError('company_id')} />
          <Select
            label="Kişi"
            value={contact ? String(contact.id) : ''}
            onChange={(e) => {
              const id = e.target.value ? Number(e.target.value) : null
              const found = (contactOptions ?? []).find((c) => c.id === id) ?? null
              setContact(found)
            }}
            options={contactSelectOptions}
            hint={!company ? 'Firma seçilirse kişi listesi o firmaya göre filtrelenir.' : undefined}
            disabled={contactsLoading}
            error={fieldError('contact_id')}
          />
        </div>

        {!usersForbidden && (
          <Select
            label="Atanan"
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
            options={assigneeOptions}
            error={fieldError('assigned_to')}
          />
        )}

        <TicketTagMultiSelect value={tags} onChange={setTags} options={tagOptions ?? []} isLoading={tagsLoading} />

        <TicketCustomFieldsSection
          fields={customFieldDefs ?? []}
          values={customFieldValues}
          onChange={(key, value) => setCustomFieldValues((prev) => ({ ...prev, [key]: value }))}
          errors={customFieldErrorMap}
        />
      </form>
    </Modal>
  )
}
