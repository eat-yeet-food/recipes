/** Authoring outside Git (the owner's MCP connector): the same checks and normalization as a YAML source. */
import { validateAuthored } from './source-validation.mjs'
import { normalizeRecipe } from './normalize.mjs'

/** @param {Record<string, unknown>} source a recipe in the YAML source shape */
export function authorRecipe(source) {
  if (!source || typeof source !== 'object' || Array.isArray(source)) throw new Error('recipe: expected an object')
  const slug = typeof source.slug === 'string' ? source.slug : ''
  validateAuthored(source, `recipes/${slug || 'new'}`)
  return normalizeRecipe(source, slug)
}
