import { createFileRoute, Link } from '@tanstack/react-router'

import { Icon } from '../components/icons'
import { categorySearch } from '../components/home'
import { CATEGORIES, type Category } from '../lib/categories'
import { recipesInCategory, type FacetKey } from '../lib/model'
import { INDEX } from '../lib/recipes'
import { buildSeoMeta } from '../lib/seo'

/**
 * browse.tsx + browse-container.tsx.
 *
 * The original grouped every facet into four titled sections of plain text
 * cards — the photo cards belong to the home page's compact subset, not here.
 *
 * It listed every facet value the platform knew about, including ones no recipe
 * carried. This archive is twelve recipes and closed, so a value with nothing
 * behind it is a permanent dead end; sections list only what has recipes.
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

/** browse-card.tsx — the plain, imageless branch. */
function TextBrowseCard({ category }: { category: Category }) {
  return (
    <Link
      to="/search"
      search={categorySearch(category)}
      className="group flex min-h-[44px] items-center justify-between gap-3 rounded-lg border border-charcoal/10 bg-white px-5 py-4 transition-colors hover:border-charcoal/20 hover:bg-peach/50"
    >
      <span className="text-sm font-medium text-charcoal">{category.label}</span>
      <Icon
        name="arrow-right"
        className="size-4 shrink-0 text-charcoal/30 transition-colors group-hover:text-pink"
      />
    </Link>
  )
}

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
        {SECTIONS.map((section) => {
          const cards = CATEGORIES.filter(
            (c) => c.facet === section.facet && recipesInCategory(INDEX, c).length > 0,
          )
          if (cards.length === 0) return null

          return (
            <section key={section.title} aria-label={section.title}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[3px] text-sage-dark">
                {section.eyebrow}
              </p>
              <h2 className="mb-6 font-display text-2xl font-extrabold text-charcoal">
                {section.title}
              </h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {cards.map((category) => (
                  <TextBrowseCard key={category.slug} category={category} />
                ))}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
