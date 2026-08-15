/**
 * Global search palette, transcribed from
 * features/recipes/components/search-command-palette.tsx and the shadcn
 * Dialog it renders inside (packages/ui/src/components/dialog.tsx).
 *
 * The original queried the API with a debounce; here it filters the inlined
 * recipe array. Opens from the nav search button or Cmd/Ctrl-K.
 */

import { escapeHtml, humanizeMinutes, labelize } from '../format.js'
import { icon } from '../icons.js'

const MIN_QUERY = 2
const MAX_RESULTS = 8

const OVERLAY =
  'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50'

const CONTENT =
  'bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed z-50 grid w-full max-w-[calc(100%-2rem)] duration-200 outline-none ' +
  'gap-0 overflow-hidden border border-border-medium bg-white p-0 shadow-xl ' +
  'max-sm:left-0 max-sm:top-0 max-sm:w-full max-sm:max-w-full max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-none max-sm:border-0 ' +
  'sm:left-[50%] sm:top-[20%] sm:-translate-x-1/2 sm:translate-y-0 sm:rounded-xl sm:max-w-lg'

const KBD =
  'rounded border border-charcoal/10 bg-charcoal/5 px-1.5 py-0.5 font-body text-[10px] text-charcoal/65'

/** The 40px thumbnail beside each hit. */
function resultImage(recipe) {
  const inner = recipe.imageUrl
    ? `<img src="${recipe.imageUrl}" alt="" class="absolute inset-0 size-full object-cover">`
    : `<div class="absolute inset-0 flex items-center justify-center">${icon('utensils-crossed', 'size-4 text-charcoal/15', '1.25')}</div>`
  return `<div class="relative size-10 shrink-0 overflow-hidden rounded-md bg-charcoal/5">${inner}</div>`
}

/** Hits for a query — empty string when the query is too short. */
export function paletteResults(recipes, query) {
  const q = String(query ?? '').trim().toLowerCase()
  if (q.length < MIN_QUERY) return { html: '', count: 0, showFooter: false }

  const hits = recipes.filter((r) => r.searchText.includes(q)).slice(0, MAX_RESULTS)

  if (hits.length === 0) {
    return {
      html: `<div class="px-4 py-8 text-center"><p class="text-sm text-charcoal/65">No recipes found for &ldquo;${escapeHtml(query)}&rdquo;</p></div>`,
      count: 0,
      showFooter: true,
    }
  }

  const rows = hits
    .map((recipe, index) => {
      const time = humanizeMinutes(recipe.totalMinutes)
      const kind = recipe.category ? labelize(recipe.category) : ''
      const meta = [
        time ? `<span class="flex items-center gap-1">${icon('clock', 'size-3')}${escapeHtml(time)}</span>` : '',
        kind ? `<span class="flex items-center gap-1">${icon('utensils-crossed', 'size-3')}${escapeHtml(kind)}</span>` : '',
      ].join('')

      return `<li id="search-result-${escapeHtml(recipe.slug)}" role="option" aria-selected="${index === 0}">
          <button type="button" tabindex="-1" data-palette-hit="${escapeHtml(recipe.slug)}" data-index="${index}"
                  class="flex w-full items-start gap-3 px-4 py-2.5 text-left transition-colors hover:bg-charcoal/3${index === 0 ? ' bg-charcoal/3' : ''}">
            ${resultImage(recipe)}
            <div class="min-w-0 flex-1">
              <p class="truncate font-body text-sm font-medium text-charcoal">${escapeHtml(recipe.title)}</p>
              <div class="mt-0.5 flex gap-3 text-xs text-charcoal/65">${meta}</div>
            </div>
          </button>
        </li>`
    })
    .join('')

  return {
    html: `<ul id="search-results-listbox" role="listbox" class="max-h-[min(60vh,300px)] overflow-y-auto scrollbar-none py-2 sm:max-h-[300px]">${rows}</ul>`,
    count: hits.length,
    showFooter: true,
  }
}

export function renderPaletteFooter(query) {
  return `<div class="border-t px-4 py-2">
      <button type="button" data-palette-all
              class="w-full rounded-md px-3 py-2 text-left font-body text-xs font-medium text-charcoal/65 transition-colors hover:bg-charcoal/3 hover:text-charcoal">
        View all results for &ldquo;${escapeHtml(query)}&rdquo;<span class="ml-1 text-charcoal/65">&rarr;</span>
      </button>
    </div>`
}

/** The dialog shell. Rendered once and toggled; results fill in on input. */
export function renderPalette() {
  return `<div data-palette hidden>
      <div data-palette-overlay data-slot="dialog-overlay" data-state="open" class="${OVERLAY}"></div>
      <div data-slot="dialog-content" data-state="open" role="dialog" aria-modal="true" aria-label="Search recipes" class="${CONTENT}">
        <div data-palette-field class="flex items-center px-4 max-sm:h-14 max-sm:border-b">
          ${icon('search', 'size-4 shrink-0 text-charcoal/50')}
          <input id="palette-input" role="combobox" aria-expanded="false" aria-controls="search-results-listbox"
                 aria-autocomplete="list" autocomplete="off" placeholder="Search recipes..."
                 class="h-12 flex-1 bg-transparent px-3 font-body text-base text-charcoal outline-none placeholder:text-charcoal/50 sm:text-sm">
          <div class="hidden items-center gap-1.5 sm:flex">
            <kbd class="${KBD}">&#8984;K</kbd>
            <kbd class="${KBD}">ESC</kbd>
          </div>
          <button type="button" data-palette-close class="font-body text-sm font-medium text-charcoal/65 transition-colors hover:text-charcoal sm:hidden">Cancel</button>
        </div>
        <div data-palette-body></div>
      </div>
    </div>`
}
