'use client'
import { cn } from '@eat-yeet/l0-foundation/utils'
import { formatYield, humanizeMinutes } from '@eat-yeet/l2-recipe-domain/format'
import type { RecipeContent } from '@eat-yeet/l4-content-model/recipes'

export type RecipeFactsSource = Pick<RecipeContent, 'prepMinutes' | 'cookMinutes' | 'totalMinutes' | 'prepLabel' | 'cookLabel' | 'totalLabel' | 'yieldAmount' | 'yieldUnit'>

/** Active, cook, total and yield, skipping empty values. Authored display text wins over formatted minutes. */
export function recipeFactItems(page: RecipeFactsSource): [string, string][] {
  return ([
    ['Active Time', page.prepLabel || humanizeMinutes(page.prepMinutes)],
    ['Cook Time', page.cookLabel || humanizeMinutes(page.cookMinutes)],
    ['Total Time', page.totalLabel || humanizeMinutes(page.totalMinutes)],
    ['Yield', formatYield(page.yieldAmount, page.yieldUnit)],
  ] as [string, string][]).filter(([, value]) => value)
}

/**
 * Passive recipe facts. On white: muted labels over semibold values between thin rules.
 * On a plum band (`tone="on-dark"`): pink eyebrow labels over white values, no rules.
 * Print is always plain ink.
 */
export function RecipeFacts({ items, tone = 'light', className }: { items: readonly (readonly [string, string])[]; tone?: 'light' | 'on-dark'; className?: string }) {
  const dark = tone === 'on-dark'
  return <dl className={cn('m-0 grid grid-cols-2 gap-x-6 max-[360px]:grid-cols-1', dark ? 'gap-y-3 text-white print:text-ink md:flex md:flex-wrap md:gap-x-14' : 'mb-7 border-b border-border text-ink xl:grid-cols-4', className)}>
    {items.map(([label, value]) => <div key={label} className={cn('min-w-0', !dark && 'border-t border-border py-3')}>
      <dt className={cn(dark ? 'font-action text-micro font-bold uppercase tracking-eyebrow text-brand print:text-ink' : 'mb-1 text-xs font-medium text-muted-foreground')}>{label}</dt>
      <dd className="m-0 text-lg font-semibold leading-snug tabular-nums">{value}</dd>
    </div>)}
  </dl>
}
