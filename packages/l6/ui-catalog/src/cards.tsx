'use client'
import { ResponsiveImage } from '@eat-yeet/l5-ui-primitives/primitives/responsive-image'
/**
 * Catalog cards and grids shared by home, browse, search, stories, and recipe
 * recommendations.
 */

import { Link } from '@eat-yeet/l5-ui-primitives/primitives/navigation'

import type { ReactNode } from 'react'
import { BookOpen, Clock, UtensilsCrossed } from 'lucide-react'
import { cn } from '@eat-yeet/l0-foundation/utils'
import { AccentRule } from '@eat-yeet/l5-ui-primitives/primitives/surface'
import { Eyebrow } from '@eat-yeet/l5-ui-primitives/primitives/typography'
import { articleImageUrl, type ArticleSummary } from '@eat-yeet/l1-article-model/articles'
import { humanizeMinutes, formatYield } from '@eat-yeet/l2-recipe-domain/format'
import { imageUrl, type RecipeSummary } from '@eat-yeet/l1-recipe-model/recipes'
import type { SearchParams } from '@eat-yeet/l2-recipe-domain/search'

/** Shared section heading used by catalog feature sections. */
export function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <>
      <Eyebrow className="mb-2 text-center">{eyebrow}</Eyebrow>
      <h2 className="mb-0 text-center font-display text-page font-extrabold text-ink">
        {title}
      </h2>
      <AccentRule align="center" className="mb-10 mt-4" />
    </>
  )
}

const CATALOG_CARD_LINK_CLASS =
  'group flex flex-col overflow-hidden rounded-surface bg-white text-ink no-underline transition-card-hover will-change-[translate,box-shadow] hover:text-ink hover:no-underline'

const CATALOG_CARD_TITLE_CLASS = 'm-0 min-h-[2.12em] font-display font-extrabold text-title-sm leading-[1.06] text-ink max-sm:text-lg'
const CATALOG_CARD_DESCRIPTION_CLASS =
  'line-clamp-3 min-h-[4.875em] text-sm leading-relaxed text-muted-foreground'
const CATALOG_CARD_SIZES = '(max-width: 640px) calc(100vw - 48px), (max-width: 1024px) calc((100vw - 80px) / 2), 360px'

const CardFallback = ({ icon = 'recipe' }: { icon?: 'recipe' | 'article' }) => (
  <div className="absolute inset-0 bg-muted flex items-center justify-center">
    {icon === 'article' ? (
      <BookOpen aria-hidden="true" className="size-10 text-border" strokeWidth="1.25" />
    ) : (
      <UtensilsCrossed aria-hidden="true" className="size-10 text-border" strokeWidth="1.25" />
    )}
  </div>
)

/**
 * The one catalog card: a white, borderless link with a 3:2 image (muted
 * placeholder), an optional eyebrow, a Geller title, body and an optional meta
 * row under a rule. Recipe, article and Notebook formula cards all use it.
 */
export function CatalogCard({ to, params, image, imageAlt = '', priority = false, fallbackIcon = 'recipe', eyebrow, title, headingLevel = 3, description, children, meta, className, ...data }: {
  to: string
  params?: Record<string, string>
  image?: string | null
  imageAlt?: string
  priority?: boolean
  fallbackIcon?: 'recipe' | 'article'
  eyebrow?: ReactNode
  title: ReactNode
  headingLevel?: 2 | 3
  description?: ReactNode
  children?: ReactNode
  meta?: ReactNode
  className?: string
} & { [key: `data-${string}`]: string | undefined }) {
  const Heading = headingLevel === 2 ? 'h2' : 'h3'
  return (
    <Link to={to} params={params} className={cn(CATALOG_CARD_LINK_CLASS, className)} {...data}>
      <div className="relative aspect-[3/2] w-full overflow-hidden">
        {image ? (
          <div className="absolute inset-0 bg-muted">
            <ResponsiveImage
              src={image}
              loading={priority ? 'eager' : 'lazy'}
              fetchPriority={priority ? 'high' : undefined}
              alt={imageAlt}
              width="800"
              height="533"
              sizes={CATALOG_CARD_SIZES}
              className="absolute inset-0 h-full w-full object-cover transition-image-zoom group-hover:scale-[1.06]"
            />
          </div>
        ) : (
          <CardFallback icon={fallbackIcon} />
        )}
      </div>
      <div className="flex flex-1 flex-col p-6 max-sm:p-5">
        {eyebrow && <Eyebrow size="small" className="mb-2">{eyebrow}</Eyebrow>}
        <Heading className={cn(CATALOG_CARD_TITLE_CLASS, 'break-words')}>{title}</Heading>
        <div className="mt-2.5 flex-1">
          {description && <p className={CATALOG_CARD_DESCRIPTION_CLASS}>{description}</p>}
          {children}
        </div>
        {meta && (
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 border-t border-border pt-4 text-xs text-muted-foreground">{meta}</div>
        )}
      </div>
    </Link>
  )
}

/** Recipe summary card. */
export function RecipeCard({ recipe, headingLevel = 3, priority = false }: { recipe: RecipeSummary; headingLevel?: 2 | 3; priority?:boolean }) {
  const totalTime = recipe.totalLabel || humanizeMinutes(recipe.totalMinutes)
  const yields = formatYield(recipe.yieldAmount, recipe.yieldUnit)
  return (
    <CatalogCard
      to="/recipes/$slug"
      params={{ slug: recipe.slug }}
      image={imageUrl(recipe)}
      imageAlt={recipe.title}
      priority={priority}
      title={recipe.title}
      headingLevel={headingLevel}
      description={recipe.description}
      meta={(totalTime || yields) ? <>
        {totalTime && (
          <span className="flex items-center gap-1.5 whitespace-nowrap">
            <Clock aria-hidden="true" className="size-3.5 shrink-0" />
            {totalTime}
          </span>
        )}
        {yields && (
          <span className="flex items-center gap-1.5 whitespace-nowrap">
            <UtensilsCrossed aria-hidden="true" className="size-3.5 shrink-0" />
            {yields}
          </span>
        )}
      </> : undefined}
    />
  )
}

const ARTICLE_TYPE_LABELS = {
  guide: 'Guide',
  technique: 'Technique',
  reference: 'Reference',
} satisfies Record<ArticleSummary['type'], string>

/** Article summary card using the same card system as recipes. */
export function ArticleCard({ article, priority = false }: { article: ArticleSummary; priority?:boolean }) {
  return (
    <CatalogCard
      to="/learn/$slug"
      params={{ slug: article.slug }}
      image={articleImageUrl(article)}
      imageAlt={article.title}
      priority={priority}
      fallbackIcon="article"
      eyebrow={ARTICLE_TYPE_LABELS[article.type]}
      title={article.title}
      description={article.description}
    />
  )
}

/** browse-card.tsx - ImageBrowseCard branch. Links into /search, as it did. */
export function BrowseCard({
  label,
  imageUrl: src,
  search,
  priority=false,
  eager=false,
}: {
  label: string
  imageUrl: string
  priority?:boolean
  eager?:boolean
  search: SearchParams
}) {
  return (
    <Link
      to="/search"
      search={search}
      className="group relative block aspect-[3/2] overflow-hidden rounded-surface transition-card-hover"
    >
      <div className="absolute inset-0 flex items-center justify-center bg-muted">
        <UtensilsCrossed aria-hidden="true" className="size-10 text-border" strokeWidth="1.25" />
      </div>
      <ResponsiveImage
        src={src}
        alt=""
        loading={priority || eager ? "eager" : "lazy"}
        fetchPriority={priority?"high":undefined}
        sizes="(max-width: 768px) calc((100vw - 44px) / 2), (max-width: 1200px) calc((100vw - 100px) / 4), 275px"
        className="absolute inset-0 size-full object-cover transition-image-zoom group-hover:scale-[1.06] opacity-100"
      />
      <span className="absolute bottom-2 inset-x-2 rounded-field bg-ink px-2 py-1 text-center font-action text-xs font-bold text-on-dark-label">
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
        <p className="text-lg text-muted-foreground">No recipes found.</p>
        <p className="mt-2 text-sm text-muted-foreground">
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
