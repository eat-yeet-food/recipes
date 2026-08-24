import type { FacetKey } from '@eat-yeet/l2-recipe-domain/search'

export interface Category {
  slug: string
  label: string
  facet: FacetKey
  value: string
  image?: string
  featured?: boolean
}
