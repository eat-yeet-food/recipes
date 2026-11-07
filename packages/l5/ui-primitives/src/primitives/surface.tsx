import type { ComponentProps, ElementType } from 'react'
import { cn } from '@eat-yeet/l0-foundation/utils'

/**
 * A white card. `action` adds the brand stripe: an 8px pink→orange band for a
 * card that asks the reader to do something (rate, reply, confirm). At most one
 * stripe per view; never on catalog cards, read-only panels, dark surfaces or
 * page headers. The stripe is a background layer so the radius clips it.
 */
export function Surface<T extends ElementType = 'section'>({ as, action = false, className, ...props }: { as?: T; action?: boolean } & Omit<ComponentProps<T>, 'as'>) {
  const Tag = (as ?? 'section') as ElementType
  return <Tag data-slot="surface" data-action={action || undefined} className={cn('rounded-surface border border-border bg-white p-6 text-ink max-[640px]:p-5', action && 'brand-stripe pt-[34px] max-[640px]:pt-[30px]', className)} {...props} />
}

/** The short pink→orange line under a title. `section` 60×3 (section headings), `band` 64×4 (page-band titles). */
export function AccentRule({ size = 'section', align = 'start', className }: { size?: 'section' | 'band'; align?: 'start' | 'center'; className?: string }) {
  return <span aria-hidden="true" data-slot="accent-rule" className={cn('block rounded-full bg-gradient-accent', size === 'section' ? 'h-[3px] w-[60px]' : 'h-1 w-16', align === 'center' && 'mx-auto', className)} />
}
