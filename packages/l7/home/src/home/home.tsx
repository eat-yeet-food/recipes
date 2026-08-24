/**
 * Landing page feature composition.
 *
 * The current content model has no ratings, so home renders a single latest
 * recipe section followed by the browse grid.
 */

import { Link } from '@tanstack/react-router'

import { ArrowRight } from 'lucide-react'
import { BrowseCard, RecipeCard, SectionHeading } from '@eat-yeet/l6-ui-catalog/cards'
import { Wordmark } from '@eat-yeet/l6-ui-shell/shell/wordmark'
import type { FacetKey, SearchParams } from '@eat-yeet/l2-recipe-domain/search'
import type { RecipeSummary } from '@eat-yeet/l1-recipe-model/recipes'

const MAX_SECTION_SIZE = 6

/** The scattered confetti dots behind the hero copy. */
const DOTS = [
  'top-[18%] left-[12%] size-3 bg-highlight/30',
  'top-[30%] left-[25%] size-2 bg-brand/15',
  'top-[72%] left-[8%] size-4 bg-brand/10',
  'top-[80%] left-[35%] size-2.5 bg-highlight/20',
  'top-[15%] right-[35%] size-3.5 bg-brand/[0.08]',
  'top-[85%] right-[15%] size-1.5 bg-highlight/35',
]

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
    tagline: string
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

function HomeHero({ copy }: { copy: HomeCopy }) {
  const { hero, wordmark } = copy

  return (
    <section className="relative -mt-16 overflow-hidden bg-tint">
      <div
        className="absolute inset-0 hidden scale-105 bg-cover bg-center will-change-transform max-md:block"
        style={{ backgroundImage: `url('${hero.image}')` }}
      />
      <div className="absolute inset-0 hidden max-md:block" data-hero-scrim />

      <div className="relative mx-auto grid min-h-[85vh] min-h-[85svh] w-full max-w-[var(--layout-hero-max)] grid-cols-[1.2fr_1fr] items-center px-6 pt-16 max-md:grid-cols-1 md:px-10">
        <div
          className="pointer-events-none absolute top-1/2 right-0 -translate-y-1/2 select-none font-hero text-[clamp(180px,22vw,320px)] leading-[0.85] text-brand/[0.03] max-md:hidden"
          aria-hidden="true"
        >
          {wordmark.background}
        </div>

        {DOTS.map((dot) => (
          <div key={dot} className={`pointer-events-none absolute rounded-full max-md:hidden ${dot}`} />
        ))}

        <div className="relative z-10 max-w-[600px] py-20 max-md:mx-auto max-md:text-center">
          <Wordmark copy={copy.wordmark} size="hero" onPhoto className="max-md:justify-center" />

          <p className="mt-3 text-[19px] text-ink/70 max-md:text-white/90">
            {hero.tagline}
          </p>

          <Link
            to="/search"
            className="mt-10 inline-flex items-center gap-2.5 rounded-full bg-brand-strong px-8 py-4 text-sm font-semibold uppercase tracking-[2px] text-white transition-all hover:-translate-y-0.5 hover:bg-ink"
            data-cta
          >
            {hero.cta}
            <ArrowRight className="size-4" />
          </Link>
        </div>

        <div className="relative z-10 flex items-center justify-center max-md:hidden">
          <div className="pointer-events-none absolute top-1/2 left-1/2 size-[440px] -translate-x-1/2 -translate-y-1/2 rounded-full" data-hero-glow />
          <div
            className="w-[min(400px,80%)] rotate-3 overflow-hidden rounded-3xl transition-transform duration-300 ease-out hover:rotate-0 hover:scale-[1.03]"
            data-hero-media
          >
            <img
              src={hero.image}
              alt={hero.imageAlt}
              className="aspect-[3/4] w-full object-cover"
              loading="eager"
              fetchPriority="high"
            />
          </div>
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
        className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[2px] text-brand-strong transition-colors hover:text-ink"
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

      <section className="mx-auto max-w-[var(--max-width)] px-8 py-20">
        <SectionHeading eyebrow={home.eyebrow} title={home.latestTitle} />
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {latestRecipes.slice(0, MAX_SECTION_SIZE).map((recipe) => (
            <RecipeCard key={recipe.slug} recipe={recipe} />
          ))}
        </div>
        <ViewAll to="/search" label="View all recipes" className="mt-10" />
      </section>

      <section
        className="mx-auto max-w-[var(--max-width)] px-8 py-16"
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
