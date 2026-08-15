/**
 * Search page, transcribed from:
 *   containers/search-container.tsx
 *   components/filter-sidebar.tsx
 *   components/faceted-filter-group.tsx
 *   components/category-toggle.tsx
 *   packages/ui/src/components/checkbox.tsx  (Radix checkbox markup)
 *
 * The original backed these facets with Typesense; here they filter the
 * inlined recipe array. The markup and classes are the same.
 */

import { escapeHtml, labelize } from '../format.js'
import { facetIndex, searchRecipes } from '../model.js'
import { icon } from '../icons.js'
import { renderRecipeGrid } from './layout.js'

const CHECKBOX =
  'peer border-input dark:bg-input/30 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground dark:data-[state=checked]:bg-primary data-[state=checked]:border-primary focus-visible:border-ring focus-visible:ring-ring/50 size-4 shrink-0 rounded-[4px] border shadow-xs transition-shadow outline-none focus-visible:ring-[3px]'

const TOGGLE_BASE =
  'rounded-full px-4 py-1.5 font-body text-xs font-semibold tracking-wide transition-colors'
const TOGGLE_ON = 'bg-charcoal text-white'
const TOGGLE_OFF = 'bg-charcoal/5 text-charcoal/70 hover:bg-charcoal/10'

/** category-toggle.tsx — single-select radio group. */
function renderCategoryToggle(options, selected) {
  const button = (value, label, on) =>
    `<button type="button" role="radio" aria-checked="${on}" data-category="${escapeHtml(value)}" class="${TOGGLE_BASE} ${on ? TOGGLE_ON : TOGGLE_OFF}">${escapeHtml(label)}</button>`

  return `<div class="flex gap-2" role="radiogroup" aria-label="Category filter">
      ${button('', 'All', selected.length === 0)}
      ${options.map((o) => button(o.value, labelize(o.value), selected.includes(o.value))).join('')}
    </div>`
}

/** checkbox.tsx — Radix renders a button with data-state. */
function renderCheckbox(checked, label) {
  const indicator = checked
    ? `<span data-slot="checkbox-indicator" class="grid place-content-center text-current transition-none">${icon('check', 'size-3.5')}</span>`
    : ''
  return `<span data-slot="checkbox" role="checkbox" aria-checked="${checked}" aria-label="${escapeHtml(label)}" data-state="${checked ? 'checked' : 'unchecked'}" class="${CHECKBOX}">${indicator}</span>`
}

/** faceted-filter-group.tsx — collapsible, open by default. */
function renderFacetGroup(facet, selected) {
  const rows = facet.values
    .map(
      ({ value, count }) => `
      <label data-facet="${escapeHtml(facet.key)}" data-value="${escapeHtml(value)}"
             class="flex cursor-pointer items-center gap-2.5 rounded px-1 py-0.5 hover:bg-charcoal/3">
        ${renderCheckbox(selected.includes(value), labelize(value))}
        <span class="font-body text-sm text-charcoal/70">${escapeHtml(labelize(value))}<span class="ml-1 text-charcoal/40">${count}</span></span>
      </label>`,
    )
    .join('')

  return `<div data-state="open">
      <button type="button" data-facet-toggle class="flex w-full items-center justify-between py-2 font-body text-xs font-semibold uppercase tracking-[2px] text-charcoal/70 hover:text-charcoal">
        <span>${escapeHtml(facet.label)}</span>
        ${icon('chevron-down', 'size-4 transition-transform duration-200')}
      </button>
      <div data-facet-body><div class="flex flex-col gap-2 pb-3 pt-1">${rows}</div></div>
    </div>`
}

/** filter-sidebar.tsx */
function renderSidebar(facets, state) {
  const category = facets.find((f) => f.key === 'category')
  const groups = facets.filter((f) => f.key !== 'category')

  return `<aside class="space-y-1 hidden w-[260px] shrink-0 lg:block">
      ${
        category
          ? `<div class="pb-3">
              <h3 class="pb-2 font-body text-xs font-semibold uppercase tracking-[2px] text-charcoal/70">Category</h3>
              ${renderCategoryToggle(category.values, state.category ?? [])}
            </div>`
          : ''
      }
      <div class="space-y-0 divide-y divide-charcoal/8">
        ${groups.map((facet) => renderFacetGroup(facet, state[facet.key] ?? [])).join('')}
      </div>
    </aside>`
}

export function renderSearch(recipes, state) {
  const results = searchRecipes(recipes, state)
  const facets = facetIndex(recipes)
  const active = (state.q ? 1 : 0) + facets.reduce((n, f) => n + (state[f.key] ?? []).length, 0)

  return `<div class="mx-auto max-w-[var(--max-width)] px-6 pt-8 pb-20 md:px-8">
      <div class="mb-8">
        <h1 class="font-display text-[clamp(28px,4vw,40px)] font-extrabold text-charcoal">Recipes</h1>
        <div class="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <input id="search-input" type="search" autocomplete="off"
                 placeholder="Search by name, ingredient, or technique&hellip;"
                 value="${escapeHtml(state.q ?? '')}"
                 class="sm:flex-1 min-h-[44px] rounded-full border border-charcoal/12 bg-white px-5 py-2.5 font-body text-base text-charcoal shadow-sm outline-none transition-colors placeholder:text-charcoal/40 focus:border-pink">
        </div>
      </div>

      <div class="flex gap-10">
        ${renderSidebar(facets, state)}
        <div class="min-w-0 flex-1">
          <div class="mb-6 flex items-center justify-between">
            <p class="text-xs font-medium text-charcoal/65">${results.length} ${results.length === 1 ? 'recipe' : 'recipes'}</p>
            ${active > 0 ? '<button id="clear-filters" type="button" class="text-xs font-semibold uppercase tracking-[1.5px] text-pink transition-colors hover:text-pink-dark">Clear all</button>' : ''}
          </div>
          ${renderRecipeGrid(results)}
        </div>
      </div>
    </div>`
}
