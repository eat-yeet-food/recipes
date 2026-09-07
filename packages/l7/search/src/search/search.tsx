/**
 * Search page feature: local facet filtering, desktop rail, and mobile
 * disclosure backed by the generated recipe index.
 */

import { useState } from 'react'

import { ChevronDown } from 'lucide-react'
import { RecipeGrid } from '@eat-yeet/l6-ui-catalog/cards'
import { Checkbox } from '@eat-yeet/l5-ui-primitives/primitives/checkbox'
import { labelize } from '@eat-yeet/l2-recipe-domain/format'
import {
  FACET_KEYS,
  emptySearch,
  facetIndex,
  searchRecipes,
  type FacetKey,
  type SearchState,
} from '@eat-yeet/l2-recipe-domain/search'
import type { RecipeSummary } from '@eat-yeet/l1-recipe-model/recipes'

const TOGGLE_BASE =
  'control-focus min-h-11 rounded-control px-4 py-2 font-body text-xs font-semibold tracking-wide transition-colors'
const TOGGLE_ON = 'bg-ink text-white'
const TOGGLE_OFF = 'bg-brand text-ink hover:bg-ink hover:text-white'

/** faceted-filter-group.tsx — collapsible, open by default. */
export function FacetGroup({
  facet,
  selected,
  onToggle,
}: {
  facet: { key: string; label: string; values: Array<{ value: string; count: number }> }
  selected: string[]
  onToggle: (value: string) => void
}) {
  const [open, setOpen] = useState(true)

  return (
    <div data-state={open ? 'open' : 'closed'}>
      <button
        type="button"
        data-facet-toggle
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="control-focus flex w-full items-center justify-between py-2 font-body text-xs font-semibold uppercase tracking-[2px] text-ink/70 hover:text-ink"
      >
        <span>{facet.label}</span>
        <ChevronDown
          className={`size-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      <div data-facet-body hidden={!open}>
        <div className="flex flex-col gap-2 pb-3 pt-1">
          {facet.values.map(({ value }) => (
            <label
              key={value}
              data-facet={facet.key}
              data-value={value}
              className="flex min-h-filter-row cursor-pointer items-center gap-2.5 rounded-filter px-1 py-0.5 hover:bg-ink/3"
            >
              <Checkbox
                size="compact"
                checked={selected.includes(value)}
                aria-label={labelize(value)}
                onCheckedChange={() => onToggle(value)}
              />
              <span className="font-body text-sm text-ink/70">
                {labelize(value)}
              </span>
            </label>
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * filter-sidebar.tsx's contents, shared by the desktop rail and the mobile
 * disclosure so the two cannot drift apart.
 */
function Filters({
  recipes,
  state,
  onToggle,
  onCategory,
}: {
  recipes: RecipeSummary[]
  state: SearchState
  onToggle: (key: FacetKey, value: string) => void
  onCategory: (value: string) => void
}) {
  const facets = facetIndex(recipes)
  const category = facets.find((f) => f.key === 'category')
  const groups = facets.filter((f) => f.key !== 'category')

  return (
    <>
      {category && (
        <div className="pb-3">
          <h3 className="pb-2 font-body text-xs font-semibold uppercase tracking-[2px] text-ink/70">
            Category
          </h3>
          <div className="flex gap-2" role="radiogroup" aria-label="Category filter">
            {[
              { value: '', label: 'All' },
              ...category.values.map((o) => ({ value: o.value, label: labelize(o.value) })),
            ].map((option) => {
              const on = option.value
                ? (state.category ?? []).includes(option.value)
                : (state.category ?? []).length === 0
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  data-category={option.value}
                  onClick={() => onCategory(option.value)}
                  className={`${TOGGLE_BASE} ${on ? TOGGLE_ON : TOGGLE_OFF}`}
                >
                  {option.label}
                </button>
              )
            })}
          </div>
        </div>
      )}
      <div className="space-y-0 divide-y divide-ink/8">
        {groups.map((facet) => (
          <FacetGroup
            key={facet.key}
            facet={facet}
            selected={state[facet.key as FacetKey] ?? []}
            onToggle={(value) => onToggle(facet.key as FacetKey, value)}
          />
        ))}
      </div>
    </>
  )
}

export function SearchPage({
  recipes,
  state,
  onChange,
}: {
  recipes: RecipeSummary[]
  state: SearchState
  onChange: (next: SearchState) => void
}) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const results = searchRecipes(recipes, state)
  const active = (state.q ? 1 : 0) + FACET_KEYS.reduce((n, k) => n + (state[k]?.length ?? 0), 0)

  const toggle = (key: FacetKey, value: string) => {
    const selected = state[key] ?? []
    onChange({
      ...state,
      [key]: selected.includes(value)
        ? selected.filter((v) => v !== value)
        : [...selected, value],
    })
  }

  const setCategory = (value: string) =>
    onChange({ ...state, category: value ? [value] : [] })

  return (
    <div className="mx-auto max-w-[var(--max-width)] px-6 pt-8 pb-20 md:px-8">
      <div className="mb-8 flex items-center justify-between gap-4">
        <h1 className="min-w-0 font-display text-[clamp(28px,4vw,40px)] font-extrabold text-ink">
          Search Recipes
        </h1>
        {/* The desktop sidebar is hidden below lg; phones use this disclosure. */}
        <button
          type="button"
          data-mobile-filters
          aria-expanded={mobileOpen}
          aria-controls="mobile-filters"
          onClick={() => setMobileOpen((open) => !open)}
          className={`${TOGGLE_BASE} ${TOGGLE_OFF} inline-flex shrink-0 items-center gap-2 lg:hidden`}
        >
          Filters
          {active > 0 && <span className="text-muted-foreground">{active}</span>}
          <ChevronDown
            className={`size-4 transition-transform duration-200 ${mobileOpen ? 'rotate-180' : ''}`}
          />
        </button>
      </div>
      {/* Mount the mobile controls only while open to avoid duplicate controls
          and markup alongside the desktop rail in prerendered pages. */}
      {mobileOpen && (
        <div id="mobile-filters" className="mb-6 space-y-1 lg:hidden">
          <Filters recipes={recipes} state={state} onToggle={toggle} onCategory={setCategory} />
        </div>
      )}

      <div className="flex gap-10">
        <aside className="space-y-1 hidden w-[260px] shrink-0 lg:block">
          <Filters recipes={recipes} state={state} onToggle={toggle} onCategory={setCategory} />
        </aside>

        <div className="min-w-0 flex-1">
          <div className="mb-6 flex items-center justify-between">
            {/* One interpolation, not two: adjacent JSX expressions become
                separate text nodes, and the browser shapes each run on its own. */}
            <p className="text-xs font-medium text-ink/65">
              {`${results.length} ${results.length === 1 ? 'recipe' : 'recipes'}`}
            </p>
            {active > 0 && (
              <button
                id="clear-filters"
                type="button"
                onClick={() => onChange(emptySearch())}
                className="text-xs font-semibold uppercase tracking-[1.5px] text-ink transition-colors hover:text-ink"
              >
                Clear all
              </button>
            )}
          </div>
          <RecipeGrid recipes={results} />
        </div>
      </div>
    </div>
  )
}
