/**
 * Active app registry.
 *
 * App-owned copy, categories, paths, and deploy metadata live beside each app
 * under `apps/<app>/app.config.mjs`. This root module is only the synchronous
 * selection API used by Vite, build scripts, tests, and deploy tooling.
 */

import { dpizzaovenApp } from './apps/dpizzaoven/app.config.mjs'
import { eatyeetApp } from './apps/eatyeet/app.config.mjs'

export const DEFAULT_APP_ID = 'eatyeet'

export const APPS = {
  eatyeet: eatyeetApp,
  dpizzaoven: dpizzaovenApp,
}

function selectedAppId() {
  const bundled = typeof __APP_ID__ === 'string' ? __APP_ID__ : ''
  const env = typeof import.meta.env === 'object' ? import.meta.env : (globalThis.process?.env ?? {})
  if (bundled) return bundled
  return env.APP_ID || DEFAULT_APP_ID
}

export const APP_ID = selectedAppId()
export const ACTIVE_APP = APPS[APP_ID]

if (!ACTIVE_APP) {
  throw new Error(`Unknown APP_ID "${APP_ID}". Expected one of: ${Object.keys(APPS).join(', ')}`)
}

export const SITE_URL = ACTIVE_APP.siteUrl
export const SITE_NAME = ACTIVE_APP.siteName
export const DEFAULT_OG_IMAGE = ACTIVE_APP.defaultOgImage
export const STATIC_PATHS = ACTIVE_APP.staticPaths
export const SITEMAP_STATIC_PATHS = ACTIVE_APP.sitemapStaticPaths
export const ROBOTS_DISALLOW = ACTIVE_APP.robotsDisallow
export const CLOUDFLARE_PROJECT = ACTIVE_APP.cloudflareProject
export const DOPPLER = ACTIVE_APP.doppler
export const PREVIEW_PATHS = ACTIVE_APP.previewPaths
export const APP_PATHS = ACTIVE_APP.paths
export const APP_COPY = ACTIVE_APP.copy
export const APP_CATEGORIES = ACTIVE_APP.categories

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

/** Crawlable URLs for sitemap.xml. Interactive/noindex pages stay out. */
export function sitemapPaths(index) {
  return [
    ...SITEMAP_STATIC_PATHS,
    ...index.map((recipe) => ({ loc: `/recipes/${recipe.slug}`, lastmod: recipe.created })),
  ].map((entry) => (typeof entry === 'string' ? { loc: entry } : entry))
}
