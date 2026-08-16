/**
 * Chrome and cards, class-for-class from the original React components so the
 * production Tailwind build styles them identically.
 *
 * Sources:
 *   platform/L3/layout/nav.tsx
 *   platform/L3/layout/footer.tsx
 *   features/recipes/components/recipe-card.tsx
 *   features/recipes/components/browse-card.tsx
 *   features/recipes/containers/home-container.tsx  (SectionHeading)
 *
 * `cn()` merges are resolved here by hand into their final class strings.
 */

import { Link } from '@tanstack/react-router'

import { Icon } from './icons'
import { humanizeMinutes, formatYield } from '../lib/format'
import { imageUrl, type RecipeSummary } from '../lib/recipes'
import type { SearchState } from '../lib/model'

/** The "YEET" wordmark path, lifted verbatim from nav.tsx. */
const WORDMARK_PATH =
  'M 17.89 0.25 L 23.69 0.25 C 26.4 0.25 27.47 -0.82 27.47 -3.53 L 27.47 -16.7 L 40.38 -39.56 C 41.71 -41.96 41.14 -42.84 38.43 -42.84 L 33.64 -42.84 C 30.93 -42.84 29.36 -41.9 28.1 -39.5 L 21.11 -26.52 L 14.11 -39.5 C 12.85 -41.9 11.28 -42.84 8.57 -42.84 L 3.4 -42.84 C 0.69 -42.84 0.13 -41.96 1.45 -39.56 L 14.11 -16.7 L 14.11 -3.53 C 14.11 -0.82 15.18 0.25 17.89 0.25 Z M 50.21 0 L 52.98 0 L 53.3 0 L 53.55 0 L 71.32 0 C 74.47 0 75.66 -1.2 75.66 -4.35 L 75.66 -5.99 C 75.66 -9.13 74.47 -10.33 71.32 -10.33 L 57.33 -10.33 L 57.33 -16.25 L 68.42 -16.25 C 71.57 -16.25 72.77 -17.45 72.77 -20.6 L 72.77 -22.24 C 72.77 -25.39 71.57 -26.59 68.42 -26.59 L 57.33 -26.59 L 57.33 -32.51 L 70.69 -32.51 C 73.84 -32.51 75.03 -33.7 75.03 -36.85 L 75.03 -38.49 C 75.03 -41.64 73.84 -42.84 70.69 -42.84 L 53.55 -42.84 L 53.3 -42.84 L 52.98 -42.84 L 50.21 -42.84 C 47.06 -42.84 45.86 -41.64 45.86 -38.49 L 45.86 -4.35 C 45.86 -1.2 47.06 0 50.21 0 Z M 85.3 0 L 88.07 0 L 88.39 0 L 88.64 0 L 106.41 0 C 109.56 0 110.75 -1.2 110.75 -4.35 L 110.75 -5.99 C 110.75 -9.13 109.56 -10.33 106.41 -10.33 L 92.42 -10.33 L 92.42 -16.25 L 103.51 -16.25 C 106.66 -16.25 107.86 -17.45 107.86 -20.6 L 107.86 -22.24 C 107.86 -25.39 106.66 -26.59 103.51 -26.59 L 92.42 -26.59 L 92.42 -32.51 L 105.78 -32.51 C 108.93 -32.51 110.12 -33.7 110.12 -36.85 L 110.12 -38.49 C 110.12 -41.64 108.93 -42.84 105.78 -42.84 L 88.64 -42.84 L 88.39 -42.84 L 88.07 -42.84 L 85.3 -42.84 C 82.15 -42.84 80.96 -41.64 80.96 -38.49 L 80.96 -4.35 C 80.96 -1.2 82.15 0 85.3 0 Z M 131.04 0 L 133.81 0 C 136.96 0 138.16 -1.2 138.16 -4.35 L 138.16 -32.51 L 146.48 -32.51 C 149.63 -32.51 150.82 -33.7 150.82 -36.85 L 150.82 -38.49 C 150.82 -41.64 149.63 -42.84 146.48 -42.84 L 118.38 -42.84 C 115.23 -42.84 114.03 -41.64 114.03 -38.49 L 114.03 -36.85 C 114.03 -33.7 115.23 -32.51 118.38 -32.51 L 126.69 -32.51 L 126.69 -4.35 C 126.69 -1.2 127.89 0 131.04 0 Z'

/** buttonVariants() base, resolved. */
const BTN_BASE =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive"
const BTN_GHOST = 'hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50'

function GhostButton({
  size,
  sizeClass,
  extra,
  label,
  children,
  ...rest
}: {
  size: string
  sizeClass: string
  extra?: string
  label: string
  children: React.ReactNode
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      data-slot="button"
      data-variant="ghost"
      data-size={size}
      className={`${BTN_BASE} ${BTN_GHOST} ${sizeClass}${extra ? ' ' + extra : ''}`}
      aria-label={label}
      type="button"
      {...rest}
    >
      {children}
    </button>
  )
}

export interface NavState {
  onHeroPage?: boolean
  heroVisible?: boolean
}

/**
 * nav.tsx. `onHeroPage` is the unscrolled state over a hero; `heroVisible`
 * additionally means that hero is dark, which flips the text to white.
 */
export function Nav({
  onHeroPage = false,
  heroVisible = false,
  onOpenPalette,
}: NavState & { onOpenPalette: () => void }) {
  const navBg = onHeroPage
    ? 'bg-transparent'
    : 'bg-white/92 backdrop-blur-[16px] shadow-[0_1px_0_rgba(45,45,45,0.08)]'

  const iconClass = heroVisible
    ? 'h-12 drop-shadow-[0_2px_8px_rgba(0,0,0,0.4)] max-md:h-10'
    : onHeroPage
      ? 'h-12 max-md:h-10 max-md:drop-shadow-[0_2px_8px_rgba(0,0,0,0.4)]'
      : 'h-12'

  const wordmarkClass = onHeroPage
    ? heroVisible
      ? 'h-7 max-md:h-6 text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.5)]'
      : 'h-7 max-md:h-6 text-charcoal max-md:text-white max-md:drop-shadow-[0_2px_12px_rgba(0,0,0,0.5)]'
    : 'h-6 text-charcoal'

  const linkClass = heroVisible
    ? 'font-nav text-sm font-[900] uppercase tracking-wider transition-nav-text text-white [text-shadow:0_1px_8px_rgba(0,0,0,0.45),0_0_16px_rgba(0,0,0,0.2)] hover:text-gold'
    : 'font-nav text-sm font-[900] uppercase tracking-wider transition-nav-text text-charcoal hover:text-charcoal/70'

  const searchBtnClass = heroVisible
    ? 'text-white/80 hover:bg-white/10 hover:text-white'
    : 'text-charcoal/65 hover:text-charcoal'

  return (
    <nav
      className={`fixed top-[var(--impersonation-h,0px)] left-0 z-50 w-full transition-nav ${navBg}`}
    >
      <div className="mx-auto flex h-16 max-w-[var(--max-width)] items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-2">
          <Link to="/" className="flex items-center gap-2" aria-label="YEET home">
            <img src="/donut-icon.svg" alt="" className={`transition-nav-icon ${iconClass}`} />
            <svg
              viewBox="0 -43 152 44"
              fill="currentColor"
              className={`transition-nav-icon ${wordmarkClass}`}
            >
              <path d={WORDMARK_PATH} />
            </svg>
          </Link>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <div className="hidden md:flex items-center gap-6">
            <Link to="/search" className={linkClass}>
              Recipes
            </Link>
          </div>
          <div className="hidden md:flex items-center gap-3">
            <GhostButton
              size="icon"
              sizeClass="size-10"
              extra={searchBtnClass}
              label="Search recipes"
              data-palette-open=""
              onClick={onOpenPalette}
            >
              <Icon name="search" className="size-4" />
            </GhostButton>
          </div>
          <div className="flex items-center gap-1 md:gap-3 md:hidden">
            <GhostButton
              size="icon"
              sizeClass="size-10"
              extra={onHeroPage ? 'md:hidden text-white hover:text-white/80' : 'md:hidden'}
              label="Search recipes"
              data-palette-open=""
              onClick={onOpenPalette}
            >
              <Icon name="search" className="size-5" />
            </GhostButton>
            <GhostButton
              size="icon"
              sizeClass="size-10"
              extra={[
                onHeroPage ? 'max-md:text-white max-md:hover:text-white/80' : '',
                heroVisible ? 'text-white hover:text-white/80' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              label="Open menu"
            >
              <Icon name="menu" className="size-6" />
            </GhostButton>
          </div>
        </div>
      </div>
    </nav>
  )
}

/** footer.tsx */
export function Footer() {
  const linkClass =
    'text-[13px] font-medium uppercase tracking-[1.5px] text-charcoal/40 transition-colors hover:text-pink'

  return (
    <footer className="bg-white px-8 text-center print:hidden">
      <div className="mx-auto max-w-[var(--max-width)] py-9">
        <p className="font-display text-[20px] font-extrabold uppercase tracking-tight text-charcoal">
          Eat <span className="font-normal text-pink">/</span> Yeet
        </p>
        <nav className="mt-4 flex justify-center gap-6" aria-label="Footer">
          <Link to="/" className={linkClass}>
            About
          </Link>
          <Link to="/" className={linkClass}>
            Privacy
          </Link>
          <Link to="/" className={linkClass}>
            Terms
          </Link>
        </nav>
        <p className="mt-4 text-[11px] tracking-[1px] text-charcoal/25">
          &copy; {new Date().getFullYear()} Eat / Yeet. All rights reserved.
        </p>
      </div>
    </footer>
  )
}

/** home-container.tsx SectionHeading */
export function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <>
      <p className="mb-2 text-center text-xs font-semibold uppercase tracking-[3px] text-sage-dark">
        {eyebrow}
      </p>
      <h2 className="mb-0 text-center font-display text-[clamp(28px,4vw,40px)] font-extrabold text-charcoal">
        {title}
      </h2>
      <div className="mx-auto mb-10 mt-4 h-[3px] w-[60px] rounded-full bg-gradient-to-r from-pink to-gold" />
    </>
  )
}

const CardFallback = () => (
  <div className="absolute inset-0 bg-peach-deep flex items-center justify-center">
    <Icon name="utensils-crossed" className="size-10 text-charcoal/15" strokeWidth="1.25" />
  </div>
)

/** recipe-card.tsx */
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
          <div className="absolute inset-0 bg-peach-deep">
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
        <h3 className="font-display text-[22px] font-extrabold leading-tight text-charcoal max-sm:text-[19px]">
          {recipe.title}
        </h3>
        <div className="mt-2.5 flex-1">
          <p className="line-clamp-3 text-sm leading-relaxed text-charcoal/65">
            {recipe.description}
          </p>
        </div>
        {(totalTime || yields) && (
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 border-t border-border-light pt-4 text-xs tracking-wide text-charcoal/65">
            {totalTime && (
              <span className="flex items-center gap-1.5 whitespace-nowrap">
                <Icon name="clock" className="size-3.5 shrink-0 opacity-50" />
                {totalTime}
              </span>
            )}
            {yields && (
              <span className="flex items-center gap-1.5 whitespace-nowrap">
                <Icon name="utensils-crossed" className="size-3.5 shrink-0 opacity-50" />
                {yields}
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  )
}

/** browse-card.tsx — ImageBrowseCard branch. Links into /search, as it did. */
export function BrowseCard({
  label,
  imageUrl: src,
  search,
}: {
  label: string
  imageUrl: string
  search: Partial<SearchState>
}) {
  return (
    <Link
      to="/search"
      search={search}
      className="group relative block aspect-[3/2] overflow-hidden rounded-lg transition-card-hover hover:-translate-y-1 hover:shadow-lg"
    >
      <div className="absolute inset-0 flex items-center justify-center bg-peach-deep">
        <Icon name="utensils-crossed" className="size-10 text-charcoal/15" strokeWidth="1.25" />
      </div>
      <img
        src={src}
        alt=""
        loading="lazy"
        className="absolute inset-0 size-full object-cover transition-image-zoom group-hover:scale-[1.06] opacity-100"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-charcoal/70 to-transparent" />
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
        <p className="text-lg text-charcoal/65">No recipes found.</p>
        <p className="mt-2 text-sm text-charcoal/65">
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
