/**
 * The recipe model, shared by every route.
 *
 * `INDEX` is the whole collection minus bodies — cards, facets, and search all
 * run off it. A recipe's body is fetched per slug through `loadRecipe`, which
 * Vite code-splits into one chunk per recipe, so reading one recipe never pulls
 * the other eleven.
 */

import indexJson from '../generated/index.json'

export interface Section {
  title: string
  items: string[]
}

export interface RecipeSummary {
  slug: string
  title: string
  description: string
  category: string
  courses: string[]
  cuisines: string[]
  methods: string[]
  restrictions: string[]
  occasions: string[]
  ingredientTypes: string[]
  prepMinutes: number | null
  cookMinutes: number | null
  totalMinutes: number | null
  yieldAmount: number | string | null
  yieldUnit: string
  image: string
  imageHash: string
  created: string
  searchText: string
}

export interface Recipe extends RecipeSummary {
  equipment: Section[]
  ingredients: Section[]
  steps: Section[]
  notes: string[]
  tips: string[]
}

export const INDEX = indexJson as RecipeSummary[]

const bodies = import.meta.glob<{ default: Recipe }>('../generated/recipes/*.json')

/** Load one recipe's full body. Returns null for an unknown slug. */
export async function loadRecipe(slug: string): Promise<Recipe | null> {
  const load = bodies[`../generated/recipes/${slug}.json`]
  if (!load) return null
  return (await load()).default
}

export const bySlug = (slug: string) => INDEX.find((r) => r.slug === slug)

/**
 * The public URL for a recipe's photo, or '' when it has none.
 *
 * `?v=` is the file's content hash. Photo filenames are stable, so without it
 * replacing a photo leaves its URL unchanged and the edge keeps serving the old
 * bytes — which it did, for hours, after two photos were swapped. Query strings
 * are part of the cache key, so this retires the old bytes on deploy.
 */
export const imageUrl = (recipe: { image: string; imageHash?: string }) =>
  recipe.image ? `/images/${recipe.image}${recipe.imageHash ? `?v=${recipe.imageHash}` : ''}` : ''

/** Newest first, matching the fixture load order. */
export const latest = (count: number) => INDEX.slice(0, count)
