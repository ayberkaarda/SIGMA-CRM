// Native <select> tabanlı seçim bileşeni — Input ile aynı label/hata/ipucu deseni.
import { forwardRef, useId } from 'react'
import type { SelectHTMLAttributes } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '../../lib/cn'

export type SelectProps = {
  label?: string
  error?: string
  hint?: string
  options?: Array<{ value: string; label: string; disabled?: boolean }>
  placeholder?: string
} & Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'>

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      className,
      label,
      error,
      hint,
      options,
      placeholder,
      id,
      disabled,
      children,
      defaultValue,
      ...props
    },
    ref
  ) => {
    const autoId = useId()
    const selectId = id ?? autoId
    const errorId = `${selectId}-error`
    const hintId = `${selectId}-hint`
    const describedBy = error ? errorId : hint ? hintId : undefined

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={selectId} className="text-xs font-medium text-fg-muted">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            disabled={disabled}
            aria-invalid={!!error || undefined}
            aria-describedby={describedBy}
            defaultValue={defaultValue ?? (placeholder ? '' : undefined)}
            className={cn(
              'w-full appearance-none rounded-md border border-border-strong bg-surface-2 px-3 pr-9 text-sm text-fg',
              'h-10',
              'transition-colors duration-150 motion-reduce:transition-none',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-1',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              error && 'border-danger',
              className
            )}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options
              ? options.map((opt) => (
                  <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                    {opt.label}
                  </option>
                ))
              : children}
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-fg-muted"
            aria-hidden="true"
          />
        </div>
        {error && (
          <p id={errorId} className="text-xs text-danger">
            {error}
          </p>
        )}
        {!error && hint && (
          <p id={hintId} className="text-xs text-fg-muted">
            {hint}
          </p>
        )}
      </div>
    )
  }
)

Select.displayName = 'Select'
