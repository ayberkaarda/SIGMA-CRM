// Firma oluşturma/düzenleme modalı. `company` prop'u verilmezse (null/undefined) oluşturma modu.
import { useState } from 'react'
import type { FormEvent } from 'react'
import { Info } from 'lucide-react'
import { Button, Input, Modal, Select, Textarea } from '../../../components/ui'
import { getFieldErrors } from '../../../lib/axios'
import { usePermission } from '../../auth/hooks/usePermission'
import { useCreateCompany, useCustomFields, useTags, useUpdateCompany, useUserOptions } from '../api/companiesApi'
import { TagMultiSelect } from './TagMultiSelect'
import type { Company } from '../types'

type CompanyFormModalProps = {
  open: boolean
  onClose: () => void
  company?: Company | null
}

/**
 * Website alanı: protokolsüz girilebilir (ör. "acme.com"), gönderilmeden önce protokol yoksa
 * `https://` eklenerek normalize edilir. Boş bırakılabilir (opsiyonel alan).
 */
function normalizeWebsite(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return ''
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
}

function isValidWebsite(raw: string): boolean {
  const trimmed = raw.trim()
  if (!trimmed) return true
  try {
    const url = new URL(normalizeWebsite(trimmed))
    return url.hostname.includes('.')
  } catch {
    return false
  }
}

function toNumberOrNull(raw: string): number | null {
  if (!raw.trim()) return null
  const value = Number(raw)
  return Number.isFinite(value) ? value : null
}

export function CompanyFormModal({ open, onClose, company }: CompanyFormModalProps) {
  const isEdit = !!company
  const { can } = usePermission()
  const canViewUsers = can('users.view')

  const { data: tags } = useTags()
  const { data: customFields } = useCustomFields()
  const { data: userOptions } = useUserOptions({ enabled: canViewUsers })
  const createCompany = useCreateCompany()
  const updateCompany = useUpdateCompany()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [website, setWebsite] = useState('')
  const [industry, setIndustry] = useState('')
  const [employeeCount, setEmployeeCount] = useState('')
  const [annualRevenue, setAnnualRevenue] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [country, setCountry] = useState('')
  const [ownerId, setOwnerId] = useState('')
  const [tagIds, setTagIds] = useState<number[]>([])
  const [notes, setNotes] = useState('')
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({})
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})

  // Modal her açılışında (veya farklı bir firma için açıldığında) formu sıfırla/doldur.
  // Render sırasında ayarlama (React'ın önerdiği "prop değiştiğinde state sıfırlama" deseni) —
  // kapanış animasyonu sırasında alanları boşaltmamak için yalnızca açılış anında tetiklenir.
  const openKey = open ? (company ? `edit-${company.id}` : 'create') : null
  const [lastOpenKey, setLastOpenKey] = useState<string | null>(null)
  if (openKey !== lastOpenKey) {
    setLastOpenKey(openKey)
    if (openKey) {
      setName(company?.name ?? '')
      setEmail(company?.email ?? '')
      setPhone(company?.phone ?? '')
      setWebsite(company?.website ?? '')
      setIndustry(company?.industry ?? '')
      setEmployeeCount(company?.employee_count != null ? String(company.employee_count) : '')
      setAnnualRevenue(company?.annual_revenue != null ? String(company.annual_revenue) : '')
      setAddress(company?.address ?? '')
      setCity(company?.city ?? '')
      setCountry(company?.country ?? '')
      setOwnerId(company?.owner ? String(company.owner.id) : '')
      setTagIds(company?.tags.map((tag) => tag.id) ?? [])
      setNotes(company?.notes ?? '')
      setCustomFieldValues(company?.custom_fields ?? {})
      setFieldErrors({})
    }
  }

  const isPending = createCompany.isPending || updateCompany.isPending

  function fieldError(field: string): string | undefined {
    return fieldErrors[field]?.[0]
  }

  function validate(): boolean {
    const errors: Record<string, string[]> = {}
    if (!name.trim()) errors.name = ['Firma adı zorunludur.']
    if (!isValidWebsite(website)) errors.website = ['Geçerli bir web sitesi adresi girin.']
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!validate()) return

    const payload = {
      name: name.trim(),
      email: email.trim() || null,
      phone: phone.trim() || null,
      website: website.trim() ? normalizeWebsite(website) : null,
      industry: industry.trim() || null,
      address: address.trim() || null,
      city: city.trim() || null,
      country: country.trim() || null,
      employee_count: toNumberOrNull(employeeCount),
      annual_revenue: toNumberOrNull(annualRevenue),
      notes: notes.trim() || null,
      owner_id: canViewUsers ? (ownerId ? Number(ownerId) : null) : undefined,
      tag_ids: tagIds,
      custom_fields: customFieldValues,
    }

    try {
      if (isEdit && company) {
        await updateCompany.mutateAsync({ id: company.id, payload })
      } else {
        await createCompany.mutateAsync(payload)
      }
      onClose()
    } catch (error) {
      const serverFieldErrors = getFieldErrors(error)
      if (serverFieldErrors) setFieldErrors(serverFieldErrors)
    }
  }

  const ownerOptions = [
    { value: '', label: 'Sahip seçilmedi' },
    ...(userOptions ?? []).map((user) => ({ value: String(user.id), label: user.name })),
  ]

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Firmayı Düzenle' : 'Yeni Firma'}
      size="lg"
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Vazgeç
          </Button>
          <Button type="submit" form="company-form" loading={isPending}>
            {isEdit ? 'Kaydet' : 'Oluştur'}
          </Button>
        </div>
      }
    >
      <form id="company-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Firma Adı"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={fieldError('name')}
          required
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="E-posta"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={fieldError('email')}
          />
          <Input label="Telefon" value={phone} onChange={(e) => setPhone(e.target.value)} error={fieldError('phone')} />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Website"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            error={fieldError('website')}
            placeholder="acme.com"
            hint={!fieldError('website') ? 'Protokol (https://) girmezseniz otomatik eklenir.' : undefined}
          />
          <Input
            label="Sektör"
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            error={fieldError('industry')}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Çalışan Sayısı"
            type="number"
            min={0}
            value={employeeCount}
            onChange={(e) => setEmployeeCount(e.target.value)}
            error={fieldError('employee_count')}
          />
          <Input
            label="Yıllık Ciro"
            type="number"
            min={0}
            value={annualRevenue}
            onChange={(e) => setAnnualRevenue(e.target.value)}
            error={fieldError('annual_revenue')}
          />
        </div>

        <Input label="Adres" value={address} onChange={(e) => setAddress(e.target.value)} error={fieldError('address')} />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Şehir" value={city} onChange={(e) => setCity(e.target.value)} error={fieldError('city')} />
          <Input label="Ülke" value={country} onChange={(e) => setCountry(e.target.value)} error={fieldError('country')} />
        </div>

        {canViewUsers && (
          <Select
            label="Sahip"
            value={ownerId}
            onChange={(e) => setOwnerId(e.target.value)}
            options={ownerOptions}
            error={fieldError('owner_id')}
          />
        )}

        <TagMultiSelect label="Etiketler" tags={tags ?? []} selectedIds={tagIds} onChange={setTagIds} error={fieldError('tag_ids')} />

        {customFields && customFields.length > 0 && (
          <div className="flex flex-col gap-4 rounded-md border border-border-subtle p-3">
            <p className="text-xs font-medium text-fg-muted">Özel Alanlar</p>
            {customFields.map((field) => (
              <Input
                key={field.key}
                label={field.label}
                value={customFieldValues[field.key] ?? ''}
                onChange={(e) => setCustomFieldValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                error={fieldError(`custom_fields.${field.key}`)}
              />
            ))}
          </div>
        )}

        <Textarea label="Notlar" value={notes} onChange={(e) => setNotes(e.target.value)} error={fieldError('notes')} rows={4} />

        {!isEdit && (
          <div className="flex items-start gap-2 rounded-md bg-primary-tint p-3 text-xs text-primary">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <p>Firma oluşturulduktan sonra kişiler ve fırsatlar bu firmaya bağlanabilir.</p>
          </div>
        )}
      </form>
    </Modal>
  )
}
