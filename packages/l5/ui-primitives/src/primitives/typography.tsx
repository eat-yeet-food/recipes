import type { ComponentProps, ElementType, ReactNode } from 'react'
import { cn } from '@eat-yeet/l0-foundation/utils'

const EYEBROW_TONES = { ink: 'text-ink', muted: 'text-muted-foreground', brand: 'text-brand', 'on-dark': 'text-on-dark-label' } as const

/**
 * The small uppercase label above a title or group. Two sizes, one tracking.
 * Tone follows the surface: `ink` on white, `brand` on plum (kickers, Your dough), `muted` for quiet meta.
 */
export function Eyebrow<T extends ElementType = 'p'>({ as, size = 'default', tone = 'ink', className, ...props }: { as?: T; size?: 'default' | 'small'; tone?: keyof typeof EYEBROW_TONES } & Omit<ComponentProps<T>, 'as'>) {
  const Tag = (as ?? 'p') as ElementType
  return <Tag data-slot="eyebrow" className={cn('m-0 font-action font-bold uppercase leading-snug tracking-eyebrow', size === 'default' ? 'text-xs' : 'text-micro', EYEBROW_TONES[tone], className)} {...props} />
}

export const pageTitleClasses = {
  standard: 'm-0 font-display text-page leading-[1.08] font-bold text-ink',
  display: 'm-0 font-hero text-display leading-[0.92] font-normal text-ink',
} as const

/** Every page's h1. `standard` is Geller bold; `display` is Bowlby for brand bands (Notebook). */
export function PageTitle({ size = 'standard', className, ...props }: { size?: keyof typeof pageTitleClasses } & ComponentProps<'h1'>) {
  return <h1 data-slot="page-title" className={cn(pageTitleClasses[size], className)} {...props} />
}

/**
 * A section heading. `rule="trailing"` draws the thin divider that continues to
 * the right of the text (ratings, Notebook library, Learn); `rule="top"` sits under a top border (recipe body).
 */
export function SectionTitle<T extends ElementType = 'h2'>({ as, size = 'section', rule = 'none', className, children, ...props }: { as?: T; size?: 'section' | 'title'; rule?: 'none' | 'trailing' | 'top'; children: ReactNode } & Omit<ComponentProps<T>, 'as' | 'children'>) {
  const Tag = (as ?? 'h2') as ElementType
  return <Tag data-slot="section-title" className={cn('m-0 font-display font-bold leading-[1.15] text-ink', size === 'section' ? 'text-section max-[640px]:text-title' : 'text-title', rule === 'trailing' && 'flex items-center gap-4 after:h-px after:flex-1 after:bg-border', rule === 'top' && 'border-t border-border pt-8', className)} {...props}>{children}</Tag>
}
