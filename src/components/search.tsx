/**
 * Search page, from:
 *   containers/search-container.tsx
 *   components/filter-sidebar.tsx
 *   components/faceted-filter-group.tsx
 *   components/category-toggle.tsx
 *   packages/ui/src/components/checkbox.tsx  (Radix checkbox markup)
 *
 * The original backed these facets with Typesense; these filter the local
 * index. The markup and classes are the same.
 */

import { useState } from 'react'

import { Icon } from './icons'
import { RecipeGrid } from './layout'
import { labelize } from '../lib/format'
import {
  FACET_KEYS,
  emptySearch,
  facetIndex,
  searchRecipes,
  type FacetKey,
  type SearchState,
} from '../lib/model'
import { INDEX } from '../lib/recipes'

const CHECKBOX =
  'peer border-input dark:bg-input/30 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground dark:data-[state=checked]:bg-primary data-[state=checked]:border-primary focus-visible:border-ring focus-visible:ring-ring/50 size-4 shrink-0 rounded-[4px] border shadow-xs transition-shadow outline-none focus-visible:ring-[3px]'

const TOGGLE_BASE =
  'rounded-full px-4 py-1.5 font-body text-xs font-semibold tracking-wide transition-colors'
const TOGGLE_ON = 'bg-charcoal text-white'
const TOGGLE_OFF = 'bg-charcoal/5 text-charcoal/70 hover:bg-charcoal/10'

/** checkbox.tsx — rendered as a native input while preserving Radix data attrs. */
function Checkbox({
  checked,
  label,
  onChange,
}: {
  checked: boolean
  label: string
  onChange: () => void
}) {
  return (
    <span className="relative grid size-4 shrink-0 place-content-center">
      <input
        data-slot="checkbox"
        type="checkbox"
        aria-label={label}
        checked={checked}
        onChange={onChange}
        data-state={checked ? 'checked' : 'unchecked'}
        className={`${CHECKBOX} absolute inset-0 m-0 appearance-none`}
      />
      {checked && (
        <span
          data-slot="checkbox-indicator"
          className="pointer-events-none absolute inset-0 grid place-content-center text-white transition-none"
        >
          <Icon name="check" className="size-3.5" />
        </span>
      )}
    </span>
  )
}

/** faceted-filter-group.tsx — collapsible, open by default. */
function FacetGroup({
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
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between py-2 font-body text-xs font-semibold uppercase tracking-[2px] text-charcoal/70 hover:text-charcoal"
      >
        <span>{facet.label}</span>
        <Icon
          name="chevron-down"
          className={`size-4 transition-transform duration-200${open ? ' rotate-180' : ''}`}
        />
      </button>
      <div data-facet-body hidden={!open}>
        <div className="flex flex-col gap-2 pb-3 pt-1">
          {facet.values.map(({ value, count }) => (
            <label
              key={value}
              data-facet={facet.key}
              data-value={value}
              className="flex cursor-pointer items-center gap-2.5 rounded px-1 py-0.5 hover:bg-charcoal/3"
            >
              <Checkbox
                checked={selected.includes(value)}
                label={labelize(value)}
                onChange={() => onToggle(value)}
              />
              <span className="font-body text-sm text-charcoal/70">
                {labelize(value)}
                <span className="ml-1 text-charcoal/40">{count}</span>
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
  state,
  onToggle,
  onCategory,
}: {
  state: SearchState
  onToggle: (key: FacetKey, value: string) => void
  onCategory: (value: string) => void
}) {
  const facets = facetIndex(INDEX)
  const category = facets.find((f) => f.key === 'category')
  const groups = facets.filter((f) => f.key !== 'category')

  return (
    <>
      {category && (
        <div className="pb-3">
          <h3 className="pb-2 font-body text-xs font-semibold uppercase tracking-[2px] text-charcoal/70">
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
      <div className="space-y-0 divide-y divide-charcoal/8">
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
  state,
  onChange,
}: {
  state: SearchState
  onChange: (next: SearchState) => void
}) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const results = searchRecipes(INDEX, state)
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
      <div className="mb-8">
        <h1 className="font-display text-[clamp(28px,4vw,40px)] font-extrabold text-charcoal">
          Recipes
        </h1>
      </div>

      {/* search-container.tsx:202 — a plain flex row, and a sidebar that is
          hidden below lg. `lg:flex`/`lg:w-[260px]` are not in the compiled
          stylesheet, so they style nothing and the sidebar stacks on top. */}
      {/* search-container.tsx:163-174 kept the filters reachable below lg via
          MobileFilterSheet. That Radix sheet is not ported, so this is the same
          filter content behind a disclosure — without it the sidebar's `hidden`
          leaves phones with no way to filter at all. */}
      <div className="mb-6 lg:hidden">
        <button
          type="button"
          data-mobile-filters
          aria-expanded={mobileOpen}
          aria-controls="mobile-filters"
          onClick={() => setMobileOpen((open) => !open)}
          className={`${TOGGLE_BASE} ${TOGGLE_OFF} inline-flex min-h-[44px] items-center gap-2`}
        >
          Filters
          {active > 0 && <span className="text-charcoal/40">{active}</span>}
          <Icon
            name="chevron-down"
            className={`size-4 transition-transform duration-200${mobileOpen ? ' rotate-180' : ''}`}
          />
        </button>
        {/* Mounted only while open. Rendering it alongside the desktop rail
            would put two copies of every checkbox and category radio in the
            document at all times — duplicated controls for assistive tech, and
            duplicated markup in every prerendered page. */}
        {mobileOpen && (
          <div id="mobile-filters" className="mt-4 space-y-1">
            <Filters state={state} onToggle={toggle} onCategory={setCategory} />
          </div>
        )}
      </div>

      <div className="flex gap-10">
        <aside className="space-y-1 hidden w-[260px] shrink-0 lg:block">
          <Filters state={state} onToggle={toggle} onCategory={setCategory} />
        </aside>

        <div className="min-w-0 flex-1">
          <div className="mb-6 flex items-center justify-between">
            {/* One interpolation, not two: adjacent JSX expressions become
                separate text nodes, and the browser shapes each run on its own,
                which shifts the glyphs by a subpixel against the original. */}
            <p className="text-xs font-medium text-charcoal/65">
              {`${results.length} ${results.length === 1 ? 'recipe' : 'recipes'}`}
            </p>
            {active > 0 && (
              <button
                id="clear-filters"
                type="button"
                onClick={() => onChange(emptySearch())}
                className="text-xs font-semibold uppercase tracking-[1.5px] text-pink transition-colors hover:text-pink-dark"
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
