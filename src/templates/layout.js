/**
 * Chrome and cards, transcribed class-for-class from the original React
 * components so the production Tailwind build styles them identically.
 *
 * Sources:
 *   platform/L3/layout/nav.tsx
 *   platform/L3/layout/footer.tsx
 *   platform/L3/layout/login-button.tsx
 *   features/recipes/components/recipe-card.tsx
 *   features/recipes/components/browse-card.tsx
 *   features/recipes/containers/home-container.tsx  (SectionHeading)
 *
 * `cn()` merges are resolved here by hand into their final class strings.
 */

import { escapeHtml, humanizeMinutes, formatYield } from '../format.js'
import { icon } from '../icons.js'

/** The "YEET" wordmark path, lifted verbatim from nav.tsx. */
const WORDMARK_PATH =
  'M 17.89 0.25 L 23.69 0.25 C 26.4 0.25 27.47 -0.82 27.47 -3.53 L 27.47 -16.7 L 40.38 -39.56 C 41.71 -41.96 41.14 -42.84 38.43 -42.84 L 33.64 -42.84 C 30.93 -42.84 29.36 -41.9 28.1 -39.5 L 21.11 -26.52 L 14.11 -39.5 C 12.85 -41.9 11.28 -42.84 8.57 -42.84 L 3.4 -42.84 C 0.69 -42.84 0.13 -41.96 1.45 -39.56 L 14.11 -16.7 L 14.11 -3.53 C 14.11 -0.82 15.18 0.25 17.89 0.25 Z M 50.21 0 L 52.98 0 L 53.3 0 L 53.55 0 L 71.32 0 C 74.47 0 75.66 -1.2 75.66 -4.35 L 75.66 -5.99 C 75.66 -9.13 74.47 -10.33 71.32 -10.33 L 57.33 -10.33 L 57.33 -16.25 L 68.42 -16.25 C 71.57 -16.25 72.77 -17.45 72.77 -20.6 L 72.77 -22.24 C 72.77 -25.39 71.57 -26.59 68.42 -26.59 L 57.33 -26.59 L 57.33 -32.51 L 70.69 -32.51 C 73.84 -32.51 75.03 -33.7 75.03 -36.85 L 75.03 -38.49 C 75.03 -41.64 73.84 -42.84 70.69 -42.84 L 53.55 -42.84 L 53.3 -42.84 L 52.98 -42.84 L 50.21 -42.84 C 47.06 -42.84 45.86 -41.64 45.86 -38.49 L 45.86 -4.35 C 45.86 -1.2 47.06 0 50.21 0 Z M 85.3 0 L 88.07 0 L 88.39 0 L 88.64 0 L 106.41 0 C 109.56 0 110.75 -1.2 110.75 -4.35 L 110.75 -5.99 C 110.75 -9.13 109.56 -10.33 106.41 -10.33 L 92.42 -10.33 L 92.42 -16.25 L 103.51 -16.25 C 106.66 -16.25 107.86 -17.45 107.86 -20.6 L 107.86 -22.24 C 107.86 -25.39 106.66 -26.59 103.51 -26.59 L 92.42 -26.59 L 92.42 -32.51 L 105.78 -32.51 C 108.93 -32.51 110.12 -33.7 110.12 -36.85 L 110.12 -38.49 C 110.12 -41.64 108.93 -42.84 105.78 -42.84 L 88.64 -42.84 L 88.39 -42.84 L 88.07 -42.84 L 85.3 -42.84 C 82.15 -42.84 80.96 -41.64 80.96 -38.49 L 80.96 -4.35 C 80.96 -1.2 82.15 0 85.3 0 Z M 131.04 0 L 133.81 0 C 136.96 0 138.16 -1.2 138.16 -4.35 L 138.16 -32.51 L 146.48 -32.51 C 149.63 -32.51 150.82 -33.7 150.82 -36.85 L 150.82 -38.49 C 150.82 -41.64 149.63 -42.84 146.48 -42.84 L 118.38 -42.84 C 115.23 -42.84 114.03 -41.64 114.03 -38.49 L 114.03 -36.85 C 114.03 -33.7 115.23 -32.51 118.38 -32.51 L 126.69 -32.51 L 126.69 -4.35 C 126.69 -1.2 127.89 0 131.04 0 Z'

/** buttonVariants() base, resolved. */
const BTN_BASE =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive"
const BTN_GHOST = 'hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50'

function ghostButton({ size, sizeClass, extra, label, children, attrs = '' }) {
  return `<button data-slot="button" data-variant="ghost" data-size="${size}" class="${BTN_BASE} ${BTN_GHOST} ${sizeClass}${extra ? ' ' + extra : ''}" aria-label="${escapeHtml(label)}" type="button"${attrs ? ' ' + attrs : ''}>${children}</button>`
}

/**
 * nav.tsx. `onHeroPage` is the unscrolled state over a hero; `heroVisible`
 * additionally means that hero is dark, which flips the text to white.
 */
export function renderNav(assets, { onHeroPage = false, heroVisible = false } = {}) {
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

  return `<nav class="fixed top-[var(--impersonation-h,0px)] left-0 z-50 w-full transition-nav ${navBg}">
      <div class="mx-auto flex h-16 max-w-[var(--max-width)] items-center justify-between px-4 md:px-6">
        <div class="flex items-center gap-2">
          <a href="#/" class="flex items-center gap-2" aria-label="YEET home">
            <img src="${assets['/donut-icon.svg']}" alt="" class="transition-nav-icon ${iconClass}">
            <svg viewBox="0 -43 152 44" fill="currentColor" class="transition-nav-icon ${wordmarkClass}"><path d="${WORDMARK_PATH}"/></svg>
          </a>
        </div>
        <div class="ml-auto flex items-center gap-3">
          <div class="hidden md:flex items-center gap-6">
            <a href="#/search" class="${linkClass}">Recipes</a>
          </div>
          <div class="hidden md:flex items-center gap-3">
            ${ghostButton({ size: 'icon', sizeClass: 'size-10', extra: searchBtnClass, label: 'Search recipes', children: icon('search', 'size-4'), attrs: 'data-palette-open' })}
          </div>
          <div class="flex items-center gap-1 md:gap-3 md:hidden">
            ${ghostButton({ size: 'icon', sizeClass: 'size-10', extra: onHeroPage ? 'md:hidden text-white hover:text-white/80' : 'md:hidden', label: 'Search recipes', children: icon('search', 'size-5'), attrs: 'data-palette-open' })}
            ${ghostButton({ size: 'icon', sizeClass: 'size-10', extra: [onHeroPage ? 'max-md:text-white max-md:hover:text-white/80' : '', heroVisible ? 'text-white hover:text-white/80' : ''].filter(Boolean).join(' '), label: 'Open menu', children: icon('menu', 'size-6') })}
          </div>
        </div>
      </div>
    </nav>`
}

/** footer.tsx */
export function renderFooter() {
  const link = (href, label) =>
    `<a href="${href}" class="text-[13px] font-medium uppercase tracking-[1.5px] text-charcoal/40 transition-colors hover:text-pink">${label}</a>`

  return `<footer class="bg-white px-8 text-center print:hidden">
      <div class="mx-auto max-w-[var(--max-width)] py-9">
        <p class="font-display text-[20px] font-extrabold uppercase tracking-tight text-charcoal">Eat <span class="font-normal text-pink">/</span> Yeet</p>
        <nav class="mt-4 flex justify-center gap-6" aria-label="Footer">
          ${link('#/', 'About')}
          ${link('#/', 'Privacy')}
          ${link('#/', 'Terms')}
        </nav>
        <p class="mt-4 text-[11px] tracking-[1px] text-charcoal/25">&copy; ${new Date().getFullYear()} Eat / Yeet. All rights reserved.</p>
      </div>
    </footer>`
}

/** home-container.tsx SectionHeading */
export function renderSectionHeading(eyebrow, title) {
  return `<p class="mb-2 text-center text-xs font-semibold uppercase tracking-[3px] text-sage-dark">${escapeHtml(eyebrow)}</p>
      <h2 class="mb-0 text-center font-display text-[clamp(28px,4vw,40px)] font-extrabold text-charcoal">${escapeHtml(title)}</h2>
      <div class="mx-auto mb-10 mt-4 h-[3px] w-[60px] rounded-full bg-gradient-to-r from-pink to-gold"></div>`
}

const CARD_FALLBACK = `<div class="absolute inset-0 bg-peach-deep flex items-center justify-center">${icon('utensils-crossed', 'size-10 text-charcoal/15', '1.25')}</div>`

/** recipe-card.tsx */
export function renderRecipeCard(recipe) {
  const media = recipe.imageUrl
    ? `<div class="absolute inset-0 bg-peach-deep"><img src="${recipe.imageUrl}" alt="${escapeHtml(recipe.imageAlt ?? '')}" width="800" height="533" sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" class="absolute inset-0 h-full w-full object-cover transition-image-zoom group-hover:scale-[1.06]"></div>`
    : CARD_FALLBACK

  const totalTime = humanizeMinutes(recipe.totalMinutes)
  const yields = formatYield(recipe.yieldAmount, recipe.yieldUnit)

  const meta =
    totalTime || yields
      ? `<div class="mt-4 flex flex-wrap gap-x-4 gap-y-1 border-t border-border-light pt-4 text-xs tracking-wide text-charcoal/65">
            ${totalTime ? `<span class="flex items-center gap-1.5 whitespace-nowrap">${icon('clock', 'size-3.5 shrink-0 opacity-50')}${escapeHtml(totalTime)}</span>` : ''}
            ${yields ? `<span class="flex items-center gap-1.5 whitespace-nowrap">${icon('utensils-crossed', 'size-3.5 shrink-0 opacity-50')}${escapeHtml(yields)}</span>` : ''}
          </div>`
      : ''

  return `<a href="#/r/${encodeURIComponent(recipe.slug)}" class="group flex flex-col overflow-hidden rounded-lg bg-white shadow-sm transition-card-hover will-change-[translate,box-shadow] hover:-translate-y-1 hover:shadow-card-hover">
      <div class="relative aspect-[3/2] w-full overflow-hidden">${media}</div>
      <div class="flex flex-1 flex-col p-6 max-sm:p-5">
        <h3 class="font-display text-[22px] font-extrabold leading-tight text-charcoal max-sm:text-[19px]">${escapeHtml(recipe.title)}</h3>
        <div class="mt-2.5 flex-1"><p class="line-clamp-3 text-sm leading-relaxed text-charcoal/65">${escapeHtml(recipe.description)}</p></div>
        ${meta}
      </div>
    </a>`
}

/** browse-card.tsx — ImageBrowseCard branch */
export function renderBrowseCard(card) {
  return `<a href="#/c/${encodeURIComponent(card.slug)}" class="group relative block aspect-[3/2] overflow-hidden rounded-lg transition-card-hover hover:-translate-y-1 hover:shadow-lg">
      <div class="absolute inset-0 flex items-center justify-center bg-peach-deep">${icon('utensils-crossed', 'size-10 text-charcoal/15', '1.25')}</div>
      <img src="${card.imageUrl}" alt="" loading="lazy" class="absolute inset-0 size-full object-cover transition-image-zoom group-hover:scale-[1.06] opacity-100">
      <div class="absolute inset-0 bg-gradient-to-t from-charcoal/70 to-transparent"></div>
      <span class="absolute bottom-3 left-3 font-display text-base font-extrabold text-white drop-shadow-sm">${escapeHtml(card.label)}</span>
    </a>`
}

/** The grid wrapper used by RecipeSection and the listing pages. */
export function renderRecipeGrid(recipes) {
  if (recipes.length === 0) {
    return `<section class="mx-auto max-w-[var(--max-width)] px-8 py-20 text-center">
        <p class="text-lg text-charcoal/65">No recipes found.</p>
        <p class="mt-2 text-sm text-charcoal/65">Try a different search or clear your filters.</p>
      </section>`
  }
  return `<div class="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">${recipes.map(renderRecipeCard).join('')}</div>`
}

/** The "View all …" link that closes each home section. */
export function renderViewAll(href, label) {
  return `<div class="mt-10 text-center">
      <a href="${href}" class="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[2px] text-pink transition-colors hover:text-pink-dark">${escapeHtml(label)}${icon('arrow-right', 'size-4')}</a>
    </div>`
}
