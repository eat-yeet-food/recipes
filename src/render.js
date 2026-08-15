/**
 * render(recipes) -> one complete, self-contained HTML document.
 *
 * The stylesheet is the original site's production Tailwind build, so the
 * transcribed class names resolve to exactly the rules the real site used.
 * Fonts and images become data URIs because the output is opened over
 * `file://`, where external requests, `fetch()`, and ES modules all fail.
 */

import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { CATEGORIES } from '../fixtures/categories.js'
import { renderShell, pageTitle } from './page.js'
import { imageMap, stylesheet } from './assets.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

/**
 * Shared modules, in dependency order. Written as ES modules for Node and
 * concatenated into one classic script for the browser — `file://` refuses to
 * load `type="module"`, so a module graph is not an option in the output.
 */
const BUNDLE = [
  'src/format.js',
  'src/icons.js',
  'src/model.js',
  'src/routes.js',
  'src/templates/layout.js',
  'src/templates/home.js',
  'src/templates/search.js',
  'src/templates/palette.js',
  'src/templates/category.js',
  'src/templates/recipe.js',
  'src/page.js',
  'src/router.js',
]

const read = (relative) => readFileSync(join(ROOT, relative), 'utf8')

/** Strip module syntax so the sources can be concatenated into one script. */
function toClassicScript(source) {
  return source
    .replace(/^\s*import\s.*$/gm, '')
    .replace(/^export\s+(?=(?:function|const|let|class)\b)/gm, '')
    .trim()
}

/**
 * Concatenating modules puts every top-level binding in one scope, so a name
 * declared in two files silently resolves to whichever came last. That is a
 * real bug we shipped once (`renderHero` existed in both home.js and
 * recipe.js, and the recipe one won on the home page), so the build refuses
 * to produce output when it happens.
 */
function assertNoCollisions(sources) {
  const owner = new Map()
  const clashes = []

  for (const [file, source] of sources) {
    const names = [...source.matchAll(/^(?:function|const|let|class)\s+([A-Za-z_$][\w$]*)/gm)]
    for (const [, name] of names) {
      if (owner.has(name)) clashes.push(`${name} (${owner.get(name)} and ${file})`)
      else owner.set(name, file)
    }
  }

  if (clashes.length > 0) {
    throw new Error(`Duplicate top-level names in bundle:\n  ${clashes.join('\n  ')}`)
  }
}

function bundleScript() {
  const sources = BUNDLE.map((file) => [file, toClassicScript(read(file))])
  assertNoCollisions(sources)
  return sources.map(([file, source]) => `/* ${file} */\n${source}`).join('\n\n')
}

/** U+2028 and U+2029 are literal line terminators in JavaScript source. */
const JS_LINE_SEPARATORS = new RegExp('[' + String.fromCharCode(0x2028, 0x2029) + ']', 'g')

/** JSON safe to embed in a <script> element without closing it early. */
function safeJson(value) {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(JS_LINE_SEPARATORS, (c) => (c.charCodeAt(0) === 0x2028 ? String.raw`\u2028` : String.raw`\u2029`))
}

/** Swap each recipe's `image` filename for an embedded data URI. */
function withImages(recipes, images) {
  return recipes.map((recipe) => ({
    ...recipe,
    imageUrl: recipe.image ? (images[`/images/${recipe.image}`] ?? '') : '',
    imageAlt: recipe.image ? recipe.title : '',
  }))
}

/** The eight home cards, resolved to embedded images. */
function browseCardsFor(categories, images) {
  return categories
    .filter((category) => category.featured)
    .map((category) => ({
      slug: category.slug,
      label: category.label,
      imageUrl: images[category.image] ?? '',
    }))
}

export function render(rawRecipes, categories = CATEGORIES) {
  const images = imageMap()
  const recipes = withImages(rawRecipes, images)
  const browseCards = browseCardsFor(categories, images)
  const route = { name: 'home' }

  const navAssets = {
    '/donut-icon.svg': images['/donut-icon.svg'],
    '/images/hero-donuts.jpg': images['/images/hero-donuts.jpg'],
  }

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${pageTitle(recipes, categories, route)}</title>
<meta name="description" content="A curated collection of artisan recipes. No life stories, no SEO filler — just tested, refined recipes.">
<style>
:root { --nav-h: 4rem; --header-offset: calc(var(--nav-h) + var(--impersonation-h, 0px)); }
${stylesheet()}
</style>
</head>
<body>
<div id="app">${renderShell(recipes, categories, route, images, browseCards)}</div>
<script>
window.__RECIPES__ = ${safeJson(recipes)};
window.__CATEGORIES__ = ${safeJson(categories)};
window.__ASSETS__ = ${safeJson(navAssets)};
window.__BROWSE_CARDS__ = ${safeJson(browseCards)};
window.__INITIAL_ROUTE__ = ${safeJson(route.name)};
</script>
<script>
${bundleScript()}
</script>
</body>
</html>
`
}
