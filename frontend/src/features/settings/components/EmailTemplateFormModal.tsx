// E-posta şablonu oluşturma/düzenleme modalı — form + değişken listesi + canlı önizleme.
//
// BU FAZDA E-POSTA GÖNDERİLMİYOR (kapalı devre sistem, `MAIL_MAILER=log`) — burada bilinçli
// olarak bir "gönder" / "test et" butonu YOK (görev tanımı). Önizleme yalnızca `body_html`'in
// tarayıcıda nasıl göründüğünü gösterir, değişkenler gerçek bir değerle DEĞİŞTİRİLMEZ (backend
// henüz hangi değişkenlerin hangi bağlamda dolacağını tanımlamadı) — ham `{{değişken}}`
// biçimiyle görünür, altındaki rozet listesi hangi değişkenlerin kullanılabilir olduğunu ayrıca
// gösterir.
//
// 2. TUR DÜZELTME: `variables` GÖNDERİLMEZSE sunucu `body_html` içindeki `{{değişken}}` yer
// tutucularından otomatik türetiyor. Bu yüzden kullanıcı hiç değişken eklemediyse (liste boş)
// `handleSubmit` bu anahtarı payload'a HİÇ KOYMAZ — boş dizi (`[]`) göndermek "değişken yok"
// anlamına gelir ve otomatik türetmeyi geçersiz kılardı, oysa istenen davranış budur.
import { useState } from 'react'
import type { FormEvent } from 'react'
import { Plus, X } from 'lucide-react'
import { Badge, Button, Input, Modal, Textarea } from '../../../components/ui'
import { getFieldErrors } from '../../../lib/axios'
import { useCreateEmailTemplate, useUpdateEmailTemplate } from '../hooks/useEmailTemplates'
import type { EmailTemplate } from '../types'

export type EmailTemplateFormModalProps = {
  open: boolean
  onClose: () => void
  template?: EmailTemplate | null
}

export function EmailTemplateFormModal({ open, onClose, template }: EmailTemplateFormModalProps) {
  const isEdit = !!template

  const createTemplate = useCreateEmailTemplate()
  const updateTemplate = useUpdateEmailTemplate()

  const [key, setKey] = useState('')
  const [name, setName] = useState('')
  const [subject, setSubject] = useState('')
  const [bodyHtml, setBodyHtml] = useState('')
  const [variables, setVariables] = useState<string[]>([])
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})

  const openKey = open ? (template ? `edit-${template.id}` : 'create') : null
  const [lastOpenKey, setLastOpenKey] = useState<string | null>(null)
  if (openKey !== lastOpenKey) {
    setLastOpenKey(openKey)
    if (openKey) {
      setKey(template?.key ?? '')
      setName(template?.name ?? '')
      setSubject(template?.subject ?? '')
      setBodyHtml(template?.body_html ?? '')
      setVariables(template?.variables ?? [])
      setFieldErrors({})
    }
  }

  const isPending = createTemplate.isPending || updateTemplate.isPending

  function fieldError(f: string): string | undefined {
    return fieldErrors[f]?.[0]
  }

  function validate(): boolean {
    const errors: Record<string, string[]> = {}
    if (!key.trim()) errors.key = ['Anahtar zorunludur.']
    if (!name.trim()) errors.name = ['Şablon adı zorunludur.']
    if (!subject.trim()) errors.subject = ['Konu zorunludur.']
    if (!bodyHtml.trim()) errors.body_html = ['İçerik zorunludur.']
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!validate()) return

    const cleanVariables = variables.map((v) => v.trim()).filter(Boolean)
    // Boşsa anahtarı payload'a hiç koyma — sunucu `body_html`'den otomatik türetsin (bkz. dosya
    // başı notu). `[]` göndermek bunun yerine "değişken yok" derdi.
    const payload = {
      key,
      name,
      subject,
      body_html: bodyHtml,
      ...(cleanVariables.length > 0 ? { variables: cleanVariables } : {}),
    }

    try {
      if (isEdit && template) {
        await updateTemplate.mutateAsync({ id: template.id, payload })
      } else {
        await createTemplate.mutateAsync(payload)
      }
      onClose()
    } catch (error) {
      const serverFieldErrors = getFieldErrors(error)
      if (serverFieldErrors) setFieldErrors(serverFieldErrors)
    }
  }

  function updateVariable(index: number, value: string) {
    setVariables((prev) => prev.map((v, i) => (i === index ? value : v)))
  }

  function removeVariable(index: number) {
    setVariables((prev) => prev.filter((_, i) => i !== index))
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'E-posta Şablonunu Düzenle' : 'Yeni E-posta Şablonu'}
      size="xl"
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Vazgeç
          </Button>
          <Button type="submit" form="email-template-form" loading={isPending}>
            {isEdit ? 'Kaydet' : 'Oluştur'}
          </Button>
        </div>
      }
    >
      <form id="email-template-form" onSubmit={handleSubmit} className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Anahtar (key)" value={key} onChange={(e) => setKey(e.target.value)} error={fieldError('key')} required />
            <Input label="Şablon Adı" value={name} onChange={(e) => setName(e.target.value)} error={fieldError('name')} required />
          </div>

          <Input label="Konu" value={subject} onChange={(e) => setSubject(e.target.value)} error={fieldError('subject')} required />

          <Textarea
            label="İçerik (HTML)"
            value={bodyHtml}
            onChange={(e) => setBodyHtml(e.target.value)}
            error={fieldError('body_html')}
            className="font-mono text-xs"
            rows={10}
            required
          />

          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-fg-muted">Değişkenler</span>
            <p className="text-xs text-fg-muted">
              Boş bırakabilirsiniz — sunucu, içerikteki <code className="font-mono">{'{{değişken}}'}</code> yer
              tutucularından otomatik türetir.
            </p>
            {variables.map((variable, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="flex-1">
                  <Input
                    value={variable}
                    onChange={(e) => updateVariable(index, e.target.value)}
                    placeholder="ör. customer_name"
                  />
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => removeVariable(index)} aria-label="Değişkeni kaldır">
                  <X className="size-4" aria-hidden="true" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              leftIcon={<Plus className="size-3.5" aria-hidden="true" />}
              onClick={() => setVariables((prev) => [...prev, ''])}
            >
              Değişken Ekle
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium text-fg-muted">Önizleme</span>
          <div className="flex flex-col gap-3 rounded-lg border border-border-subtle bg-surface-2 p-4">
            <div className="border-b border-border-subtle pb-2">
              <p className="text-xs text-fg-muted">Konu</p>
              <p className="text-sm font-medium text-fg">{subject || '—'}</p>
            </div>
            <div className="max-h-80 overflow-y-auto rounded-md bg-surface-1 p-3 text-sm text-fg">
              {bodyHtml ? (
                // eslint-disable-next-line react/no-danger
                <div dangerouslySetInnerHTML={{ __html: bodyHtml }} />
              ) : (
                <p className="text-fg-muted">İçerik girildikçe burada görünecek.</p>
              )}
            </div>
            {variables.filter((v) => v.trim()).length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {variables
                  .filter((v) => v.trim())
                  .map((variable, index) => (
                    <Badge key={index} variant="neutral" size="sm">
                      {`{{${variable.trim()}}}`}
                    </Badge>
                  ))}
              </div>
            )}
          </div>
        </div>
      </form>
    </Modal>
  )
}
