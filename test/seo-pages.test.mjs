/**
 * SEO/OpenGraph assertions against the prerendered HTML.
 *
 * Unit tests lock the helper contract. This file catches route-level drift:
 * missing canonical links, uncrawlable search metadata, and recipe JSON-LD that
 * only exists after the route is rendered.
 */

import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import {
  APP_CATEGORIES,
  APP_COPY,
  DEFAULT_OG_IMAGE,
  SITE_NAME,
  SITE_URL,
  allPaths,
} from '#site-config'
import { RESOLVED_APP_PATHS } from '../scripts/app-paths.mjs'

const ROOT = join(import.meta.dirname, '..')
const OUT = join(ROOT, '.output', 'public')
const INDEX = JSON.parse(readFileSync(join(RESOLVED_APP_PATHS.generatedDir, 'index.json'), 'utf8'))
const ARTICLE_INDEX_FILE = join(RESOLVED_APP_PATHS.generatedDir, 'articles', 'index.json')
const ARTICLE_INDEX = existsSync(ARTICLE_INDEX_FILE) ? JSON.parse(readFileSync(ARTICLE_INDEX_FILE, 'utf8')) : []
const firstRecipe = INDEX[0]
const firstArticle = ARTICLE_INDEX[0]

const failures = []
const check = (name, ok, detail = '') => {
  failures.push({ name, ok: !!ok, detail })
}

const decode = (value) =>
  value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")

function pageFile(path) {
  if (path === '/') return join(OUT, 'index.html')
  return join(OUT, path.replace(/^\//, ''), 'index.html')
}

function attrs(raw) {
  return Object.fromEntries(
    [...raw.matchAll(/([:\w-]+)="([^"]*)"/g)].map((match) => [match[1], decode(match[2])]),
  )
}

function readPage(path) {
  const file = pageFile(path)
  check(`${path} exists for SEO audit`, existsSync(file), file)
  return existsSync(file) ? readFileSync(file, 'utf8') : ''
}

function headData(html) {
  const title = decode(html.match(/<title>(.*?)<\/title>/s)?.[1] ?? '')
  const metas = [...html.matchAll(/<meta\s+([^>]+)>/g)].map((match) => attrs(match[1]))
  const links = [...html.matchAll(/<link\s+([^>]+)>/g)].map((match) => attrs(match[1]))
  return { title, metas, links }
}

function metaValue(head, key, value) {
  return head.metas.find((meta) => meta[key] === value)?.content
}

function assertSeo({ path, title, description, ogType, ogImage, noindex = false }) {
  const html = readPage(path)
  const head = headData(html)
  const canonical = `${SITE_URL}${path}`

  check(`${path} title`, head.title === title, head.title)
  check(`${path} description`, metaValue(head, 'name', 'description') === description)
  check(`${path} canonical`, head.links.some((link) => link.rel === 'canonical' && link.href === canonical))
  check(`${path} og:title`, metaValue(head, 'property', 'og:title') === title)
  check(`${path} og:description`, metaValue(head, 'property', 'og:description') === description)
  check(`${path} og:url`, metaValue(head, 'property', 'og:url') === canonical)
  check(`${path} og:type`, metaValue(head, 'property', 'og:type') === ogType)
  check(`${path} og:site_name`, metaValue(head, 'property', 'og:site_name') === SITE_NAME)
  check(`${path} og:image`, metaValue(head, 'property', 'og:image') === ogImage)
  check(`${path} twitter:card`, metaValue(head, 'name', 'twitter:card') === 'summary_large_image')
  check(`${path} twitter:title`, metaValue(head, 'name', 'twitter:title') === title)
  check(`${path} twitter:description`, metaValue(head, 'name', 'twitter:description') === description)
  check(`${path} twitter:image`, metaValue(head, 'name', 'twitter:image') === ogImage)

  const robots = metaValue(head, 'name', 'robots')
  check(`${path} robots`, noindex ? robots === 'noindex, follow' : robots === undefined, robots)
}

assertSeo({
  path: '/',
  title: APP_COPY.pages.homeTitle,
  description: APP_COPY.description,
  ogType: 'website',
  ogImage: `${SITE_URL}${DEFAULT_OG_IMAGE}`,
})

assertSeo({
  path: '/recipes',
  title: APP_COPY.pages.recipesTitle,
  description: APP_COPY.pages.recipesDescription,
  ogType: 'website',
  ogImage: `${SITE_URL}${DEFAULT_OG_IMAGE}`,
})

assertSeo({
  path: '/browse',
  title: APP_COPY.pages.browseTitle,
  description: APP_COPY.pages.browseDescription,
  ogType: 'website',
  ogImage: `${SITE_URL}${APP_CATEGORIES.find((category) => category.featured)?.image ?? DEFAULT_OG_IMAGE}`,
})

assertSeo({
  path: '/search',
  title: APP_COPY.pages.searchTitle,
  description: APP_COPY.pages.searchDescription,
  ogType: 'website',
  ogImage: `${SITE_URL}${DEFAULT_OG_IMAGE}`,
  noindex: true,
})

assertSeo({
  path: '/learn',
  title: APP_COPY.pages.learnTitle,
  description: APP_COPY.pages.learnDescription,
  ogType: 'website',
  ogImage: `${SITE_URL}${DEFAULT_OG_IMAGE}`,
})

assertSeo({
  path: `/recipes/${firstRecipe.slug}`,
  title: `${firstRecipe.title} | ${APP_COPY.pages.recipeTitleSuffix}`,
  description: firstRecipe.description,
  ogType: 'article',
  ogImage: `${SITE_URL}/images/${firstRecipe.image}?v=${firstRecipe.imageHash}`,
})

if (firstArticle) {
  assertSeo({
    path: `/learn/${firstArticle.slug}`,
    title: `${firstArticle.title} | ${APP_COPY.pages.articleTitleSuffix}`,
    description: firstArticle.description,
    ogType: 'article',
    ogImage: firstArticle.image
      ? `${SITE_URL}/images/${firstArticle.image}?v=${firstArticle.imageHash}`
      : `${SITE_URL}${DEFAULT_OG_IMAGE}`,
  })
}

for (const path of allPaths(INDEX, ARTICLE_INDEX)) {
  const head = headData(readPage(path))
  check(`${path} has one canonical`, head.links.filter((link) => link.rel === 'canonical').length === 1)
  check(`${path} has one title`, head.title.length > 0)
  check(`${path} has an OG image`, Boolean(metaValue(head, 'property', 'og:image')))
}

const recipeHtml = readPage(`/recipes/${firstRecipe.slug}`)
const script = recipeHtml.match(
  /<script\s+type="application\/ld\+json"[^>]*>(.*?)<\/script>/s,
)?.[1]
check('recipe JSON-LD script exists', Boolean(script))
if (script) {
  const jsonLd = JSON.parse(script)
  check('recipe JSON-LD type', jsonLd['@type'] === 'Recipe')
  check('recipe JSON-LD canonical URL', jsonLd.url === `${SITE_URL}/recipes/${firstRecipe.slug}`)
  check('recipe JSON-LD author', jsonLd.author?.name === APP_COPY.jsonLdAuthor)
  check('recipe JSON-LD ingredients', Array.isArray(jsonLd.recipeIngredient) && jsonLd.recipeIngredient.length > 0)
  check('recipe JSON-LD instructions', Array.isArray(jsonLd.recipeInstructions) && jsonLd.recipeInstructions.length > 0)
}

for (const result of failures) {
  console.log(`${result.ok ? 'ok  ' : 'FAIL'}  ${result.name}${result.detail ? ` :: ${result.detail}` : ''}`)
}

const failed = failures.filter((result) => !result.ok).length
console.log(`\n${failures.length - failed}/${failures.length} passed`)
process.exit(failed ? 1 : 0)
