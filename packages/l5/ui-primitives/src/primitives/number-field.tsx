import { useEffect, useId, useState } from 'react'
import { Input } from './input'
import { formatNumberFieldValue, type NumberFieldPrecision } from './number-field-format'

export { formatNumberFieldValue, type NumberFieldPrecision } from './number-field-format'

export type NumberFieldValidation = (id: string, error: string | null) => void

function parseNumber(text: string, min: number, integer: boolean, positive: boolean) {
  const trimmed = text.trim()
  if (!trimmed) return { error: 'Enter a value.' }
  if (!/^[+-]?(?:\d+(?:[.,]\d*)?|[.,]\d+)$/.test(trimmed)) return { error: 'Enter a number, using a decimal point or comma.' }
  return validateNumber(Number(trimmed.replace(',', '.')), min, integer, positive)
}

function validateNumber(value: number, min: number, integer: boolean, positive: boolean) {
  if (!Number.isFinite(value)) return { error: 'Enter a finite number.' }
  if (integer && !Number.isSafeInteger(value)) return { error: 'Enter a whole number.' }
  if (positive && value <= 0) return { error: 'Enter a value greater than zero.' }
  if (value < min) return { error: `Enter ${min} or more.` }
  return { value, error: null }
}

/** Preserve editable text separately from the last accepted numeric value. */
export function NumberField({ label, value, onValueChange, suffix, min = 0, integer = false, positive = false, hideLabel = false, onValidationChange, resetKey = 0, decimalPlaces = 1 }: {
  label: string
  value: number
  onValueChange: (value: number) => void
  suffix?: string
  min?: number
  integer?: boolean
  positive?: boolean
  hideLabel?: boolean
  onValidationChange?: NumberFieldValidation
  resetKey?: number
  decimalPlaces?: NumberFieldPrecision
}) {
  const id = useId()
  const [edit, setEdit] = useState<{ text: string; revision: number } | null>(null)
  const [focused, setFocused] = useState(false)
  const editing = edit?.revision === resetKey ? edit : null
  const parsed = editing ? parseNumber(editing.text, min, integer, positive) : validateNumber(value, min, integer, positive)
  const text = editing ? editing.text : parsed.error && Number.isFinite(value) ? String(value) : formatNumberFieldValue(value, integer ? 0 : decimalPlaces)
  const error = parsed.error
  const showError = Boolean(error) && !focused

  useEffect(() => {
    onValidationChange?.(id, error ? `${label}: ${error}` : null)
  }, [error, id, label, onValidationChange])
  useEffect(() => () => onValidationChange?.(id, null), [id, onValidationChange])

  return <div data-slot="number-field" className="grid min-w-0 content-start gap-1">
    <label htmlFor={id} className={hideLabel ? 'sr-only' : 'text-xs font-bold text-ink'}>{label}</label>
    <div className="relative min-w-0">
      <Input id={id} type="text" inputMode={integer ? 'numeric' : 'decimal'} enterKeyHint="done" autoComplete="off" spellCheck={false}
        className={suffix ? suffix.length > 4 ? 'pr-24' : 'px-3 pr-10' : undefined}
        value={text} aria-invalid={showError}
        aria-describedby={[suffix ? `${id}-unit` : '', showError ? `${id}-error` : ''].filter(Boolean).join(' ') || undefined}
        onFocus={() => setFocused(true)}
        onChange={(event) => {
          const next = event.target.value
          setEdit({ text: next, revision: resetKey })
          const result = parseNumber(next, min, integer, positive)
          if (result.error === null) onValueChange(result.value)
        }}
        onBlur={() => { setFocused(false); if (!error) setEdit(null) }}
        onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); event.currentTarget.blur() } }}
      />
      {suffix && <span id={`${id}-unit`} className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs ${showError ? 'text-white' : 'text-action-label'}`}>{suffix}</span>}
    </div>
    {showError && <p id={`${id}-error`} className="text-xs text-danger">{error}</p>}
  </div>
}
