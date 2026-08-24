/**
 * Catalog cards and grids shared by home, browse, search, stories, and recipe
 * recommendations.
 */

import { Link } from '@tanstack/react-router'

import { Clock, UtensilsCrossed } from 'lucide-react'
import { humanizeMinutes, formatYield } from '@eat-yeet/l2-recipe-domain/format'
import { imageUrl, type RecipeSummary } from '@eat-yeet/l1-recipe-model/recipes'
import type { SearchParams } from '@eat-yeet/l2-recipe-domain/search'

/** Shared section heading used by catalog feature sections. */
export function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <>
      <p className="mb-2 text-center text-xs font-semibold uppercase tracking-[3px] text-support-strong">
        {eyebrow}
      </p>
      <h2 className="mb-0 text-center font-display text-[clamp(28px,4vw,40px)] font-extrabold text-ink">
        {title}
      </h2>
      <div className="mx-auto mb-10 mt-4 h-[3px] w-[60px] rounded-full bg-gradient-to-r from-brand to-highlight" />
    </>
  )
}

const CardFallback = () => (
  <div className="absolute inset-0 bg-warm-deep flex items-center justify-center">
    <UtensilsCrossed className="size-10 text-ink/15" strokeWidth="1.25" />
  </div>
)

/** Recipe summary card. */
export function RecipeCard({ recipe }: { recipe: RecipeSummary }) {
  const src = imageUrl(recipe)
  const totalTime = humanizeMinutes(recipe.totalMinutes)
  const yields = formatYield(recipe.yieldAmount, recipe.yieldUnit)

  return (
    <Link
      to="/recipes/$slug"
      params={{ slug: recipe.slug }}
      className="group flex flex-col overflow-hidden rounded-lg bg-white shadow-sm transition-card-hover will-change-[translate,box-shadow] hover:-translate-y-1 hover:shadow-card-hover"
    >
      <div className="relative aspect-[3/2] w-full overflow-hidden">
        {src ? (
          <div className="absolute inset-0 bg-warm-deep">
            <img
              src={src}
              alt={recipe.title}
              width="800"
              height="533"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="absolute inset-0 h-full w-full object-cover transition-image-zoom group-hover:scale-[1.06]"
            />
          </div>
        ) : (
          <CardFallback />
        )}
      </div>
      <div className="flex flex-1 flex-col p-6 max-sm:p-5">
        <h3 className="font-display text-[22px] font-extrabold leading-tight text-ink max-sm:text-[19px]">
          {recipe.title}
        </h3>
        <div className="mt-2.5 flex-1">
          <p className="line-clamp-3 text-sm leading-relaxed text-ink/65">
            {recipe.description}
          </p>
        </div>
        {(totalTime || yields) && (
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 border-t border-border-light pt-4 text-xs tracking-wide text-ink/65">
            {totalTime && (
              <span className="flex items-center gap-1.5 whitespace-nowrap">
                <Clock className="size-3.5 shrink-0 opacity-50" />
                {totalTime}
              </span>
            )}
            {yields && (
              <span className="flex items-center gap-1.5 whitespace-nowrap">
                <UtensilsCrossed className="size-3.5 shrink-0 opacity-50" />
                {yields}
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  )
}

/** browse-card.tsx - ImageBrowseCard branch. Links into /search, as it did. */
export function BrowseCard({
  label,
  imageUrl: src,
  search,
}: {
  label: string
  imageUrl: string
  search: SearchParams
}) {
  return (
    <Link
      to="/search"
      search={search}
      className="group relative block aspect-[3/2] overflow-hidden rounded-lg transition-card-hover hover:-translate-y-1 hover:shadow-lg"
    >
      <div className="absolute inset-0 flex items-center justify-center bg-warm-deep">
        <UtensilsCrossed className="size-10 text-ink/15" strokeWidth="1.25" />
      </div>
      <img
        src={src}
        alt=""
        loading="lazy"
        className="absolute inset-0 size-full object-cover transition-image-zoom group-hover:scale-[1.06] opacity-100"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-ink/70 to-transparent" />
      <span className="absolute bottom-3 left-3 font-display text-base font-extrabold text-white drop-shadow-sm">
        {label}
      </span>
    </Link>
  )
}

/** The grid wrapper used by the home section and the listing pages. */
export function RecipeGrid({ recipes }: { recipes: RecipeSummary[] }) {
  if (recipes.length === 0) {
    return (
      <section className="mx-auto max-w-[var(--max-width)] px-8 py-20 text-center">
        <p className="text-lg text-ink/65">No recipes found.</p>
        <p className="mt-2 text-sm text-ink/65">
          Try a different search or clear your filters.
        </p>
      </section>
    )
  }
  return (
    <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
      {recipes.map((recipe) => (
        <RecipeCard key={recipe.slug} recipe={recipe} />
      ))}
    </div>
  )
}
