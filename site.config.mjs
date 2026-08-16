/**
 * The one definition of the site's origin and its route list.
 *
 * Three places need these: the app (canonical links, OG tags, JSON-LD), the
 * prerenderer, and the sitemap writer. They previously each held a copy, so
 * adding a route or changing the domain left the others silently stale. Plain
 * `.mjs` so build scripts and TypeScript can both import it.
 */

export const SITE_URL = 'https://eatyeet.com'

/** Routes with no dynamic segment, in the order they should be crawled. */
export const STATIC_PATHS = ['/', '/recipes', '/browse', '/search']

/**
 * Every path to prerender, given the generated recipe index.
 *
 * `/search` is prerendered once. Cloudflare Pages selects files by path, not
 * query string, so one document serves every `?courses=…` variant — which is
 * why the search page must render its unfiltered state on the first client
 * pass. See the note in src/routes/search.tsx.
 */
export function allPaths(index) {
  return [...STATIC_PATHS, ...index.map((recipe) => `/recipes/${recipe.slug}`)]
}
