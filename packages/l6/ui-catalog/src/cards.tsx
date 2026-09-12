'use client'
import { ResponsiveImage } from '@eat-yeet/l5-ui-primitives/primitives/responsive-image'
/**
 * Catalog cards and grids shared by home, browse, search, stories, and recipe
 * recommendations.
 */

import { Link } from '@eat-yeet/l5-ui-primitives/primitives/navigation'

import { BookOpen, Clock, UtensilsCrossed } from 'lucide-react'
import { cn } from '@eat-yeet/l0-foundation/utils'
import { articleImageUrl, type ArticleSummary } from '@eat-yeet/l1-article-model/articles'
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

const CATALOG_CARD_LINK_CLASS =
  'group flex flex-col overflow-hidden rounded-surface bg-white !text-ink no-underline !shadow-none transition-card-hover will-change-[translate,box-shadow]  hover:!text-ink hover:no-underline '

const CATALOG_CARD_TITLE_CLASS = 'm-0 min-h-[2.12em] text-[22px] leading-[1.06] max-sm:text-[19px]'
const CATALOG_CARD_DESCRIPTION_CLASS =
  'line-clamp-3 min-h-[4.875em] text-sm leading-relaxed text-ink/65'

const CardFallback = ({ icon = 'recipe' }: { icon?: 'recipe' | 'article' }) => (
  <div className="absolute inset-0 bg-warm-deep flex items-center justify-center">
    {icon === 'article' ? (
      <BookOpen className="size-10 text-ink/15" strokeWidth="1.25" />
    ) : (
      <UtensilsCrossed className="size-10 text-ink/15" strokeWidth="1.25" />
    )}
  </div>
)

/** Recipe summary card. */
export function RecipeCard({ recipe, headingLevel = 3, priority = false }: { recipe: RecipeSummary; headingLevel?: 2 | 3; priority?:boolean }) {
  const Heading = headingLevel === 2 ? 'h2' : 'h3'
  const src = imageUrl(recipe)
  const totalTime = humanizeMinutes(recipe.totalMinutes)
  const yields = formatYield(recipe.yieldAmount, recipe.yieldUnit)

  return (
    <Link
      to="/recipes/$slug"
      params={{ slug: recipe.slug }}
      className={CATALOG_CARD_LINK_CLASS}
    >
      <div className="relative aspect-[3/2] w-full overflow-hidden">
        {src ? (
          <div className="absolute inset-0 bg-warm-deep">
            <ResponsiveImage
              src={src}
              loading={priority?"eager":"lazy"}
              fetchPriority={priority?"high":undefined}
              alt={recipe.title}
              width="800"
              height="533"
              sizes="(max-width: 640px) calc(100vw - 48px), (max-width: 1024px) calc((100vw - 80px) / 2), 360px"
              className="absolute inset-0 h-full w-full object-cover transition-image-zoom group-hover:scale-[1.06]"
            />
          </div>
        ) : (
          <CardFallback />
        )}
      </div>
      <div className="flex flex-1 flex-col p-6 max-sm:p-5">
        <Heading
          className={cn('font-display font-extrabold text-ink', CATALOG_CARD_TITLE_CLASS)}
        >
          {recipe.title}
        </Heading>
        <div className="mt-2.5 flex-1">
          <p className={CATALOG_CARD_DESCRIPTION_CLASS}>
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

const ARTICLE_TYPE_LABELS = {
  guide: 'Guide',
  technique: 'Technique',
  reference: 'Reference',
} satisfies Record<ArticleSummary['type'], string>

/** Article summary card using the same card system as recipes. */
export function ArticleCard({ article, priority = false }: { article: ArticleSummary; priority?:boolean }) {
  const src = articleImageUrl(article)

  return (
    <Link
      to="/learn/$slug"
      params={{ slug: article.slug }}
      className={CATALOG_CARD_LINK_CLASS}
    >
      <div className="relative aspect-[3/2] w-full overflow-hidden">
        {src ? (
          <div className="absolute inset-0 bg-warm-deep">
            <ResponsiveImage
              src={src}
              loading={priority?"eager":"lazy"}
              fetchPriority={priority?"high":undefined}
              alt={article.title}
              width="800"
              height="533"
              sizes="(max-width: 640px) calc(100vw - 48px), (max-width: 1024px) calc((100vw - 80px) / 2), 360px"
              className="absolute inset-0 h-full w-full object-cover transition-image-zoom group-hover:scale-[1.06]"
            />
          </div>
        ) : (
          <CardFallback icon="article" />
        )}
      </div>
      <div className="flex flex-1 flex-col p-6 max-sm:p-5">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[2px] text-support-strong">
          {ARTICLE_TYPE_LABELS[article.type]}
        </p>
        <h3
          className={cn('font-display font-extrabold text-ink', CATALOG_CARD_TITLE_CLASS)}
        >
          {article.title}
        </h3>
        <div className="mt-2.5 flex-1">
          <p className={CATALOG_CARD_DESCRIPTION_CLASS}>
            {article.description}
          </p>
        </div>
      </div>
    </Link>
  )
}

/** browse-card.tsx - ImageBrowseCard branch. Links into /search, as it did. */
export function BrowseCard({
  label,
  imageUrl: src,
  search,
  priority=false,
}: {
  label: string
  imageUrl: string
  priority?:boolean
  search: SearchParams
}) {
  return (
    <Link
      to="/search"
      search={search}
      className="group relative block aspect-[3/2] overflow-hidden rounded-surface transition-card-hover  "
    >
      <div className="absolute inset-0 flex items-center justify-center bg-warm-deep">
        <UtensilsCrossed className="size-10 text-ink/15" strokeWidth="1.25" />
      </div>
      <ResponsiveImage
        src={src}
        alt=""
        loading={priority?"eager":"lazy"}
        fetchPriority={priority?"high":undefined}
        sizes="(max-width: 768px) calc((100vw - 44px) / 2), (max-width: 1200px) calc((100vw - 100px) / 4), 275px"
        className="absolute inset-0 size-full object-cover transition-image-zoom group-hover:scale-[1.06] opacity-100"
      />
      <span className="absolute bottom-2 inset-x-2 rounded-field bg-ink px-2 py-1 text-center font-action text-xs font-bold text-action-label">
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
      {recipes.map((recipe,index) => (
        <RecipeCard key={recipe.slug} recipe={recipe} headingLevel={2} priority={index===0} />
      ))}
    </div>
  )
}
