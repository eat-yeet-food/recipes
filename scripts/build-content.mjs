/**
 * Markdown fixtures -> generated JSON the app imports.
 *
 * Split deliberately. `index.json` carries every recipe minus its body: enough
 * for cards, facet filtering, and the search palette, and small enough to ship
 * once. Each recipe's body lands in its own file under `recipes/`, which the
 * route loads dynamically, so a visitor reading one recipe never downloads the
 * other eleven. That split is the whole point — the previous renderer shipped
 * all twelve bodies to every page.
 */

import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { loadRecipes } from './parse.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'src', 'generated')

/** Body fields — everything the index deliberately leaves behind. */
const BODY = ['equipment', 'ingredients', 'steps', 'notes', 'tips']

const recipes = loadRecipes(join(ROOT, 'fixtures', 'recipes'))

rmSync(OUT, { recursive: true, force: true })
mkdirSync(join(OUT, 'recipes'), { recursive: true })

const index = recipes.map((recipe) => {
  writeFileSync(join(OUT, 'recipes', `${recipe.slug}.json`), JSON.stringify(recipe))
  return Object.fromEntries(Object.entries(recipe).filter(([key]) => !BODY.includes(key)))
})

writeFileSync(join(OUT, 'index.json'), JSON.stringify(index))

const indexKb = (Buffer.byteLength(JSON.stringify(index)) / 1024).toFixed(0)
console.log(`content: ${recipes.length} recipes -> index.json (${indexKb} KB) + ${recipes.length} body chunks`)
