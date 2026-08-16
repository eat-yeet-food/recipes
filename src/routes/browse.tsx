import { createFileRoute, Link } from '@tanstack/react-router'

import { Icon } from '../components/icons'
import { BrowseCard, SectionHeading } from '../components/layout'
import { categorySearch } from '../components/home'
import { CATEGORIES, type Category } from '../lib/categories'
import { FACETS } from '../lib/model'
import { INDEX } from '../lib/recipes'
import { recipesInCategory } from '../lib/model'
import { buildSeoMeta } from '../lib/seo'

/**
 * browse.tsx + browse-container.tsx. The original grouped every facet into
 * sections; the featured eight keep their photo cards and the rest render as
 * the plain-text variant, which is the same split the original made.
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
  const featured = CATEGORIES.filter((c) => c.featured)

  return (
    <div className="mx-auto max-w-[var(--max-width)] px-8 pt-8 pb-20">
      <SectionHeading eyebrow="Top Eats" title="Browse Recipes" />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {featured.map((category) => (
          <BrowseCard
            key={category.slug}
            label={category.label}
            imageUrl={category.image!}
            search={categorySearch(category)}
          />
        ))}
      </div>

      {FACETS.filter((facet) => facet.key !== 'category').map((facet) => {
        const cards = CATEGORIES.filter(
          (c) => c.facet === facet.key && recipesInCategory(INDEX, c).length > 0,
        )
        if (cards.length === 0) return null

        return (
          <section key={facet.key} className="mt-12">
            <h2 className="mb-5 font-body text-xs font-semibold uppercase tracking-[2px] text-charcoal/70">
              By {facet.label}
            </h2>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {cards.map((category) => (
                <TextBrowseCard key={category.slug} category={category} />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
