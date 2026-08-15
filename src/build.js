/**
 * Build: fixtures -> dist/recipes.html
 */

import { writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { loadRecipes } from './parse.js'
import { render } from './render.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'dist', 'recipes.html')

const recipes = loadRecipes(join(ROOT, 'fixtures', 'recipes'))
const html = render(recipes)

mkdirSync(dirname(OUT), { recursive: true })
writeFileSync(OUT, html)

const kb = (Buffer.byteLength(html) / 1024).toFixed(0)
console.log(`Built ${recipes.length} recipes -> dist/recipes.html (${kb} KB)`)
