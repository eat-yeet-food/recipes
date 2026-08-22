/**
 * Taxonomy, filtering, and search over the recipe set.
 * Runs at prerender time and again in the browser as filters change.
 */

import type { RecipeSummary } from './recipes'

/**
 * Facets exposed as search filters. `category` here is the recipe's
 * savory/sweet kind (the DB's `category_type`); it is unrelated to the curated
 * browse categories in fixtures/categories.js, which cut across these facets.
 */
export const FACETS = [
  { key: 'category', label: 'Type' },
  { key: 'courses', label: 'Course' },
  { key: 'cuisines', label: 'Cuisine' },
  { key: 'methods', label: 'Method' },
  { key: 'restrictions', label: 'Diet' },
  { key: 'occasions', label: 'Occasion' },
] as const

export type FacetKey = (typeof FACETS)[number]['key']

export const FACET_KEYS = FACETS.map((f) => f.key) as FacetKey[]

export type Filters = Record<FacetKey, string[]>
export type SearchParams = Partial<Record<FacetKey | 'q', string>>
export interface SearchState extends Filters {
  q: string
}

/** Facet values are single-valued for `category`, arrays elsewhere. */
function valuesOf(recipe: RecipeSummary, key: FacetKey): string[] {
  const value = recipe[key]
  if (value == null || value === '') return []
  return Array.isArray(value) ? value : [value]
}

export function emptyFilters(): Filters {
  return FACET_KEYS.reduce((filters, key) => {
    filters[key] = []
    return filters
  }, {} as Filters)
}

export const emptySearch = (): SearchState => ({ q: '', ...emptyFilters() })

/** Distinct values per facet with counts, ordered by frequency then name. */
export function facetIndex(recipes: RecipeSummary[]) {
  return FACETS.map(({ key, label }) => {
    const counts = new Map<string, number>()
    for (const recipe of recipes) {
      for (const value of valuesOf(recipe, key)) {
        counts.set(value, (counts.get(value) ?? 0) + 1)
      }
    }
    const values = [...counts.entries()]
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value))
    return { key, label, values }
  }).filter((facet) => facet.values.length > 0)
}

/**
 * Text match: every whitespace-separated term must appear somewhere in the
 * recipe's search text. Thirteen recipes doesn't warrant an index.
 */
export function matchesQuery(recipe: RecipeSummary, query: string): boolean {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (terms.length === 0) return true
  return terms.every((term) => recipe.searchText.includes(term))
}

/** Within a facet the selected values are OR'd; across facets they are AND'd. */
function matchesFilters(recipe: RecipeSummary, filters: Partial<Filters>): boolean {
  return FACET_KEYS.every((key) => {
    const selected = filters[key] ?? []
    if (selected.length === 0) return true
    const values = valuesOf(recipe, key)
    return selected.some((value) => values.includes(value))
  })
}

export function searchRecipes(
  recipes: RecipeSummary[],
  { q = '', ...filters }: Partial<SearchState> = {},
): RecipeSummary[] {
  return recipes.filter((r) => matchesQuery(r, q) && matchesFilters(r, filters))
}

/** The taxonomy chips shown on a recipe page. */
export function recipeTags(recipe: RecipeSummary) {
  return FACET_KEYS.flatMap((key) => valuesOf(recipe, key).map((value) => ({ key, value })))
}

/** Recipes carrying a curated category's facet value. */
export function recipesInCategory(
  recipes: RecipeSummary[],
  category: { facet: string; value: string },
) {
  return recipes.filter((r) => valuesOf(r, category.facet as FacetKey).includes(category.value))
}
