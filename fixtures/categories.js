/**
 * Browse categories.
 *
 * The first eight are `homeBrowseCards` from the original site's
 * `features/recipes/lib/browse.ts`, in its order, with its labels and images —
 * the home grid has to match it card for card. `Asian` has no recipes in this
 * collection; it appeared on the original home page regardless, so it stays.
 *
 * Categories cut across facets by design: `Italian` is a cuisine, `Desserts` a
 * course, `Baking` a method, `Vegetarian` a restriction.
 */

export const CATEGORIES = [
  { slug: 'mains', label: 'Mains', facet: 'courses', value: 'mains', image: '/images/categories/mains.webp', featured: true },
  { slug: 'desserts', label: 'Desserts', facet: 'courses', value: 'desserts', image: '/images/categories/desserts.webp', featured: true },
  { slug: 'breakfast', label: 'Breakfast & Brunch', facet: 'courses', value: 'breakfast_and_brunch', image: '/images/categories/breakfast.webp', featured: true },
  { slug: 'italian', label: 'Italian', facet: 'cuisines', value: 'italian', image: '/images/categories/italian.webp', featured: true },
  { slug: 'asian', label: 'Asian', facet: 'cuisines', value: 'asian', image: '/images/categories/asian.webp', featured: true },
  { slug: 'baking', label: 'Baking', facet: 'methods', value: 'baking', image: '/images/categories/baking.webp', featured: true },
  { slug: 'grilling', label: 'Grilling', facet: 'methods', value: 'grilling', image: '/images/categories/grilling.webp', featured: true },
  { slug: 'vegetarian', label: 'Vegetarian', facet: 'restrictions', value: 'vegetarian', image: '/images/categories/vegetarian.webp', featured: true },

  // Reachable from recipe tags and search, but not shown on the home grid.
  { slug: 'sides', label: 'Sides', facet: 'courses', value: 'sides' },
  { slug: 'sauces', label: 'Condiments & Sauces', facet: 'courses', value: 'condiments_and_sauces' },
  { slug: 'frying', label: 'Frying', facet: 'methods', value: 'frying' },
  { slug: 'stovetop', label: 'Stovetop', facet: 'methods', value: 'stovetop' },
  { slug: 'no-cook', label: 'No Cook', facet: 'methods', value: 'no_cook' },
  { slug: 'european', label: 'European', facet: 'cuisines', value: 'european' },
  { slug: 'north-american', label: 'North American', facet: 'cuisines', value: 'north_american' },
  { slug: 'central-american', label: 'Central American', facet: 'cuisines', value: 'central_american' },
  { slug: 'gluten-free', label: 'Gluten Free', facet: 'restrictions', value: 'gluten_free' },
  { slug: 'entertaining', label: 'Entertaining', facet: 'occasions', value: 'entertaining' },
  { slug: 'everyday', label: 'Everyday', facet: 'occasions', value: 'everyday' },
]
