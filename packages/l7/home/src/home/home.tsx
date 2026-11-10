'use client'
import { haptic } from '@eat-yeet/l5-ui-primitives/primitives/haptics'
import { ResponsiveImage } from '@eat-yeet/l5-ui-primitives/primitives/responsive-image'
import { Button } from '@eat-yeet/l5-ui-primitives/primitives/button'
import { Eyebrow } from '@eat-yeet/l5-ui-primitives/primitives/typography'
/**
 * Landing page feature composition.
 *
 * The current content model has no ratings, so home renders a single latest
 * recipe section followed by the browse grid.
 */

import { Link } from '@eat-yeet/l5-ui-primitives/primitives/navigation'

import { ArrowRight } from 'lucide-react'
import { BrowseCard, RecipeCard, SectionHeading } from '@eat-yeet/l6-ui-catalog/cards'
import type { FacetKey, SearchParams } from '@eat-yeet/l2-recipe-domain/search'
import type { RecipeSummary } from '@eat-yeet/l1-recipe-model/recipes'

const WHATS_NEW_SIZE = 6

/** The newest recipes, by the authored published date. */
export const newestRecipes = (recipes: RecipeSummary[], count = WHATS_NEW_SIZE) =>
  [...recipes].sort((a, b) => b.created.localeCompare(a.created) || a.title.localeCompare(b.title)).slice(0, count)


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
    headline?: string
    /** The headline word set in the pink sticker; defaults to the last word. */
    headlineSticker?: string
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

/** Wraps the headline's sticker word (default: its last word) in the pink logo sticker. */
function HeroHeadline({ text, sticker }: { text: string; sticker?: string }) {
  const word = sticker ?? text.trim().split(/\s+/).pop() ?? ''
  const at = word ? text.lastIndexOf(word) : -1
  if (at < 0) return <>{text}</>
  return <>{text.slice(0, at)}<span data-hero-sticker="" className="-ml-[.04em] -mt-[.04em] inline-block -rotate-3 rounded-[40%_35%_40%_25%] bg-brand px-[.2em] pt-[.07em] pb-[.1em] text-ink">{word}</span>{text.slice(at + word.length)}</>
}

/**
 * The plum hero. Desktop: split photo/copy on one continuous plum gradient, the
 * orange blob anchored to the section's right edge. Phone (M3): a full-bleed
 * photo with the headline card overlapping it. One <img> serves both.
 */
/** The "New! Remix" starburst on the hero card; it opens Remix. */
function RemixSticker() {
  return <Link to="/remix" data-remix-sticker="" onClick={() => haptic()} aria-label="New: Remix recipes"
    className="group absolute right-1 top-[206px] z-10 grid size-[116px] rotate-12 place-items-center text-sticker transition-[transform,color] duration-150 ease-out hover:rotate-[16deg] hover:scale-105 active:scale-90 active:text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white motion-reduce:transition-none md:right-6 md:top-8 md:size-[124px]">
    <svg aria-hidden="true" viewBox="0 0 120 120" className="absolute inset-0 size-full drop-shadow-md"><polygon fill="currentColor" points="60.0,0.0 69.9,10.0 83.0,4.6 88.3,17.6 102.4,17.6 102.4,31.7 115.4,37.0 110.0,50.1 120.0,60.0 110.0,69.9 115.4,83.0 102.4,88.3 102.4,102.4 88.3,102.4 83.0,115.4 69.9,110.0 60.0,120.0 50.1,110.0 37.0,115.4 31.7,102.4 17.6,102.4 17.6,88.3 4.6,83.0 10.0,69.9 0.0,60.0 10.0,50.1 4.6,37.0 17.6,31.7 17.6,17.6 31.7,17.6 37.0,4.6 50.1,10.0" /></svg>
    <span aria-hidden="true" className="relative -mt-0.5 grid justify-items-center gap-0.5 text-center leading-none text-ink">
      <span className="font-action text-xs font-bold uppercase tracking-label">New</span>
      <span className="font-hero text-lg md:text-xl">Remix</span>
      <span className="font-action text-xs font-bold">recipes</span>
    </span>
  </Link>
}

export function HomeHero({ copy }: { copy: HomeCopy }) {
  const { hero, wordmark } = copy

  return (
    <section data-home-hero="" className="relative isolate overflow-hidden bg-white text-white md:bg-gradient-hero">
      <span aria-hidden="true" className="absolute -bottom-28 -right-28 -z-10 hidden h-72 w-80 -rotate-12 rounded-full bg-brand-alt md:block" />
      <div className="relative mx-auto grid max-w-[var(--layout-hero-max)] md:grid-cols-2">
        <figure className="m-0 min-w-0 md:flex md:flex-col md:py-10 md:pl-10">
          <ResponsiveImage src={hero.image} alt={hero.imageAlt} sizes="(max-width: 767px) 100vw, (max-width: 1500px) calc(50vw - 40px), 710px" className="h-[330px] w-full object-cover object-[50%_30%] md:aspect-[4/3] md:h-auto md:flex-1 md:object-[50%_40%] md:[clip-path:polygon(0_0,100%_0,100%_90%,0_100%)]" loading="eager" fetchPriority="high" />
        </figure>
        <RemixSticker />
        <div className="relative isolate mx-3.5 -mt-16 overflow-hidden rounded-[28px_28px_28px_8px] bg-gradient-hero px-[22px] pt-7 pb-[26px] shadow-glow md:m-0 md:overflow-visible md:rounded-none md:bg-none md:p-12 md:shadow-none lg:p-14">
          <span aria-hidden="true" className="absolute -bottom-[170px] -right-[170px] -z-10 h-72 w-80 -rotate-12 rounded-full bg-brand-alt md:hidden" />
          {hero.kicker && <Eyebrow tone="brand" className="mb-3.5 max-w-[80%] md:mb-7">{hero.kicker}</Eyebrow>}
          <h1 className="m-0 whitespace-pre-line font-hero text-hero leading-none tracking-tight text-white"><HeroHeadline text={hero.headline ?? `${wordmark.first} / ${wordmark.second}`} sticker={hero.headlineSticker} /></h1>
          {hero.tagline && <p className="mt-8 whitespace-pre-line text-lg leading-relaxed">{hero.tagline}</p>}
          {hero.motto && <p className="mt-4 text-base md:text-lg">{hero.motto}</p>}
          <Button asChild size="lg" variant="on-dark" className="mt-5 md:mt-7"><Link to="/search">{hero.cta}<ArrowRight aria-hidden="true" className="size-6 -rotate-45" /></Link></Button>
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
        className="inline-flex items-center gap-2 min-h-11 text-sm font-bold text-ink underline-offset-4 hover:underline"
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
  /** Every published recipe; the section shows the newest few. */
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
          {newestRecipes(latestRecipes).map((recipe) => (
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
      </section>
    </>
  )
}
