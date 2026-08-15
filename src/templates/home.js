/**
 * Landing page, transcribed from features/recipes/components/hero.tsx and
 * features/recipes/containers/home-container.tsx.
 *
 * Our recipes carry no ratings, so the original's `popular.length === 0`
 * branch is the one that applies: Hero, then a single "Latest Recipes"
 * section, then the browse grid.
 */

import { escapeHtml } from '../format.js'
import { renderRecipeCard, renderSectionHeading, renderBrowseCard, renderViewAll } from './layout.js'

const MAX_SECTION_SIZE = 6

/** hero.tsx */
function renderHomeHero(assets) {
  const heroImage = assets['/images/hero-donuts.jpg']

  return `<section class="relative -mt-16 grid min-h-[85vh] min-h-[85svh] grid-cols-[1.2fr_1fr] items-center overflow-hidden bg-blush pt-16 max-md:grid-cols-1">
      <div class="absolute inset-0 hidden scale-105 bg-cover bg-center will-change-transform max-md:block" style="background-image: url('${heroImage}')"></div>
      <div class="absolute inset-0 hidden max-md:block" style="background: linear-gradient(180deg, rgba(45,30,40,0.55) 0%, rgba(45,30,40,0.45) 50%, rgba(45,30,40,0.6) 100%)"></div>

      <div class="pointer-events-none absolute top-1/2 right-[-5%] -translate-y-1/2 select-none font-hero text-[clamp(180px,22vw,320px)] leading-[0.85] text-pink/[0.03] max-md:hidden" aria-hidden="true">YEET</div>

      <div class="pointer-events-none absolute top-[18%] left-[12%] size-3 rounded-full bg-gold/30 max-md:hidden"></div>
      <div class="pointer-events-none absolute top-[30%] left-[25%] size-2 rounded-full bg-pink/15 max-md:hidden"></div>
      <div class="pointer-events-none absolute top-[72%] left-[8%] size-4 rounded-full bg-pink/10 max-md:hidden"></div>
      <div class="pointer-events-none absolute top-[80%] left-[35%] size-2.5 rounded-full bg-gold/20 max-md:hidden"></div>
      <div class="pointer-events-none absolute top-[15%] right-[35%] size-3.5 rounded-full bg-pink/[0.08] max-md:hidden"></div>
      <div class="pointer-events-none absolute top-[85%] right-[15%] size-1.5 rounded-full bg-gold/35 max-md:hidden"></div>

      <div class="relative z-10 max-w-[600px] px-6 py-20 max-md:mx-auto max-md:text-center md:pl-[clamp(2rem,5vw,6rem)]">
        <div class="flex items-center gap-3 font-hero text-[clamp(48px,6vw,80px)] leading-none max-md:justify-center max-md:gap-2 max-md:text-[clamp(40px,10vw,56px)]">
          <span class="text-charcoal max-md:text-white">Eat</span>
          <span class="size-3 shrink-0 rounded-full bg-charcoal/20 max-md:bg-white/30"></span>
          <span class="bg-[linear-gradient(135deg,#F472B6,#FF2D78)] bg-clip-text text-transparent max-md:text-white max-md:[background:none] max-md:[-webkit-text-fill-color:white]">Yeet</span>
        </div>

        <p class="mt-3 text-[19px] text-charcoal/50 max-md:text-white/70">Eat the best. Yeet the rest.</p>

        <a href="#/search" class="mt-10 inline-flex items-center gap-2.5 rounded-full bg-pink px-8 py-4 text-sm font-semibold uppercase tracking-[2px] text-white shadow-[0_4px_20px_rgba(233,30,99,0.2)] transition-all hover:-translate-y-0.5 hover:bg-pink-dark hover:shadow-[0_8px_30px_rgba(233,30,99,0.3)]">
          Let&rsquo;s Eat
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-arrow-right size-4"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
        </a>
      </div>

      <div class="relative z-10 flex items-center justify-center max-md:hidden">
        <div class="pointer-events-none absolute top-1/2 left-1/2 size-[440px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(233,30,99,0.08)_0%,transparent_70%)]"></div>
        <div class="w-[min(400px,80%)] rotate-3 overflow-hidden rounded-3xl shadow-[0_24px_80px_rgba(233,30,99,0.12)] transition-transform duration-300 ease-out hover:rotate-0 hover:scale-[1.03]">
          <img src="${heroImage}" alt="Pink glazed donuts with colorful sprinkles" class="aspect-[3/4] w-full object-cover" loading="eager" fetchpriority="high">
        </div>
      </div>
    </section>`
}

/** home-container.tsx RecipeSection */
function renderRecipeSection(eyebrow, title, cards) {
  return `<section class="mx-auto max-w-[var(--max-width)] px-8 py-20">
      ${renderSectionHeading(eyebrow, title)}
      <div class="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">${cards.map(renderRecipeCard).join('')}</div>
      ${renderViewAll('#/search', 'View all recipes')}
    </section>`
}

/** home-container.tsx HomeBrowseSection */
function renderBrowseSection(cards) {
  return `<section class="mx-auto max-w-[var(--max-width)] px-8 py-16" aria-label="Browse by Category">
      ${renderSectionHeading('Top Eats', 'Browse by Category')}
      <div class="grid grid-cols-2 gap-3 md:grid-cols-4">${cards.map(renderBrowseCard).join('')}</div>
      ${renderViewAll('#/search', 'View all categories')}
    </section>`
}

export function renderHome(recipes, categories, assets, browseCards) {
  return `${renderHomeHero(assets)}
    ${renderRecipeSection('Top Eats', 'Latest Recipes', recipes.slice(0, MAX_SECTION_SIZE))}
    ${renderBrowseSection(browseCards)}`
}
