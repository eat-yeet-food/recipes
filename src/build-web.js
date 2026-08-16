/**
 * Web build: fixtures -> dist/index.html plus real, separately cacheable files.
 *
 * The single-file build is the right shape for iCloud and the wrong shape for
 * HTTP: it is named recipes.html, so no host serves it at `/`, and every asset
 * is a data URI, so every visitor downloads the whole payload on every visit
 * and nothing caches on its own. That encoding exists only because `file://`
 * cannot fetch. Here each asset is a separate file whose name carries a content
 * hash, so `/assets/*` is served `immutable` and a repeat visit fetches nothing.
 *
 * Same render(), same markup, same bundle — only the asset references differ.
 */

import { writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { loadRecipes } from './parse.js'
import { render } from './render.js'
import { webAssets, webStylesheet, hash8 } from './assets.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'dist')

/**
 * Cloudflare Pages reads this. Hashed asset names make a year-long immutable
 * cache safe; index.html must revalidate or a deploy would never be seen.
 */
const HEADERS = `/assets/*
  Cache-Control: public, max-age=31536000, immutable

/
  Cache-Control: public, max-age=0, must-revalidate
`

/** Points the document at hashed files, collecting the writes they imply. */
function webTarget() {
  const { urls, writes } = webAssets()
  const sheet = webStylesheet()
  writes.push(...sheet.writes)

  const cssBody = Buffer.from(sheet.css)
  const cssUrl = `/assets/global.${hash8(cssBody)}.css`
  writes.push({ url: cssUrl, body: cssBody })

  return {
    images: urls,
    writes,
    styleHtml: `<link rel="stylesheet" href="${cssUrl}">`,
    // The recipe payload is split out too, so index.html carries only markup
    // and both scripts cache independently of it.
    scriptHtml(data, bundle) {
      const dataBody = Buffer.from(data)
      const appBody = Buffer.from(bundle)
      const dataUrl = `/assets/data.${hash8(dataBody)}.js`
      const appUrl = `/assets/app.${hash8(appBody)}.js`
      writes.push({ url: dataUrl, body: dataBody }, { url: appUrl, body: appBody })
      return `<script src="${dataUrl}"></script>\n<script src="${appUrl}"></script>`
    },
  }
}

const target = webTarget()
const recipes = loadRecipes(join(ROOT, 'fixtures', 'recipes'))
const html = render(recipes, undefined, target)

// Hashed names accumulate across builds, so the directory is rebuilt from
// scratch. Only /assets is cleared — dist also holds the single-file build.
rmSync(join(OUT, 'assets'), { recursive: true, force: true })
mkdirSync(OUT, { recursive: true })

const files = new Map(target.writes.map(({ url, body }) => [url, body]))
for (const [url, body] of files) {
  const path = join(OUT, url.slice(1))
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, body)
}

writeFileSync(join(OUT, 'index.html'), html)
writeFileSync(join(OUT, '_headers'), HEADERS)

const bytes = [...files.values()].reduce((n, b) => n + b.length, 0) + Buffer.byteLength(html)
const mb = (bytes / 1024 / 1024).toFixed(2)
const indexKb = (Buffer.byteLength(html) / 1024).toFixed(0)
console.log(
  `Built ${recipes.length} recipes -> dist/index.html (${indexKb} KB) ` +
    `+ ${files.size} assets (${mb} MB total)`,
)
