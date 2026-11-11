import type { Section, StepUse } from '@eat-yeet/l4-content-model/blocks'

/** Leading amount of an ingredient line (quantity, unit and an optional parenthetical). Server-safe: used by the web and the iOS app API. */
export const INGREDIENT_AMOUNT = /^([\d¼½¾⅛⅓⅔⅜⅝⅞][\d¼½¾⅛⅓⅔⅜⅝⅞.,/ -]*?(?:\s?(?:g|kg|ml|l|oz|lb|lbs|tsp|tbsp|cups?|cans?|cloves?)\b)?(?:\s*\([^)<]*\))?)(?=\s)/

export type Need = { key: string; amount: string; name: string }

/**
 * What a step uses, from its authored `uses`: each ingredient's amount (this
 * step's share when divided) and its name without the amount.
 */
export function stepNeeds(uses: StepUse[], ingredients: Section[]): Need[] {
  return uses.flatMap((use) => {
    for (const section of ingredients) {
      const index = section.itemIds.indexOf(use.id)
      if (index < 0) continue
      const html = section.items[index]
      const amount = html.match(INGREDIENT_AMOUNT)?.[1] ?? ''
      const name = html.slice(amount.length)
        .replace(/^\s*(?:\+\s*[\d.]+\s*[a-z]+\s*)+/i, '')
        .replace(/\s*\(divided\)|,\s*divided(?:\s*\([^)]*\))?/i, '')
        .trim()
      return [{ key: use.id, amount: use.amount ?? amount, name: use.label ?? name }]
    }
    return []
  })
}
