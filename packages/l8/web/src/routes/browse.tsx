import { createFileRoute } from '@tanstack/react-router'
import { useMemo } from 'react'

import { BrowseCard } from '@eat-yeet/l6-ui-catalog/cards'
import { categorySearch } from '@eat-yeet/l7-home/home/home'
import type { Category } from '@eat-yeet/l3-api-contract/categories'
import { recipesInCategory, type FacetKey } from '@eat-yeet/l2-recipe-domain/search'
import { imageUrl } from '@eat-yeet/l1-recipe-model/recipes'
import { ssrPrefetch } from '@eat-yeet/l3-api-query/prefetch'
import type { RecipeIndex } from '@eat-yeet/l3-api-contract/recipes'
import { APP_CONFIG } from '@/lib/app-config'
import { buildSeoMeta } from '@/lib/seo'
import { recipeApi, recipeQueries } from '@/lib/api'

const APP_COPY = APP_CONFIG.copy
const CATEGORIES = APP_CONFIG.categories

/**
 * Browse route.
 *
 * The sections render the same photo cards used on the home grid so "View all
 * categories" lands on a consistent catalog surface. The collection is small
 * and closed, so sections list only categories that have recipes.
 */
export const Route = createFileRoute('/browse')({
  loader: async ({ context }) => {
    await ssrPrefetch(context.queryClient.prefetchQuery(recipeQueries.list()))
  },
  head: () =>
    buildSeoMeta({
      title: APP_COPY.pages.browseTitle,
      description: APP_COPY.pages.browseDescription,
      canonicalPath: '/browse',
      ogImage: CATEGORIES.find((category) => category.featured)?.image ?? APP_CONFIG.defaultOgImage,
    }, APP_CONFIG),
  component: BrowsePage,
})

/** Section titles and eyebrows for browse facets. */
const SECTIONS: Array<{ facet: FacetKey; title: string; eyebrow: string }> = [
  { facet: 'courses', title: 'By Course', eyebrow: 'What are you making?' },
  { facet: 'cuisines', title: 'By Cuisine', eyebrow: 'Explore flavors' },
  { facet: 'methods', title: 'By Method', eyebrow: 'How do you cook?' },
  { facet: 'restrictions', title: 'By Diet', eyebrow: 'Dietary needs' },
]

interface BrowseCardData {
  category: Category
  image: string
}

/**
 * Every card on the page, resolved once at import — the collection is static.
 *
 * Only the eight home-grid categories carry a curated image. The rest borrow a
 * photo from a recipe filed under them, preferring one no earlier card took.
 * Thirteen recipes across fourteen categories means some photos still repeat
 * (Sides and European have only sourdough between them), but a category with a
 * second recipe to offer uses it.
 */
function browseSections(index: RecipeIndex) {
  const used = new Set<string>()

  const resolve = (category: Category): BrowseCardData[] => {
    const recipes = recipesInCategory(index, category)
    if (recipes.length === 0) return []
    if (category.image) return [{ category, image: category.image }]
    const recipe = recipes.find((r) => !used.has(r.image)) ?? recipes[0]
    used.add(recipe.image)
    return [{ category, image: imageUrl(recipe) }]
  }

  return SECTIONS.map((section) => ({
    ...section,
    cards: CATEGORIES.filter((c) => c.facet === section.facet).flatMap(resolve),
  })).filter((section) => section.cards.length > 0)
}

function BrowsePage() {
  const { data } = recipeApi.useList()
  const sections = useMemo(() => browseSections(data?.recipes ?? []), [data?.recipes])

  return (
    <div className="mx-auto max-w-[var(--max-width)] px-8 py-16 max-sm:px-4">
      <h1 className="text-center font-display text-4xl font-extrabold text-ink max-sm:text-3xl">
        {APP_COPY.pages.browseHeading}
      </h1>
      <p className="mx-auto mt-3 max-w-lg text-center text-sm leading-relaxed text-ink/65">
        {APP_COPY.pages.browseIntro}
      </p>

      <div className="mt-12 space-y-14">
        {sections.map((section) => (
          <section key={section.title} aria-label={section.title}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[3px] text-support-strong">
              {section.eyebrow}
            </p>
            <h2 className="mb-6 font-display text-2xl font-extrabold text-ink">
              {section.title}
            </h2>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {section.cards.map(({ category, image }) => (
                <BrowseCard
                  key={category.slug}
                  label={category.label}
                  imageUrl={image}
                  search={categorySearch(category)}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
