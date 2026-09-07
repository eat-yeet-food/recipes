import { cn } from '@eat-yeet/l0-foundation/utils'

type Choice<T extends string> = { value: T; label: string; disabled?: boolean }
export type ChoiceGroupProps<T extends string> = {
  label: string
  value: T
  options: readonly Choice<T>[]
  onChange: (value: T) => void
  className?: string
}

/** Exclusive pressed buttons; all options remain keyboard reachable. */
export function ChoiceGroup<T extends string>({ label, value, options, onChange, className }: ChoiceGroupProps<T>) {
  return (
    <div role="group" aria-label={label} data-slot="choice-group" className={cn('grid auto-cols-fr grid-flow-col gap-[var(--spacing-choice-inset)] rounded-choice bg-ink p-[var(--spacing-choice-inset)] forced-colors:border forced-colors:border-[CanvasText]', className)}>
      {options.map(option => <button type="button" key={option.value} aria-pressed={value === option.value} disabled={option.disabled} onClick={() => onChange(option.value)} className={cn('control-focus min-h-11 min-w-0 rounded-choice-item px-3 py-3 font-action text-sm font-bold leading-snug disabled:opacity-50 forced-colors:!text-[ButtonText]', value === option.value ? 'bg-brand text-ink hover:bg-brand hover:text-ink forced-colors:!bg-[Highlight] forced-colors:!text-[HighlightText] forced-color-adjust-none' : 'bg-transparent text-white hover:bg-action-hover')}>
        {option.label}
      </button>)}
    </div>
  )
}
