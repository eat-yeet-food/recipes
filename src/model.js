/**
 * Taxonomy, filtering, and search over the recipe set.
 * Isomorphic — the same functions run at build time and in the browser.
 */

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
]

export const FACET_KEYS = FACETS.map((f) => f.key)

/** Facet values are single-valued for `category`, arrays elsewhere. */
function valuesOf(recipe, key) {
  const value = recipe[key]
  if (value == null || value === '') return []
  return Array.isArray(value) ? value : [value]
}

export function emptyFilters() {
  return Object.fromEntries(FACET_KEYS.map((key) => [key, []]))
}

/** Distinct values per facet with counts, ordered by frequency then name. */
export function facetIndex(recipes) {
  return FACETS.map(({ key, label }) => {
    const counts = new Map()
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
 * recipe's search text. Twelve recipes doesn't warrant an index.
 */
function matchesQuery(recipe, query) {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (terms.length === 0) return true
  return terms.every((term) => recipe.searchText.includes(term))
}

/** Within a facet the selected values are OR'd; across facets they are AND'd. */
function matchesFilters(recipe, filters) {
  return FACET_KEYS.every((key) => {
    const selected = filters[key] ?? []
    if (selected.length === 0) return true
    const values = valuesOf(recipe, key)
    return selected.some((value) => values.includes(value))
  })
}

export function searchRecipes(recipes, { q = '', ...filters } = {}) {
  return recipes.filter((recipe) => matchesQuery(recipe, q) && matchesFilters(recipe, filters))
}

/** Recipes belonging to a curated category. */
export function recipesInCategory(recipes, category) {
  return recipes.filter((recipe) => valuesOf(recipe, category.facet).includes(category.value))
}

/** Curated categories that actually have recipes, with counts attached. */
export function categoriesWithCounts(recipes, categories) {
  return categories
    .map((category) => ({ ...category, count: recipesInCategory(recipes, category).length }))
    .filter((category) => category.count > 0)
}

/** The taxonomy chips shown on a recipe page. */
export function recipeTags(recipe) {
  return FACET_KEYS.flatMap((key) => valuesOf(recipe, key).map((value) => ({ key, value })))
}
