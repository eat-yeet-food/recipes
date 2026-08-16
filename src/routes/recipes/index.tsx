import { createFileRoute } from '@tanstack/react-router'

import { RecipeGrid } from '../../components/layout'
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
    <div className="mx-auto max-w-[var(--max-width)] px-6 pt-8 pb-20 md:px-8">
      {/* An h1, not SectionHeading's h2: this is a page heading, and the page
          had none. Same treatment the search page gives its own title. */}
      <div className="mb-8">
        <h1 className="font-display text-[clamp(28px,4vw,40px)] font-extrabold text-charcoal">
          All Recipes
        </h1>
        <p className="mt-3 max-w-lg text-sm leading-relaxed text-charcoal/65">
          Every recipe in the collection, newest first.
        </p>
      </div>
      <RecipeGrid recipes={INDEX} />
    </div>
  )
}
