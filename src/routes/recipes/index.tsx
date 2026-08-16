import { createFileRoute } from '@tanstack/react-router'

import { RecipeGrid, SectionHeading } from '../../components/layout'
import { INDEX } from '../../lib/recipes'
import { buildSeoMeta } from '../../lib/seo'

/**
 * The full listing. `/search` is the same set with filters attached, so this
 * page carries the canonical link and the crawlable grid while /search stays
 * the interactive view.
 */
export const Route = createFileRoute('/recipes/')({
  head: () =>
    buildSeoMeta({
      title: 'All Recipes | Eat / Yeet',
      description:
        'Every recipe in the collection — breads, pizza, pasta, donuts, cookies, and more. Tested, refined, and written without the filler.',
      canonicalPath: '/recipes',
    }),
  component: RecipesIndex,
})

function RecipesIndex() {
  return (
    <div className="mx-auto max-w-[var(--max-width)] px-8 pt-8 pb-20">
      <SectionHeading eyebrow="Top Eats" title="All Recipes" />
      <RecipeGrid recipes={INDEX} />
    </div>
  )
}
