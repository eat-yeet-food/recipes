/** Publish provider-neutral content models as indexes and lazy body chunks. */
import { existsSync, lstatSync, mkdirSync, mkdtempSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { basename, dirname, isAbsolute, join, resolve } from 'node:path'
import { versionContent, isInside } from './assets.mjs'
import { validateCollection } from './validation.mjs'

function indexContent(content, bodyFields) {
  return Object.fromEntries(Object.entries(content)
    .filter(([key]) => !bodyFields.includes(key))
    .map(([key, value]) => [key, key === 'methodOptions' ? value.map(({ blocks: _blocks, ...method }) => method) : value]))
}

/**
 * Adapters own validation and sanitization of provider-specific fields/HTML.
 * This publisher owns output identities, local assets, and filesystem safety.
 * @param {{ appId: string, recipes: import('@eat-yeet/l4-content-model/recipes').RecipeContent[], articles: import('@eat-yeet/l4-content-model/articles').ArticleContent[], imagesDir: string, generatedDir: string }} input
 */
export function buildContent({ appId, recipes, articles, imagesDir, generatedDir }) {
  if (!isAbsolute(imagesDir) || !isAbsolute(generatedDir)) throw new Error('Content paths must be absolute')
  imagesDir = resolve(imagesDir)
  generatedDir = resolve(generatedDir)
  if (isInside(imagesDir, generatedDir) || isInside(generatedDir, imagesDir)) {
    throw new Error('Generated and image directories must not overlap')
  }
  if (existsSync(generatedDir) && (lstatSync(generatedDir).isSymbolicLink() || !lstatSync(generatedDir).isDirectory())) {
    throw new Error('Generated output must be a directory, not a symlink or file')
  }
  validateCollection(recipes, `content(${appId}) recipes`, 'recipes')
  validateCollection(articles, `content(${appId}) articles`, 'articles')

  // Prepare every byte before touching the previous output, including asset checks and JSON serialization.
  const files = new Map()
  const index = recipes.map((raw) => {
    const recipe = versionContent(raw, imagesDir, 'recipes')
    files.set(`recipes/${recipe.slug}.json`, JSON.stringify(recipe))
    return indexContent(recipe, ['blocks', 'learning'])
  })
  const articleIndex = articles.map((raw) => {
    const article = versionContent(raw, imagesDir, 'articles')
    files.set(`articles/${article.slug}.json`, JSON.stringify(article))
    return indexContent(article, ['blocks'])
  })
  files.set('index.json', JSON.stringify(index))
  files.set('articles/index.json', JSON.stringify(articleIndex))

  mkdirSync(dirname(generatedDir), { recursive: true })
  const staging = mkdtempSync(join(dirname(generatedDir), `.${basename(generatedDir)}-`))
  const next = join(staging, 'next')
  const previous = join(staging, 'previous')
  try {
    mkdirSync(join(next, 'recipes'), { recursive: true })
    mkdirSync(join(next, 'articles'), { recursive: true })
    for (const [file, content] of files) writeFileSync(join(next, file), content)
    if (existsSync(generatedDir)) renameSync(generatedDir, previous)
    try {
      renameSync(next, generatedDir)
    } catch (error) {
      if (existsSync(previous)) renameSync(previous, generatedDir)
      throw error
    }
  } finally {
    // If rollback itself failed, leave the backup for recovery rather than deleting it.
    if (existsSync(generatedDir) || !existsSync(previous)) rmSync(staging, { recursive: true, force: true })
  }
  console.log(`content(${appId}): ${recipes.length} recipes + ${articles.length} articles -> indexes and body chunks`)
}
