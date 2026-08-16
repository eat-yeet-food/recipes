/**
 * Installs a chosen candidate as a recipe's photo.
 *
 *   node scripts/fetch-image.mjs <recipe-slug> <image-url>
 *
 * Downloads the image, resizes it to 1100px on the long edge (the recipe hero
 * renders at most ~1440 CSS px, and every byte lands in the single-file build),
 * writes it to assets/img/<slug>.jpg, and adds the `image:` line to the
 * recipe's frontmatter if it isn't already there.
 */

import { writeFileSync, readFileSync, existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const [slug, url] = process.argv.slice(2)

if (!slug || !url) {
  console.error('usage: node scripts/fetch-image.mjs <recipe-slug> <image-url>')
  process.exit(1)
}

const recipePath = join(ROOT, 'fixtures', 'recipes', `${slug}.md`)
if (!existsSync(recipePath)) {
  console.error(`No such recipe: fixtures/recipes/${slug}.md`)
  process.exit(1)
}

const target = join(ROOT, 'assets', 'img', `${slug}.jpg`)

const res = await fetch(url)
if (!res.ok) {
  console.error(`Download failed: ${res.status} ${res.statusText}`)
  process.exit(1)
}
writeFileSync(target, Buffer.from(await res.arrayBuffer()))

// sips ships with macOS; keeps the single-file build from ballooning.
execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '62', '-Z', '1100', target, '--out', target], {
  stdio: 'ignore',
})

const md = readFileSync(recipePath, 'utf8')
if (/^image:/m.test(md)) {
  writeFileSync(recipePath, md.replace(/^image:.*$/m, `image: ${slug}.jpg`))
  console.log(`Replaced image for ${slug}`)
} else {
  writeFileSync(recipePath, md.replace(/^created:/m, `image: ${slug}.jpg\ncreated:`))
  console.log(`Added image to ${slug}`)
}

const kb = (readFileSync(target).length / 1024).toFixed(0)
console.log(`  assets/img/${slug}.jpg (${kb} KB)`)
console.log('\nNow run: npm run build')
