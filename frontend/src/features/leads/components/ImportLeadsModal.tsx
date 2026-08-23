// CSV içe aktarma modalı.
//
// Şablon indirme: `LogsPage`'in `ExportMenu`'sündeki gizli-iframe deseniyle
// aynı yaklaşım (bkz. o dosyanın üst yorumu) — kimlik doğrulama cookie
// tabanlı olduğundan indirme URL'i bir iframe'e yüklenir; 403/422 durumunda
// SPA sekmesi terk edilmez.
//
// Yükleme sonucu senkron (200) veya asenkron (202 + `batch_id`) olabilir.
// Asenkron durumda `pollImportBatch()` 2 sn aralıkla, EN FAZLA
// `IMPORT_POLL_MAX_ATTEMPTS` (60 ≈ 2 dakika) kez sorgular; aşılırsa
// kullanıcıya "işlem devam ediyor, daha sonra kontrol edin" gösterilir —
// sonsuz sorgulama YOK.
import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { AlertCircle, CheckCircle2, Download, UploadCloud } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { Button, Modal } from '../../../components/ui'
import { cn } from '../../../lib/cn'
import { getErrorMessage } from '../../../lib/axios'
import { leadsKeys } from '../api/leadsApi'
import { buildImportTemplateUrl, pollImportBatch, useImportLeads } from '../api/importApi'
import type { ImportDuplicateMode, ImportResult, ImportStatus } from '../types'

export type ImportLeadsModalProps = {
  open: boolean
  onClose: () => void
}

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024

const DUPLICATE_MODE_OPTIONS: Array<{ value: ImportDuplicateMode; label: string; description: string }> = [
  { value: 'skip', label: 'Atla', description: 'E-posta/telefon eşleşen satırlar atlanır, mevcut kayıt değişmez.' },
  { value: 'create', label: 'Yeni oluştur', description: 'Eşleşme olsa bile her satır için yeni bir aday oluşturulur.' },
  { value: 'update', label: 'Güncelle', description: 'Eşleşen kayıt varsa güncellenir, yoksa yeni oluşturulur.' },
]

type Phase = 'form' | 'busy' | 'result' | 'timed_out'

function triggerHiddenDownload(url: string) {
  let iframe = document.getElementById('leads-import-template-frame') as HTMLIFrameElement | null
  if (!iframe) {
    iframe = document.createElement('iframe')
    iframe.id = 'leads-import-template-frame'
    iframe.setAttribute('aria-hidden', 'true')
    iframe.style.position = 'fixed'
    iframe.style.width = '0'
    iframe.style.height = '0'
    iframe.style.border = '0'
    iframe.style.visibility = 'hidden'
    document.body.appendChild(iframe)
  }
  iframe.src = url
}

export function ImportLeadsModal({ open, onClose }: ImportLeadsModalProps) {
  const queryClient = useQueryClient()
  const importLeads = useImportLeads()
  const cancelledRef = useRef(false)

  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [duplicateMode, setDuplicateMode] = useState<ImportDuplicateMode>('skip')
  const [phase, setPhase] = useState<Phase>('form')
  const [result, setResult] = useState<ImportResult | null>(null)
  const [finalStatus, setFinalStatus] = useState<ImportStatus | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)

  // `cancelledRef` bir ref olduğundan render sırasında DEĞİL, yalnızca effect
  // içinde güncellenir: açılışta iptal bayrağı temizlenir, kapanışta devam
  // eden bir polling döngüsü varsa iptal edilir.
  useEffect(() => {
    cancelledRef.current = !open
  }, [open])

  // Modal her açılışında formu sıfırla — render-sırasında-senkronizasyon
  // deseni (bkz. `LeadFormModal`), yalnızca state (ref değil).
  const openKey = open ? 'open' : null
  const [lastOpenKey, setLastOpenKey] = useState<string | null>(null)
  if (openKey !== lastOpenKey) {
    setLastOpenKey(openKey)
    if (openKey) {
      setFile(null)
      setFileError(null)
      setDuplicateMode('skip')
      setPhase('form')
      setResult(null)
      setFinalStatus(null)
      setUploadError(null)
    }
  }

  function handleTemplateDownload() {
    triggerHiddenDownload(buildImportTemplateUrl())
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null
    setFileError(null)
    if (!selected) {
      setFile(null)
      return
    }
    if (!selected.name.toLowerCase().endsWith('.csv')) {
      setFile(null)
      setFileError('Yalnızca .csv dosyaları kabul edilir.')
      return
    }
    if (selected.size > MAX_FILE_SIZE_BYTES) {
      setFile(null)
      setFileError('Dosya boyutu 5 MB’ı aşamaz.')
      return
    }
    setFile(selected)
  }

  async function handleUpload() {
    if (!file) return
    setUploadError(null)
    setPhase('busy')

    try {
      const outcome = await importLeads.mutateAsync({ file, duplicateMode })

      if (outcome.kind === 'sync') {
        setResult(outcome.result)
        setFinalStatus('completed')
        setPhase('result')
        return
      }

      const pollResult = await pollImportBatch(outcome.batchId, () => cancelledRef.current)

      if (pollResult.kind === 'done') {
        setResult(pollResult.status.result ?? null)
        setFinalStatus(pollResult.status.status)
        setPhase('result')
        void queryClient.invalidateQueries({ queryKey: leadsKeys.all })
      } else if (pollResult.kind === 'timed_out') {
        setPhase('timed_out')
      }
      // 'cancelled' -> modal zaten kapatıldı, herhangi bir state güncellemesi gerekmez.
    } catch (error) {
      setUploadError(getErrorMessage(error))
      setPhase('form')
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Müşteri Adaylarını İçe Aktar"
      size="md"
      footer={
        phase === 'form' ? (
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Vazgeç
            </Button>
            <Button type="button" disabled={!file} loading={importLeads.isPending} onClick={handleUpload}>
              Yükle
            </Button>
          </div>
        ) : (
          <div className="flex justify-end gap-2">
            <Button type="button" onClick={onClose}>
              Kapat
            </Button>
          </div>
        )
      }
    >
      {phase === 'form' && (
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <p className="text-xs font-medium text-fg-muted">1. Şablon indir</p>
            <button
              type="button"
              onClick={handleTemplateDownload}
              className={cn(
                'flex w-fit items-center gap-1.5 text-sm text-primary hover:underline',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-1 rounded-sm'
              )}
            >
              <Download className="size-4" aria-hidden="true" />
              CSV şablonunu indir
            </button>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="lead-import-file" className="text-xs font-medium text-fg-muted">
              2. Dosya seç (.csv, en fazla 5 MB)
            </label>
            <label
              htmlFor="lead-import-file"
              className={cn(
                'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border-strong bg-surface-2 px-4 py-6 text-center',
                'transition-colors duration-150 motion-reduce:transition-none hover:bg-surface-3'
              )}
            >
              <UploadCloud className="size-6 text-fg-muted" aria-hidden="true" />
              <span className="text-sm text-fg">{file ? file.name : 'Dosya seçmek için tıklayın'}</span>
              <input
                id="lead-import-file"
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileChange}
                className="sr-only"
              />
            </label>
            {fileError && <p className="text-xs text-danger">{fileError}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <p className="text-xs font-medium text-fg-muted">3. Çakışan kayıtlar için davranış</p>
            <div className="flex flex-col gap-2">
              {DUPLICATE_MODE_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={cn(
                    'flex cursor-pointer flex-col gap-0.5 rounded-md border p-2.5',
                    duplicateMode === option.value ? 'border-primary bg-primary-tint' : 'border-border-subtle'
                  )}
                >
                  <span className="flex items-center gap-2 text-sm font-medium text-fg">
                    <input
                      type="radio"
                      name="duplicate-mode"
                      checked={duplicateMode === option.value}
                      onChange={() => setDuplicateMode(option.value)}
                      className="size-4"
                    />
                    {option.label}
                  </span>
                  <span className="pl-6 text-xs text-fg-muted">{option.description}</span>
                </label>
              ))}
            </div>
          </div>

          {uploadError && (
            <div className="flex items-start gap-2 rounded-md bg-danger-tint p-3 text-xs text-danger">
              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <p>{uploadError}</p>
            </div>
          )}
        </div>
      )}

      {phase === 'busy' && (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <div
            className="size-8 animate-spin motion-reduce:animate-none rounded-full border-2 border-border-strong border-t-primary"
            role="status"
            aria-label="Yükleniyor"
          />
          <p className="text-sm text-fg-muted">Dosya işleniyor, bu biraz zaman alabilir…</p>
        </div>
      )}

      {phase === 'timed_out' && (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <AlertCircle className="size-8 text-warning" aria-hidden="true" />
          <p className="text-sm text-fg">İşlem devam ediyor, daha sonra kontrol edin.</p>
          <p className="max-w-sm text-xs text-fg-muted">
            İçe aktarma arka planda sürüyor. Tamamlandığında liste güncellenecektir; bu pencereyi kapatıp devam
            edebilirsiniz.
          </p>
        </div>
      )}

      {phase === 'result' && result && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            {finalStatus === 'failed' ? (
              <AlertCircle className="size-5 text-danger" aria-hidden="true" />
            ) : (
              <CheckCircle2 className="size-5 text-success" aria-hidden="true" />
            )}
            <p className="text-sm font-medium text-fg">
              {finalStatus === 'failed' ? 'İçe aktarma başarısız oldu.' : 'İçe aktarma tamamlandı.'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {[
              { label: 'Toplam', value: result.total },
              { label: 'Oluşturulan', value: result.created },
              { label: 'Atlanan', value: result.skipped },
              { label: 'Güncellenen', value: result.updated },
              { label: 'Başarısız', value: result.failed },
            ].map((stat) => (
              <div key={stat.label} className="rounded-md bg-surface-2 p-2.5 text-center">
                <p className="text-lg font-medium text-fg">{stat.value}</p>
                <p className="text-xs text-fg-muted">{stat.label}</p>
              </div>
            ))}
          </div>

          {result.errors.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <p className="text-xs font-medium text-fg-muted">Satır bazlı hatalar</p>
              <div className="max-h-48 overflow-y-auto rounded-md border border-border-subtle">
                <ul className="divide-y divide-border-subtle">
                  {result.errors.map((rowError, index) => (
                    <li key={`${rowError.row}-${index}`} className="flex gap-2 px-3 py-2 text-xs">
                      <span className="shrink-0 font-medium text-fg-muted">Satır {rowError.row}</span>
                      <span className="text-danger">{rowError.message}</span>
                    </li>
                  ))}
                </ul>
              </div>
              {result.errors_truncated && (
                <p className="text-xs text-fg-muted">Hata listesi kısaltıldı — yalnızca ilk hatalar gösteriliyor.</p>
              )}
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}
