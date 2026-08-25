export interface RecipeVariantSummary {
  id: string
  label: string
  description: string
  prepMinutes: number | null
  cookMinutes: number | null
  totalMinutes: number | null
  yieldAmount: number | string | null
  yieldUnit: string
}

export interface RecipeSummary {
  slug: string
  title: string
  order: number | null
  description: string
  category: string
  defaultVariant: string
  variants: RecipeVariantSummary[]
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

/**
 * The public URL for a recipe's photo, or '' when it has none.
 *
 * `?v=` is the file's content hash. Photo filenames are stable, so without it
 * replacing a photo leaves its URL unchanged and the edge can keep serving
 * stale bytes. Query strings are part of the cache key, so this retires stale
 * bytes.
 */
export const imageUrl = (recipe: { image: string; imageHash?: string }) =>
  recipe.image ? `/images/${recipe.image}${recipe.imageHash ? `?v=${recipe.imageHash}` : ''}` : ''
