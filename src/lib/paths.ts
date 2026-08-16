/**
 * Every URL the site prerenders. Imported by vite.config.ts, so it must stay
 * dependency-free and readable from Node before the app is built.
 *
 * The shape matches the original site exactly — `/recipes/<slug>` detail pages
 * under a `/recipes` index, with `/browse` and `/search` alongside. The archive
 * briefly had `/c/<slug>` category pages; those were never on the original and
 * are gone, because nineteen near-duplicate listing pages compete with the
 * recipe pages they link to.
 */

import index from '../generated/index.json'

export const STATIC_PATHS = ['/', '/recipes', '/browse', '/search']

export const RECIPE_PATHS = (index as Array<{ slug: string }>).map((r) => `/recipes/${r.slug}`)

export const ALL_PATHS = [...STATIC_PATHS, ...RECIPE_PATHS]

/** Canonical origin. Used for canonical links, OG tags, sitemap, and JSON-LD. */
export const SITE_URL = 'https://eatyeet.com'
