/** YAML source adapter. Other providers supply content models directly to buildContent. */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import yaml from 'js-yaml'
import { normalizeArticle, normalizeRecipe } from './normalize.mjs'
import { validateCollection } from './validation.mjs'

function parse(source, fallbackSlug, normalize) {
  const data = yaml.safeLoad(source, { filename: fallbackSlug })
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error(`${fallbackSlug}: expected a YAML mapping`)
  }
  return normalize(data, fallbackSlug)
}

export const parseRecipe = (source, fallbackSlug) => parse(source, fallbackSlug, normalizeRecipe)
export const parseArticle = (source, fallbackSlug) => parse(source, fallbackSlug, normalizeArticle)

function loadCollection(dir, parseContent, collection) {
  const records = readdirSync(dir).filter((file) => /\.ya?ml$/.test(file)).sort().map((file) => {
    try {
      return parseContent(readFileSync(join(dir, file), 'utf8'), file.replace(/\.ya?ml$/, ''))
    } catch (error) {
      throw new Error(`${join(dir, file)}: ${error.message}`, { cause: error })
    }
  })
  validateCollection(records, `${dir} (${collection})`, collection)
  return records.sort((a, b) => {
    if (a.order !== null && b.order !== null && a.order !== b.order) return a.order - b.order
    if (a.order !== null && b.order === null) return -1
    if (a.order === null && b.order !== null) return 1
    return (b.created ?? '').localeCompare(a.created ?? '') || a.title.localeCompare(b.title)
  })
}

export const loadRecipes = (dir) => loadCollection(dir, parseRecipe, 'recipes')
export const loadArticles = (dir) => existsSync(dir) ? loadCollection(dir, parseArticle, 'articles') : []
