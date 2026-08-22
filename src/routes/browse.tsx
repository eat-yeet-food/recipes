import { createFileRoute } from '@tanstack/react-router'

import { BrowseCard } from '../components/layout'
import { categorySearch } from '../components/home'
import { CATEGORIES, type Category } from '../lib/categories'
import { recipesInCategory, type FacetKey } from '../lib/model'
import { imageUrl, INDEX } from '../lib/recipes'
import { buildSeoMeta } from '../lib/seo'

/**
 * browse.tsx + browse-container.tsx.
 *
 * Two deliberate departures from the original.
 *
 * The original grouped every facet into four titled sections of plain text
 * cards, and kept photo cards to the home page's compact subset. Here the
 * sections render that same photo card: "View all categories" leads here from
 * the home grid, and landing on a list of bordered text rows read as a
 * different site. The sections, their titles, and their order are unchanged —
 * only the card is.
 *
 * The original also listed every facet value the platform knew about, including
 * ones no recipe carried. This archive is small and closed, so a value
 * with nothing behind it is a permanent dead end; sections list only what has
 * recipes.
 */
export const Route = createFileRoute('/browse')({
  head: () =>
    buildSeoMeta({
      title: 'Browse Recipes | Eat / Yeet',
      description:
        'Browse recipes by course, cuisine, cooking method, and dietary preference. Find your next meal without the clutter.',
      canonicalPath: '/browse',
      ogImage: '/images/categories/mains.webp',
    }),
  component: BrowsePage,
})

/** browse.ts:63-127 — the section titles and eyebrows, in the original order. */
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
const BROWSE_SECTIONS = (() => {
  const used = new Set<string>()

  const resolve = (category: Category): BrowseCardData[] => {
    const recipes = recipesInCategory(INDEX, category)
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
})()

function BrowsePage() {
  return (
    <div className="mx-auto max-w-[var(--max-width)] px-8 py-16 max-sm:px-4">
      <h1 className="text-center font-display text-4xl font-extrabold text-charcoal max-sm:text-3xl">
        Browse Recipes
      </h1>
      <p className="mx-auto mt-3 max-w-lg text-center text-sm leading-relaxed text-charcoal/65">
        Explore our collection by course, cuisine, cooking method, or dietary preference.
      </p>

      <div className="mt-12 space-y-14">
        {BROWSE_SECTIONS.map((section) => (
          <section key={section.title} aria-label={section.title}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[3px] text-sage-dark">
              {section.eyebrow}
            </p>
            <h2 className="mb-6 font-display text-2xl font-extrabold text-charcoal">
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
