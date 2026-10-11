import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@eat-yeet/l0-foundation/utils'

type Choice<T extends string> = { value: T; label: string; disabled?: boolean }
export type TextSelectProps<T extends string> = {
  label: string
  value: T
  options: readonly Choice<T>[]
  onChange: (value: T) => void
  disabled?: boolean
  className?: string
}

/**
 * Native select presented as a borderless text action. The chosen label is
 * underlined beside a chevron and inherits its parent's type; the select
 * covers it, so platform menus and keyboard behavior are unchanged. The
 * select keeps body type so its menu stays readable inside small labels.
 * Browsers treat a clicked select as keyboard-focused, so the outline is
 * limited to focus that did not start with a pointer.
 */
export function TextSelect<T extends string>({ label, value, options, onChange, disabled, className }: TextSelectProps<T>) {
  const chosen = options.find(option => option.value === value)
  const [pointer, setPointer] = useState(false)
  return (
    <span data-slot="text-select" className={cn('group relative inline-flex min-h-6 max-w-full min-w-0 items-center gap-1.5 has-[select:disabled]:text-muted-foreground', !pointer && 'has-[select:focus-visible]:outline-2 has-[select:focus-visible]:outline-offset-4 has-[select:focus-visible]:outline-current forced-colors:has-[select:focus-visible]:outline-[Highlight]', className)}>
      <span className="min-w-0 truncate underline decoration-1 underline-offset-4 group-hover:decoration-2 group-has-[select:disabled]:no-underline">{chosen?.label}</span>
      <ChevronDown aria-hidden="true" className="size-3.5 shrink-0" />
      <select aria-label={label} value={value} disabled={disabled} onPointerDown={() => setPointer(true)} onKeyDown={() => setPointer(false)} onBlur={() => setPointer(false)} onChange={event => onChange(event.target.value as T)} className="absolute inset-0 size-full cursor-pointer appearance-none font-body text-base font-normal tracking-normal normal-case opacity-0 disabled:cursor-not-allowed">
        {options.map(option => <option key={option.value} value={option.value} disabled={option.disabled}>{option.label}</option>)}
      </select>
    </span>
  )
}
