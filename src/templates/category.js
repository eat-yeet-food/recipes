/**
 * Category page — one curated facet slice, laid out like the search results
 * column with the same page heading treatment.
 */

import { escapeHtml } from '../format.js'
import { recipesInCategory } from '../model.js'
import { renderRecipeGrid } from './layout.js'

export function renderCategory(recipes, category) {
  if (!category) {
    return `<div class="mx-auto max-w-[var(--max-width-narrow)] px-8 pt-8 pb-20 text-center">
        <p class="text-lg text-charcoal/65">Unknown category.</p>
        <p class="mt-2 text-sm text-charcoal/65"><a href="#/" class="text-pink hover:text-pink-dark">Back to home</a></p>
      </div>`
  }

  const matches = recipesInCategory(recipes, category)

  return `<div class="mx-auto max-w-[var(--max-width)] px-6 pt-8 pb-20 md:px-8">
      <div class="mb-8">
        <nav aria-label="Breadcrumb" class="mb-3 text-[11px] font-semibold uppercase tracking-[2px] text-charcoal/65">
          <a href="#/" class="transition-colors hover:text-pink">EAT/YEET</a><span class="mx-2">&gt;</span><span>${escapeHtml(category.label)}</span>
        </nav>
        <h1 class="font-display text-[clamp(28px,4vw,40px)] font-extrabold text-charcoal">${escapeHtml(category.label)}</h1>
        <p class="mt-2 text-xs font-medium text-charcoal/65">${matches.length} ${matches.length === 1 ? 'recipe' : 'recipes'}</p>
      </div>
      ${renderRecipeGrid(matches)}
    </div>`
}
