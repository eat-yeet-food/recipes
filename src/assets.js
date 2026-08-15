/**
 * Asset inlining. Everything the page needs becomes a data URI so the built
 * file works over `file://` with no network at all.
 *
 * The stylesheet is the production Tailwind build lifted straight out of the
 * old site (`.output/public/assets/global-*.css`) — matching its class names is
 * what makes the rendering identical rather than merely similar.
 */

import { readFileSync, readdirSync } from 'node:fs'
import { join, dirname, extname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const ASSETS = join(ROOT, 'assets')

const MIME = {
  '.woff2': 'font/woff2',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
}

function dataUri(path) {
  const mime = MIME[extname(path).toLowerCase()] ?? 'application/octet-stream'
  return `data:${mime};base64,${readFileSync(path).toString('base64')}`
}

/** Every image, keyed by the public path the original site served it from. */
export function imageMap() {
  const map = {}
  const add = (publicPath, file) => {
    map[publicPath] = dataUri(file)
  }

  add('/donut-icon.svg', join(ASSETS, 'img', 'donut-icon.svg'))

  const imgDir = join(ASSETS, 'img')
  for (const entry of readdirSync(imgDir, { withFileTypes: true })) {
    if (!entry.isFile() || extname(entry.name) === '.svg') continue
    add(`/images/${entry.name}`, join(imgDir, entry.name))
  }

  const catDir = join(imgDir, 'categories')
  for (const file of readdirSync(catDir)) {
    add(`/images/categories/${file}`, join(catDir, file))
  }

  return map
}

/**
 * The production stylesheet with its five `url(/fonts/*.woff2)` references
 * swapped for embedded data URIs. Nothing else in it points outward.
 */
export function stylesheet() {
  const css = readFileSync(join(ASSETS, 'css', 'global.css'), 'utf8')
  return css.replace(/url\(\/fonts\/([^)]+)\)/g, (_, file) =>
    `url(${dataUri(join(ASSETS, 'fonts', file))})`,
  )
}
