import { formatYield, humanizeMinutes } from '@eat-yeet/l2-recipe-domain/format'
import type { RecipeContent } from '@eat-yeet/l4-content-model/recipes'

// Server-safe: used by the recipe page and the iOS app API.
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
