/**
 * Landing page, from features/recipes/components/hero.tsx and
 * features/recipes/containers/home-container.tsx.
 *
 * These recipes carry no ratings, so the original's `popular.length === 0`
 * branch is the one that applies: Hero, then a single "Latest Recipes"
 * section, then the browse grid.
 */

import { Link } from '@tanstack/react-router'

import { Icon } from './icons'
import { BrowseCard, RecipeCard, SectionHeading } from './layout'
import { CATEGORIES, type Category } from '../lib/categories'
import type { SearchParams } from '../lib/model'
import { latest } from '../lib/recipes'

const MAX_SECTION_SIZE = 6
const HERO_IMAGE = '/images/hero-donuts.jpg'

const MOBILE_SCRIM =
  'linear-gradient(180deg, rgba(45,30,40,0.55) 0%, rgba(45,30,40,0.45) 50%, rgba(45,30,40,0.6) 100%)'

/** The scattered confetti dots behind the hero copy. */
const DOTS = [
  'top-[18%] left-[12%] size-3 bg-gold/30',
  'top-[30%] left-[25%] size-2 bg-pink/15',
  'top-[72%] left-[8%] size-4 bg-pink/10',
  'top-[80%] left-[35%] size-2.5 bg-gold/20',
  'top-[15%] right-[35%] size-3.5 bg-pink/[0.08]',
  'top-[85%] right-[15%] size-1.5 bg-gold/35',
]

/** hero.tsx */
function HomeHero() {
  return (
    <section className="relative -mt-16 grid min-h-[85vh] min-h-[85svh] grid-cols-[1.2fr_1fr] items-center overflow-hidden bg-blush pt-16 max-md:grid-cols-1">
      <div
        className="absolute inset-0 hidden scale-105 bg-cover bg-center will-change-transform max-md:block"
        style={{ backgroundImage: `url('${HERO_IMAGE}')` }}
      />
      <div className="absolute inset-0 hidden max-md:block" style={{ background: MOBILE_SCRIM }} />

      <div
        className="pointer-events-none absolute top-1/2 right-[-5%] -translate-y-1/2 select-none font-hero text-[clamp(180px,22vw,320px)] leading-[0.85] text-pink/[0.03] max-md:hidden"
        aria-hidden="true"
      >
        YEET
      </div>

      {DOTS.map((dot) => (
        <div key={dot} className={`pointer-events-none absolute rounded-full max-md:hidden ${dot}`} />
      ))}

      <div className="relative z-10 max-w-[600px] px-6 py-20 max-md:mx-auto max-md:text-center md:pl-[clamp(2rem,5vw,6rem)]">
        <div className="flex items-center gap-3 font-hero text-[clamp(48px,6vw,80px)] leading-none max-md:justify-center max-md:gap-2 max-md:text-[clamp(40px,10vw,56px)]">
          <span className="text-charcoal max-md:text-white">Eat</span>
          <span className="size-3 shrink-0 rounded-full bg-charcoal/20 max-md:bg-white/30" />
          <span className="bg-[linear-gradient(135deg,#F472B6,#FF2D78)] bg-clip-text text-transparent max-md:text-white max-md:[background:none] max-md:[-webkit-text-fill-color:white]">
            Yeet
          </span>
        </div>

        <p className="mt-3 text-[19px] text-charcoal/50 max-md:text-white/70">
          Eat the best. Yeet the rest.
        </p>

        <Link
          to="/search"
          className="mt-10 inline-flex items-center gap-2.5 rounded-full bg-pink px-8 py-4 text-sm font-semibold uppercase tracking-[2px] text-white shadow-[0_4px_20px_rgba(233,30,99,0.2)] transition-all hover:-translate-y-0.5 hover:bg-pink-dark hover:shadow-[0_8px_30px_rgba(233,30,99,0.3)]"
        >
          Let&rsquo;s Eat
          <Icon name="arrow-right" className="size-4" />
        </Link>
      </div>

      <div className="relative z-10 flex items-center justify-center max-md:hidden">
        <div className="pointer-events-none absolute top-1/2 left-1/2 size-[440px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(233,30,99,0.08)_0%,transparent_70%)]" />
        <div className="w-[min(400px,80%)] rotate-3 overflow-hidden rounded-3xl shadow-[0_24px_80px_rgba(233,30,99,0.12)] transition-transform duration-300 ease-out hover:rotate-0 hover:scale-[1.03]">
          <img
            src={HERO_IMAGE}
            alt="Pink glazed donuts with colorful sprinkles"
            className="aspect-[3/4] w-full object-cover"
            loading="eager"
            fetchPriority="high"
          />
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
        className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[2px] text-pink transition-colors hover:text-pink-dark"
      >
        {label}
        <Icon name="arrow-right" className="size-4" />
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

export function HomePage() {
  const featured = CATEGORIES.filter((c) => c.featured)

  return (
    <>
      <HomeHero />

      <section className="mx-auto max-w-[var(--max-width)] px-8 py-20">
        <SectionHeading eyebrow="Top Eats" title="Latest Recipes" />
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {latest(MAX_SECTION_SIZE).map((recipe) => (
            <RecipeCard key={recipe.slug} recipe={recipe} />
          ))}
        </div>
        <ViewAll to="/search" label="View all recipes" className="mt-10" />
      </section>

      <section
        className="mx-auto max-w-[var(--max-width)] px-8 py-16"
        aria-label="Browse by Category"
      >
        <SectionHeading eyebrow="Top Eats" title="Browse by Category" />
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
