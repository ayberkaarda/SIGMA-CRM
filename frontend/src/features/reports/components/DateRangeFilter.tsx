// Tarih aralığı seçici — Dashboard ve Raporlar arasında paylaşılır (bkz. görev tanımı: "dashboard
// ile paylaşılabilir; nereye koyduğunu raporla" — burada, `features/reports/components/` altında,
// çünkü ilk müşterisi Raporlar'ın dört sekmesiydi; Dashboard sayfası bunu relative import ile
// kullanır). `interaction.md` "Filters & time ranges" sözleşmesi: presetler satır olarak
// listelenir (takvim ızgarasıyla uğraşmak yerine), seçili preset 16px kalın onay işaretiyle
// işaretlenir, özel aralık alttaki ince çizgi ayıracın ARKASINDA durur.
import { useEffect, useRef, useState } from 'react'
import { Calendar, Check, ChevronDown } from 'lucide-react'
import { Button, Input } from '../../../components/ui'
import { cn } from '../../../lib/cn'
import { DATE_RANGE_PRESETS, formatDateLabel, matchPreset } from '../utils'

export type DateRangeFilterProps = {
  from: string
  to: string
  onChange: (range: { from: string; to: string }) => void
}

export function DateRangeFilter({ from, to, onChange }: DateRangeFilterProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const activePreset = matchPreset(from, to)

  useEffect(() => {
    if (!open) return
    function handleClickOutside(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  const label = activePreset
    ? (DATE_RANGE_PRESETS.find((p) => p.key === activePreset)?.label ?? '')
    : `${formatDateLabel(from)} – ${formatDateLabel(to)}`

  return (
    <div ref={containerRef} className="relative">
      <Button
        variant="secondary"
        leftIcon={<Calendar className="size-4" aria-hidden="true" />}
        rightIcon={<ChevronDown className="size-4" aria-hidden="true" />}
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {label}
      </Button>

      {open && (
        <div
          role="menu"
          aria-label="Tarih aralığı"
          className="absolute left-0 top-full z-20 mt-2 w-72 overflow-hidden rounded-lg border border-border bg-surface-3 shadow-popover"
        >
          <div className="py-1">
            {DATE_RANGE_PRESETS.map((preset) => {
              const isActive = activePreset === preset.key
              return (
                <button
                  key={preset.key}
                  type="button"
                  role="menuitemradio"
                  aria-checked={isActive}
                  onClick={() => {
                    onChange(preset.range())
                    setOpen(false)
                  }}
                  className={cn(
                    'flex w-full items-center justify-between gap-2.5 px-3 py-2 text-left text-sm text-fg hover:bg-surface-2',
                    'transition-colors duration-150 motion-reduce:transition-none',
                  )}
                >
                  {preset.label}
                  {isActive && <Check className="size-4 text-primary" aria-hidden="true" />}
                </button>
              )
            })}
          </div>

          <div className="flex items-end gap-2 border-t border-border-subtle p-3">
            <div className="w-full">
              <Input
                type="date"
                label="Başlangıç"
                value={from}
                max={to}
                onChange={(e) => onChange({ from: e.target.value, to })}
              />
            </div>
            <div className="w-full">
              <Input
                type="date"
                label="Bitiş"
                value={to}
                min={from}
                onChange={(e) => onChange({ from, to: e.target.value })}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
