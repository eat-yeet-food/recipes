const DPIZZAOVEN_CATEGORIES = [
  { slug: 'pizzas', label: 'Pizzas', facet: 'courses', value: 'pizzas', image: '/images/ny-style.png', featured: true },
  { slug: 'doughs', label: 'Doughs', facet: 'courses', value: 'doughs', image: '/images/sourdough-pizza-dough.jpg', featured: true },
  { slug: 'sauces', label: 'Sauces', facet: 'courses', value: 'sauces', image: '/images/pizza-sauce.jpg', featured: true },
  { slug: 'desserts', label: 'Desserts', facet: 'courses', value: 'desserts', image: '/images/brown-butter-chocolate-chip-cookies.jpg', featured: true },
  { slug: 'home-oven', label: 'Home Oven', facet: 'methods', value: 'home-oven', image: '/images/dave-hero.jpg', featured: true },
  { slug: 'baking-steel', label: 'Baking Steel', facet: 'methods', value: 'baking-steel', image: '/images/cast-iron-pan-pizza.jpg', featured: true },
  { slug: 'make-ahead', label: 'Make Ahead', facet: 'occasions', value: 'make-ahead', image: '/images/72-hour-cold-ferment-dough.jpg', featured: true },
  { slug: 'weeknight', label: 'Weeknight', facet: 'occasions', value: 'weeknight', image: '/images/tavern-style.webp', featured: true },
  { slug: 'ny', label: 'NY Style', facet: 'cuisines', value: 'ny' },
  { slug: 'detroit', label: 'Detroit Style', facet: 'cuisines', value: 'detroit' },
  { slug: 'sicilian', label: 'Sicilian', facet: 'cuisines', value: 'sicilian' },
  { slug: 'tavern', label: 'Tavern Style', facet: 'cuisines', value: 'tavern' },
  { slug: 'pan-pizza', label: 'Pan Pizza', facet: 'methods', value: 'pan-pizza' },
  { slug: 'stand-mixer', label: 'Stand Mixer', facet: 'methods', value: 'stand-mixer' },
  { slug: 'no-cook', label: 'No Cook', facet: 'methods', value: 'no-cook' },
  { slug: 'gluten-free', label: 'Gluten Free', facet: 'restrictions', value: 'gluten-free' },
]

export const dpizzaovenApp = {
  id: 'dpizzaoven',
  label: "Dave's Pizza Oven",
  siteName: "Dave's Pizza Oven",
  siteUrl: 'https://dpizzaoven.com',
  cloudflareProject: 'dpizzaoven',
  doppler: { project: 'yeet', config: 'dev' },
  defaultOgImage: '/images/dave-hero.jpg',
  categories: DPIZZAOVEN_CATEGORIES,
  copy: {
    description:
      "Pizza doughs, sauces, home-oven pies, and a few desserts from Dave's Pizza Oven.",
    wordmark: { first: "Dave's", second: 'Oven', background: 'PIZZA' },
    hero: {
      image: '/images/dave-hero.jpg',
      imageAlt: 'A baked pizza on a hot oven deck',
      tagline: 'Home-oven pizza, dough, sauce, and dessert recipes.',
      cta: 'Start Baking',
    },
    home: {
      eyebrow: 'From the Oven',
      latestTitle: 'Latest Recipes',
      browseTitle: 'Browse by Style',
    },
    pages: {
      homeTitle: "Dave's Pizza Oven",
      recipesTitle: "All Recipes | Dave's Pizza Oven",
      recipesHeading: 'All Recipes',
      recipesDescription:
        'Every pizza, dough, sauce, and dessert recipe in the Dave Pizza Oven collection.',
      recipesIntro: 'Pizza, dough, sauce, and dessert recipes, newest first.',
      browseTitle: "Browse Recipes | Dave's Pizza Oven",
      browseHeading: 'Browse Recipes',
      browseDescription:
        'Browse pizza recipes by style, dough, oven setup, timing, and dietary need.',
      browseIntro: 'Explore the collection by style, method, and make-ahead timing.',
      searchTitle: "Search Recipes | Dave's Pizza Oven",
      searchDescription:
        'Search and filter pizza, dough, sauce, and dessert recipes.',
      recipeFallbackTitle: "Recipe | Dave's Pizza Oven",
      recipeTitleSuffix: "Dave's Pizza Oven",
    },
    jsonLdAuthor: 'Dave Hale',
  },
  staticPaths: ['/', '/recipes', '/browse', '/search'],
  sitemapStaticPaths: ['/', '/recipes', '/browse'],
  robotsDisallow: ['/search'],
  previewPaths: ['', 'recipes', 'search', 'browse', 'recipes/tavern-style'],
  paths: {
    fixtures: 'apps/dpizzaoven/fixtures/recipes',
    publicDir: 'apps/dpizzaoven/public',
    imagesDir: 'apps/dpizzaoven/public/images',
    generatedDir: 'apps/dpizzaoven/generated',
  },
}
