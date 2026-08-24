/**
 * Installs a chosen candidate as a recipe's photo.
 *
 *   node scripts/fetch-image.mjs <recipe-slug> <image-url>
 *
 * Downloads the image, resizes it to 1100px on the long edge (the recipe hero
 * renders at most ~1440 CSS px, and every byte is served on first paint),
 * writes it to the active app's images directory, and adds the `image:` line to
 * the recipe's YAML document if it isn't already there.
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'
import { APP_ID, APP_PATHS } from '#site-config'
import { RESOLVED_APP_PATHS } from './app-paths.mjs'

const [slug, source] = process.argv.slice(2)

if (!slug || !source) {
  console.error('usage: node scripts/fetch-image.mjs <recipe-slug> <image-url-or-path>')
  process.exit(1)
}

const recipePath = join(RESOLVED_APP_PATHS.fixtures, `${slug}.yaml`)
if (!existsSync(recipePath)) {
  console.error(`No such recipe for ${APP_ID}: ${APP_PATHS.fixtures}/${slug}.yaml`)
  process.exit(1)
}

const imageDir = RESOLVED_APP_PATHS.imagesDir
mkdirSync(imageDir, { recursive: true })
const target = join(imageDir, `${slug}.jpg`)

// A URL for candidates from the image finder; a path for one you already have.
if (/^https?:\/\//i.test(source)) {
  const res = await fetch(source)
  if (!res.ok) {
    console.error(`Download failed: ${res.status} ${res.statusText}`)
    process.exit(1)
  }
  writeFileSync(target, Buffer.from(await res.arrayBuffer()))
} else {
  if (!existsSync(source)) {
    console.error(`No such file: ${source}`)
    process.exit(1)
  }
  writeFileSync(target, readFileSync(source))
}

// sips ships with macOS; keeps the served payload from ballooning.
execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '62', '-Z', '1100', target, '--out', target], {
  stdio: 'ignore',
})

const recipeSource = readFileSync(recipePath, 'utf8')
if (/^image:/m.test(recipeSource)) {
  writeFileSync(recipePath, recipeSource.replace(/^image:.*$/m, `image: ${slug}.jpg`))
  console.log(`Replaced image for ${slug}`)
} else {
  writeFileSync(recipePath, recipeSource.replace(/^created:/m, `image: ${slug}.jpg\ncreated:`))
  console.log(`Added image to ${slug}`)
}

const kb = (readFileSync(target).length / 1024).toFixed(0)
console.log(`  ${APP_PATHS.imagesDir}/${slug}.jpg (${kb} KB)`)
console.log('\nNow run: pnpm run build')
