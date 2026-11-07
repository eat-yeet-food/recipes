import type { ComponentProps, ElementType } from 'react'
import { cn } from '@eat-yeet/l0-foundation/utils'

const TONES = {
  // Informational aside ("Want to keep it?", "Saved in this browser"). The only use of tint besides History's current row.
  aside: 'bg-tint text-ink',
  danger: 'bg-danger-soft text-danger',
  // A transient plum pill (Notebook notices).
  notice: 'bg-ink text-on-dark-label shadow-raised',
} as const

/** A boxed message. Asides are tint, errors are danger, transient notices are a plum pill. */
export function Callout<T extends ElementType = 'div'>({ as, tone = 'aside', className, ...props }: { as?: T; tone?: keyof typeof TONES } & Omit<ComponentProps<T>, 'as'>) {
  const Tag = (as ?? 'div') as ElementType
  return <Tag data-slot="callout" data-tone={tone} role={tone === 'danger' ? 'alert' : undefined} className={cn('rounded-field p-4 text-sm leading-relaxed', TONES[tone], className)} {...props} />
}
