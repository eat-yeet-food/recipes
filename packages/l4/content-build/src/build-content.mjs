/**
 * YAML fixtures -> generated JSON the app imports.
 *
 * Split deliberately. `index.json` carries every recipe minus its body: enough
 * for cards, facet filtering, and the search palette, and small enough to ship
 * once. Each recipe's body lands in its own file under `recipes/`, which the
 * route loads dynamically, so a visitor reading one recipe never downloads the
 * other recipe bodies.
 */

import { mkdirSync, writeFileSync, rmSync, readFileSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join } from 'node:path'

import { loadRecipes } from './parse.mjs'
import { resolveAppPaths } from './app-paths.mjs'

const BODY = ['blocks']

export function buildContent({ appId, appPaths }) {
  const resolvedAppPaths = resolveAppPaths(appPaths)
  const generatedOut = resolvedAppPaths.generatedDir
  const images = resolvedAppPaths.imagesDir

  /**
   * A content hash for the recipe's photo, used as a `?v=` on its URL.
   *
   * Photos keep stable filenames, so replacing one leaves its URL unchanged and
   * the edge may keep serving stale bytes for as long as the cache allows.
   * Query strings are part of the cache key, so versioning the URL retires
   * stale bytes immediately while still allowing a long TTL.
   */
  function imageVersion(file) {
    const path = join(images, file)
    if (!existsSync(path)) {
      console.error(`content(${appId}): ${file} is referenced by a fixture but missing from ${images}`)
      process.exit(1)
    }
    return createHash('sha256').update(readFileSync(path)).digest('hex').slice(0, 8)
  }

  const isExternalImage = (src) => /^https?:\/\//i.test(src) || src.startsWith('data:')

  function localImageFile(src) {
    if (!src || isExternalImage(src)) return ''
    return src.startsWith('/images/') ? src.slice('/images/'.length) : src.replace(/^\/+/, '')
  }

  function versionBlockImages(blocks) {
    return blocks.map((block) => {
      if (block.type !== 'image') return block
      return {
        ...block,
        images: block.images.map((image) => {
          const file = localImageFile(image.src)
          return file ? { ...image, imageHash: imageVersion(file) } : image
        }),
      }
    })
  }

  function versionRecipe(recipe) {
    return {
      ...recipe,
      imageHash: recipe.image ? imageVersion(recipe.image) : '',
      blocks: versionBlockImages(recipe.blocks ?? []),
      variants: (recipe.variants ?? []).map((variant) => ({
        ...variant,
        blocks: versionBlockImages(variant.blocks ?? []),
      })),
    }
  }

  function indexRecipe(recipe) {
    return Object.fromEntries(
      Object.entries(recipe)
        .filter(([key]) => !BODY.includes(key))
        .map(([key, value]) => [
          key,
          key === 'variants'
            ? value.map(({ blocks: _blocks, ...variant }) => variant)
            : value,
        ]),
    )
  }

  const recipes = loadRecipes(resolvedAppPaths.fixtures)

  rmSync(generatedOut, { recursive: true, force: true })
  mkdirSync(generatedOut, { recursive: true })
  mkdirSync(join(generatedOut, 'recipes'), { recursive: true })

  const index = recipes.map((raw) => {
    const recipe = versionRecipe(raw)
    writeFileSync(join(generatedOut, 'recipes', `${recipe.slug}.json`), JSON.stringify(recipe))
    return indexRecipe(recipe)
  })

  writeFileSync(join(generatedOut, 'index.json'), JSON.stringify(index))

  const indexKb = (Buffer.byteLength(JSON.stringify(index)) / 1024).toFixed(0)
  console.log(`content(${appId}): ${recipes.length} recipes -> index.json (${indexKb} KB) + ${recipes.length} body chunks`)
}
