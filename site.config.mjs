/**
 * Active app registry.
 *
 * App-owned copy, categories, paths, and deploy metadata live beside each app
 * under `apps/<app>/app.config.mjs`. This module discovers those app-owned
 * configs by convention and owns only active app selection plus derived exports.
 */

import { readdirSync } from 'node:fs'

const APP_CONFIG_FILE = 'app.config.mjs'
const APP_ROOT = new URL('./apps/', import.meta.url)

async function discoverApps() {
  const appDirs = readdirSync(APP_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()

  const discoveredApps = {}

  for (const appDir of appDirs) {
    const module = await import(new URL(`./${appDir}/${APP_CONFIG_FILE}`, APP_ROOT).href)
    const app = module.app ?? module.default

    if (!app || typeof app !== 'object') {
      throw new Error(`App config for ${appDir} must export an app object`)
    }

    if (app.id !== appDir) {
      throw new Error(`App config id "${app.id}" must match apps/${appDir}`)
    }

    if (discoveredApps[app.id]) {
      throw new Error(`Duplicate app id "${app.id}"`)
    }

    discoveredApps[app.id] = app
  }

  return discoveredApps
}

const APPS = await discoverApps()

const defaultApps = Object.values(APPS).filter((app) => app.isDefault)

if (defaultApps.length > 1) {
  throw new Error(`Only one app config may set isDefault: ${defaultApps.map((app) => app.id).join(', ')}`)
}

export const DEFAULT_APP_ID = defaultApps[0]?.id ?? Object.keys(APPS)[0]

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
export function allPaths(index, articles = []) {
  return [
    ...STATIC_PATHS,
    ...index.map((recipe) => `/recipes/${recipe.slug}`),
    ...articles.map((article) => `/learn/${article.slug}`),
  ]
}

/** Crawlable URLs for sitemap.xml. Interactive/noindex pages stay out. */
export function sitemapPaths(index, articles = []) {
  return [
    ...SITEMAP_STATIC_PATHS,
    ...index.map((recipe) => ({ loc: `/recipes/${recipe.slug}`, lastmod: recipe.created })),
    ...articles.map((article) => ({ loc: `/learn/${article.slug}`, lastmod: article.created })),
  ].map((entry) => (typeof entry === 'string' ? { loc: entry } : entry))
}
