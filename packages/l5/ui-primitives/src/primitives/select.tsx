import type { ComponentProps } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@eat-yeet/l0-foundation/utils'
import { fieldClassName, fieldSurfaceClasses, type FieldSurface } from './input'

const CARET_COLORS = { default: 'text-action-label', 'on-ink': 'text-ink', invalid: 'text-white' } as const

/** Native select retains platform keyboard and assistive-technology behavior. */
export function Select({ className, surface = 'default', ...props }: ComponentProps<'select'> & { surface?: FieldSurface }) {
  const invalid = props['aria-invalid'] === true || props['aria-invalid'] === 'true'
  const caretColor = CARET_COLORS[invalid ? 'invalid' : surface]
  return <span className="relative block min-w-0 flex-1">
    <select data-slot="select" data-surface={surface} className={cn(fieldClassName, fieldSurfaceClasses[surface], 'block appearance-none pr-11', className)} {...props} />
    <ChevronDown aria-hidden="true" className={cn('pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2', caretColor)} />
  </span>
}
