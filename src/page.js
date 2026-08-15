/**
 * Route -> page HTML, plus the document shell.
 *
 * The shell mirrors routes/__root.tsx: a flex column with a fixed nav, a
 * `pt-[var(--header-offset)]` main, and the footer. Heroes cancel that padding
 * with `-mt-16`, which is why nav state has to be computed per route.
 */

import { renderHome } from './templates/home.js'
import { renderSearch } from './templates/search.js'
import { renderCategory } from './templates/category.js'
import { renderRecipe } from './templates/recipe.js'
import { renderNav, renderFooter } from './templates/layout.js'
import { renderPalette } from './templates/palette.js'

export function renderPage(recipes, categories, route, assets, browseCards) {
  switch (route.name) {
    case 'home':
      return renderHome(recipes, categories, assets, browseCards)
    case 'search':
      return renderSearch(recipes, route.state)
    case 'category':
      return renderCategory(recipes, categories.find((c) => c.slug === route.slug))
    case 'recipe':
      return renderRecipe(recipes, route.slug)
    default:
      return `<div class="mx-auto max-w-[var(--max-width-narrow)] px-8 pt-8 pb-20 text-center">
          <p class="text-lg text-charcoal/65">Page not found.</p>
          <p class="mt-2 text-sm text-charcoal/65"><a href="#/" class="text-pink hover:text-pink-dark">Back to home</a></p>
        </div>`
  }
}

/**
 * nav.tsx's routeHasHero / routeHasDarkHero, at their unscrolled state.
 * Home has a light hero (dark text); recipe pages have a dark image hero.
 */
export function navState(route) {
  if (route.name === 'home') return { onHeroPage: true, heroVisible: false }
  if (route.name === 'recipe') return { onHeroPage: true, heroVisible: true }
  return { onHeroPage: false, heroVisible: false }
}

export function pageTitle(recipes, categories, route) {
  const site = 'Eat / Yeet'
  if (route.name === 'recipe') {
    const recipe = recipes.find((r) => r.slug === route.slug)
    return recipe ? `${recipe.title} — ${site}` : site
  }
  if (route.name === 'category') {
    const category = categories.find((c) => c.slug === route.slug)
    return category ? `${category.label} — ${site}` : site
  }
  if (route.name === 'search') return `Search — ${site}`
  return site
}

export function renderShell(recipes, categories, route, assets, browseCards) {
  return `<div class="flex min-h-screen flex-col">
      ${renderNav(assets, navState(route))}
      <main id="main-content" class="flex-1 pt-[var(--header-offset)]">${renderPage(recipes, categories, route, assets, browseCards)}</main>
      ${renderFooter()}
      ${renderPalette()}
    </div>`
}
