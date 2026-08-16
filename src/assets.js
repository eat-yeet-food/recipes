/**
 * Assets, resolved two ways.
 *
 * For the single-file build everything becomes a data URI, so the output works
 * over `file://` with no network at all. For the web build everything becomes a
 * real file with a content-hashed name, because over HTTP data URIs would cost
 * every visitor the whole payload on every visit and cache nothing separately.
 *
 * The stylesheet is the production Tailwind build lifted straight out of the
 * old site (`.output/public/assets/global-*.css`) — matching its class names is
 * what makes the rendering identical rather than merely similar.
 */

import { readFileSync, readdirSync } from 'node:fs'
import { join, dirname, extname, basename } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'

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

/**
 * Short content hash for asset filenames. Because the name changes whenever the
 * bytes do, `/assets/*` can be served `immutable` and a redeploy invalidates
 * only what actually changed.
 */
export function hash8(body) {
  return createHash('sha256').update(body).digest('hex').slice(0, 8)
}

/**
 * Layout custom properties the original site set on `:root` ahead of the sheet.
 * They live here so both targets pick them up from one place.
 */
const ROOT_VARS = ':root { --nav-h: 4rem; --header-offset: calc(var(--nav-h) + var(--impersonation-h, 0px)); }'

/** The stylesheet's five font references. Nothing else in it points outward. */
const FONT_URL = /url\(\/fonts\/([^)]+)\)/g

const readCss = () => readFileSync(join(ASSETS, 'css', 'global.css'), 'utf8')

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

/** The production stylesheet with its fonts embedded as data URIs. */
export function stylesheet() {
  const css = readCss().replace(FONT_URL, (_, file) => `url(${dataUri(join(ASSETS, 'fonts', file))})`)
  return `${ROOT_VARS}\n${css}`
}

/**
 * Every asset as a real file: a public path -> hashed URL map, plus the writes
 * those URLs imply. Keys match the paths the original site served them from,
 * so the templates are indifferent to which target rendered them.
 */
export function webAssets() {
  const urls = {}
  const writes = []

  const emit = (publicPath, sourcePath, dir) => {
    const body = readFileSync(sourcePath)
    const ext = extname(sourcePath)
    const url = `${dir}/${basename(sourcePath, ext)}.${hash8(body)}${ext}`
    urls[publicPath] = url
    writes.push({ url, body })
  }

  emit('/donut-icon.svg', join(ASSETS, 'img', 'donut-icon.svg'), '/assets/img')

  const imgDir = join(ASSETS, 'img')
  for (const entry of readdirSync(imgDir, { withFileTypes: true })) {
    if (!entry.isFile() || extname(entry.name) === '.svg') continue
    emit(`/images/${entry.name}`, join(imgDir, entry.name), '/assets/img')
  }

  const catDir = join(imgDir, 'categories')
  for (const file of readdirSync(catDir)) {
    emit(`/images/categories/${file}`, join(catDir, file), '/assets/img/categories')
  }

  return { urls, writes }
}

/** The same stylesheet with its fonts pointed at hashed files instead. */
export function webStylesheet() {
  const writes = []
  const css = readCss().replace(FONT_URL, (_, file) => {
    const body = readFileSync(join(ASSETS, 'fonts', file))
    const url = `/assets/fonts/${basename(file, '.woff2')}.${hash8(body)}.woff2`
    writes.push({ url, body })
    return `url(${url})`
  })

  return { css: `${ROOT_VARS}\n${css}`, writes }
}
