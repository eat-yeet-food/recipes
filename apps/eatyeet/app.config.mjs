const EAT_YEET_CATEGORIES = [
  { slug: 'mains', label: 'Mains', facet: 'courses', value: 'mains', image: '/images/categories/mains.webp', featured: true },
  { slug: 'desserts', label: 'Desserts', facet: 'courses', value: 'desserts', image: '/images/categories/desserts.webp', featured: true },
  { slug: 'breakfast', label: 'Breakfast & Brunch', facet: 'courses', value: 'breakfast_and_brunch', image: '/images/categories/breakfast.webp', featured: true },
  { slug: 'italian', label: 'Italian', facet: 'cuisines', value: 'italian', image: '/images/categories/italian.webp', featured: true },
  { slug: 'asian', label: 'Asian', facet: 'cuisines', value: 'asian', image: '/images/categories/asian.webp', featured: true },
  { slug: 'baking', label: 'Baking', facet: 'methods', value: 'baking', image: '/images/categories/baking.webp', featured: true },
  { slug: 'grilling', label: 'Grilling', facet: 'methods', value: 'grilling', image: '/images/categories/grilling.webp', featured: true },
  { slug: 'vegetarian', label: 'Vegetarian', facet: 'restrictions', value: 'vegetarian', image: '/images/categories/vegetarian.webp', featured: true },
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

export const app = {
  id: 'eatyeet',
  isDefault: true,
  label: 'Eat / Yeet',
  siteName: 'Eat / Yeet',
  siteUrl: 'https://eatyeet.com',
  cloudflareProject: 'eatyeet',
  doppler: { project: 'yeet', config: 'dev' },
  defaultOgImage: '/images/hero-donuts.jpg',
  categories: EAT_YEET_CATEGORIES,
  copy: {
    description:
      'A focused recipe archive for breads, pasta, donuts, weeknight mains, and baking projects.',
    wordmark: { first: 'Eat', second: 'Yeet', background: 'YEET' },
    hero: {
      image: '/images/hero-donuts.jpg',
      imageAlt: 'Pink glazed donuts with colorful sprinkles',
      tagline: 'Eat the best. Yeet the rest.',
      cta: "Let's Eat",
    },
    home: {
      eyebrow: 'Top Eats',
      latestTitle: 'Latest Recipes',
      browseEyebrow: 'Explore',
      browseTitle: 'Browse by Category',
    },
    pages: {
      homeTitle: 'Eat / Yeet',
      recipesTitle: 'All Recipes | Eat / Yeet',
      recipesHeading: 'All Recipes',
      recipesDescription:
        'Every recipe in the collection — breads, pizza, pasta, donuts, cookies, and more. Tested, refined, and written without the filler.',
      recipesIntro: 'Every recipe in the collection, newest first.',
      browseTitle: 'Browse Recipes | Eat / Yeet',
      browseHeading: 'Browse Recipes',
      browseDescription:
        'Browse recipes by course, cuisine, cooking method, and dietary preference. Find your next meal without the clutter.',
      browseIntro: 'Explore our collection by course, cuisine, cooking method, or dietary preference.',
      searchTitle: 'Search Recipes | Eat / Yeet',
      searchDescription:
        'Search and filter recipes by cuisine, course, method, dietary restrictions, and more.',
      recipeFallbackTitle: 'Recipe | Eat / Yeet',
      recipeTitleSuffix: 'Eat / Yeet',
    },
    jsonLdAuthor: 'Patrick Hogan',
  },
  staticPaths: ['/', '/recipes', '/browse', '/search'],
  sitemapStaticPaths: ['/', '/recipes', '/browse'],
  robotsDisallow: ['/search'],
  previewPaths: ['', 'recipes', 'search', 'browse', 'recipes/artisan-new-york-pizza'],
  paths: {
    fixtures: 'apps/eatyeet/fixtures/recipes',
    publicDir: 'apps/eatyeet/public',
    imagesDir: 'apps/eatyeet/public/images',
    generatedDir: 'apps/eatyeet/generated',
  },
}

export default app
