import { Button } from '@eat-yeet/l5-ui-primitives/primitives/button'
/**
 * Landing page feature composition.
 *
 * The current content model has no ratings, so home renders a single latest
 * recipe section followed by the browse grid.
 */

import { Link } from '@tanstack/react-router'

import { ArrowRight } from 'lucide-react'
import { BrowseCard, RecipeCard, SectionHeading } from '@eat-yeet/l6-ui-catalog/cards'
import type { FacetKey, SearchParams } from '@eat-yeet/l2-recipe-domain/search'
import type { RecipeSummary } from '@eat-yeet/l1-recipe-model/recipes'

const MAX_SECTION_SIZE = 6

/** Copy required by the home hero and catalog sections. */
type WordmarkCopy = {
  first: string
  second: string
  background: string
}

type HomeCopy = {
  hero: {
    image: string
    imageAlt: string
    imageCaption?: string
    headline?: string
    kicker?: string
    tagline: string
    motto?: string
    cta: string
  }
  wordmark: WordmarkCopy
  home: {
    eyebrow: string
    latestTitle: string
    browseEyebrow: string
    browseTitle: string
  }
}

export interface Category {
  slug: string
  label: string
  facet: FacetKey
  value: string
  image?: string
  featured?: boolean
}

export function HomeHero({ copy }: { copy: HomeCopy }) {
  const { hero, wordmark } = copy

  return (
    <section className="overflow-hidden bg-brand text-ink">
      <div className="mx-auto grid max-w-[var(--layout-hero-max)] md:grid-cols-2">
        <figure className="order-2 m-0 flex min-w-0 flex-col bg-ink p-6 md:order-1 md:py-10 md:pl-10 md:pr-0">
          <img src={hero.image} alt={hero.imageAlt} className="aspect-[4/3] w-full flex-1 object-cover [clip-path:polygon(0_0,100%_0,100%_90%,0_100%)]" loading="eager" fetchPriority="high" />
          {hero.imageCaption && <figcaption className="pt-5 text-sm font-bold text-white">{hero.imageCaption}</figcaption>}
        </figure>
        <div className="relative isolate order-1 overflow-hidden px-6 py-10 md:order-2 md:p-12 lg:p-14">
          <div aria-hidden="true" className="brand-dots absolute right-5 top-6 -z-10 size-12 rotate-6" />
          {hero.kicker && <p className="mb-7 max-w-[80%] text-xs font-bold uppercase tracking-widest">{hero.kicker}</p>}
          <h1 className="m-0 whitespace-pre-line font-hero text-[clamp(48px,7vw,104px)] leading-none tracking-tight">{hero.headline ?? `${wordmark.first} / ${wordmark.second}`}</h1>
          <p className="mt-8 whitespace-pre-line text-lg leading-relaxed">{hero.tagline}</p>
          {hero.motto && <p className="mt-4 text-lg">{hero.motto}</p>}
          <Button asChild size="lg" className="mt-7"><Link to="/search">{hero.cta}<ArrowRight aria-hidden="true" className="size-6 -rotate-45" /></Link></Button>
          <span aria-hidden="true" className="absolute -bottom-28 -right-28 -z-10 h-72 w-80 -rotate-12 rounded-full bg-brand-alt" />
        </div>
      </div>
    </section>
  )
}

/**
 * The "View all …" link that closes each home section.
 *
 * home-container.tsx uses different targets and different top margins for the
 * two: recipes go to /search under `mt-10`, categories to /browse under `mt-8`.
 */
export function ViewAll({ to, label, className }: { to: string; label: string; className: string }) {
  return (
    <div className={`${className} text-center`}>
      <Link
        to={to}
        className="inline-flex items-center gap-2 min-h-11 text-sm font-bold text-brand-strong transition-colors hover:text-ink"
      >
        {label}
        <ArrowRight className="size-4" />
      </Link>
    </div>
  )
}

/**
 * A curated category becomes the search it stands for. The value is a plain
 * string, not an array, so the URL reads `?courses=mains` rather than the
 * router's default JSON array encoding.
 */
export const categorySearch = (category: Category): SearchParams => ({ [category.facet]: category.value })

export function HomePage({
  copy,
  categories,
  latestRecipes,
}: {
  copy: HomeCopy
  categories: Category[]
  latestRecipes: RecipeSummary[]
}) {
  const featured = categories.filter((c) => c.featured)
  const { home } = copy

  return (
    <>
      <HomeHero copy={copy} />

      <section className="mx-auto max-w-[var(--max-width)] px-8 pb-8 pt-20">
        <SectionHeading eyebrow={home.eyebrow} title={home.latestTitle} />
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {latestRecipes.slice(0, MAX_SECTION_SIZE).map((recipe) => (
            <RecipeCard key={recipe.slug} recipe={recipe} />
          ))}
        </div>
        <ViewAll to="/search" label="View all recipes" className="mt-10" />
      </section>

      <section
        className="mx-auto max-w-[var(--max-width)] px-8 pb-16 pt-8"
        aria-label="Browse by Category"
      >
        <SectionHeading eyebrow={home.browseEyebrow} title={home.browseTitle} />
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
        <ViewAll to="/browse" label="View all categories" className="mt-8" />
      </section>
    </>
  )
}
