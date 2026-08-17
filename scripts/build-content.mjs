/**
 * YAML fixtures -> generated JSON the app imports.
 *
 * Split deliberately. `index.json` carries every recipe minus its body: enough
 * for cards, facet filtering, and the search palette, and small enough to ship
 * once. Each recipe's body lands in its own file under `recipes/`, which the
 * route loads dynamically, so a visitor reading one recipe never downloads the
 * other eleven. That split is the whole point — the previous renderer shipped
 * all twelve bodies to every page.
 */

import { mkdirSync, writeFileSync, rmSync, readFileSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { loadRecipes } from './parse.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'src', 'generated')
const IMAGES = join(ROOT, 'public', 'images')

/** Body fields — everything the index deliberately leaves behind. */
const BODY = ['equipment', 'ingredients', 'steps', 'notes', 'tips']

/**
 * A content hash for the recipe's photo, used as a `?v=` on its URL.
 *
 * Photos keep stable filenames, so replacing one leaves its URL unchanged and
 * the edge keeps serving the old bytes for as long as the cache allows. That
 * happened: replacement sourdough and donut photos were deployed and the live
 * site served the previous images for hours. Query strings are part of the
 * cache key, so versioning the URL retires the old bytes immediately while
 * still allowing a long TTL.
 */
function imageVersion(file) {
  const path = join(IMAGES, file)
  if (!existsSync(path)) {
    console.error(`content: ${file} is referenced by a fixture but missing from public/images`)
    process.exit(1)
  }
  return createHash('sha256').update(readFileSync(path)).digest('hex').slice(0, 8)
}

const recipes = loadRecipes(join(ROOT, 'fixtures', 'recipes'))

rmSync(OUT, { recursive: true, force: true })
mkdirSync(join(OUT, 'recipes'), { recursive: true })

const index = recipes.map((raw) => {
  const recipe = { ...raw, imageHash: raw.image ? imageVersion(raw.image) : '' }
  writeFileSync(join(OUT, 'recipes', `${recipe.slug}.json`), JSON.stringify(recipe))
  return Object.fromEntries(Object.entries(recipe).filter(([key]) => !BODY.includes(key)))
})

writeFileSync(join(OUT, 'index.json'), JSON.stringify(index))

const indexKb = (Buffer.byteLength(JSON.stringify(index)) / 1024).toFixed(0)
console.log(`content: ${recipes.length} recipes -> index.json (${indexKb} KB) + ${recipes.length} body chunks`)
