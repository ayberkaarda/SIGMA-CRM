// Firma seçimi için aranabilir tekli combobox — `features/deals/components/DealCompanyCombobox.tsx`
// ile AYNI desen (bkz. rapor: features/products ve features/price-lists dışında dosya sahipliği
// paylaşımı yok, bu yüzden bu tur bileşenler her modülde küçük birer kopya olarak yaşıyor).
import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { Building2, X } from 'lucide-react'
import { Input } from '../../../components/ui'
import { cn } from '../../../lib/cn'
import { useCompanyOptionsSearch } from '../api/catalogApi'
import type { CompanyOption } from '../api/catalogApi'
import { useDebouncedValue } from '../hooks/useDebouncedValue'

export type CompanyComboboxProps = {
  value: CompanyOption | null
  onChange: (next: CompanyOption | null) => void
  label?: string
  error?: string
  disabled?: boolean
}

export function CompanyCombobox({ value, onChange, label = 'Firma', error, disabled }: CompanyComboboxProps) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const debouncedDraft = useDebouncedValue(draft, 300)
  const containerRef = useRef<HTMLDivElement | null>(null)

  const { data: options, isLoading } = useCompanyOptionsSearch(debouncedDraft, { enabled: open })

  useEffect(() => {
    if (!open) return
    function handleClick(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  function handleFocus() {
    if (disabled) return
    setDraft('')
    setOpen(true)
  }

  function handleSelect(option: CompanyOption | null) {
    onChange(option)
    setDraft('')
    setOpen(false)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      setOpen(false)
      event.currentTarget.blur()
    }
  }

  const displayValue = open ? draft : (value?.name ?? '')

  return (
    <div ref={containerRef} className="relative">
      <Input
        label={label}
        value={displayValue}
        onChange={(e) => setDraft(e.target.value)}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        placeholder="Firma ara..."
        leftIcon={<Building2 className="size-4" aria-hidden="true" />}
        disabled={disabled}
        rightIcon={
          value && !open && !disabled ? (
            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.stopPropagation()
                handleSelect(null)
              }}
              aria-label="Firma seçimini temizle"
              className="pointer-events-auto text-fg-muted hover:text-fg"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          ) : undefined
        }
        error={error}
        aria-expanded={open}
        role="combobox"
        aria-autocomplete="list"
      />
      {open && !disabled && (
        <div className="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-border-strong bg-surface-2 shadow-popover">
          <button
            type="button"
            onClick={() => handleSelect(null)}
            className={cn(
              'flex w-full items-center px-3 py-2 text-left text-sm text-fg-muted hover:bg-surface-3',
              !value && 'text-fg',
            )}
          >
            Firma yok / temizle
          </button>
          {isLoading ? (
            <p className="px-3 py-2 text-sm text-fg-muted">Yükleniyor…</p>
          ) : (options ?? []).length === 0 ? (
            <p className="px-3 py-2 text-sm text-fg-muted">Sonuç bulunamadı</p>
          ) : (
            (options ?? []).map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => handleSelect(option)}
                className={cn(
                  'flex w-full items-center px-3 py-2 text-left text-sm text-fg hover:bg-surface-3',
                  value?.id === option.id && 'bg-primary-tint text-primary',
                )}
              >
                {option.name}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
