/**
 * Pixel parity against the stored visual baseline.
 *
 * Fresh screenshots should match the committed baseline: same compiled
 * stylesheet, same class names, same markup. This writes a visual diff for
 * anything that moved.
 *
 *   node test/parity.mjs <baselineDir> [--update]
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PNG } from 'pngjs'
import pixelmatch from 'pixelmatch'

import { capture, SHOTS } from './shots.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const BASELINE = args.find((a) => !a.startsWith('--')) ?? join(ROOT, 'test', 'baseline')
const CURRENT = join(ROOT, 'dist', 'shots')
const DIFF = join(ROOT, 'dist', 'diff')

/** Anti-aliasing and subpixel text jitter shouldn't fail a run. */
const THRESHOLD = 0.1
const TOLERANCE = 0.001 // 0.1% of pixels

if (!existsSync(BASELINE) || readdirSync(BASELINE).length === 0) {
  console.error(`No baseline at ${BASELINE}`)
  process.exit(1)
}

console.log('Capturing current rendering...')
const errors = await capture(CURRENT)
mkdirSync(DIFF, { recursive: true })

const results = []

for (const shot of SHOTS) {
  const basePath = join(BASELINE, `${shot.name}.png`)
  const currPath = join(CURRENT, `${shot.name}.png`)
  if (!existsSync(basePath)) {
    results.push({ name: shot.name, status: 'no baseline' })
    continue
  }

  const base = PNG.sync.read(readFileSync(basePath))
  const curr = PNG.sync.read(readFileSync(currPath))

  if (base.width !== curr.width || base.height !== curr.height) {
    results.push({
      name: shot.name,
      status: 'SIZE',
      detail: `${base.width}x${base.height} -> ${curr.width}x${curr.height}`,
    })
    continue
  }

  const diff = new PNG({ width: base.width, height: base.height })
  const changed = pixelmatch(base.data, curr.data, diff.data, base.width, base.height, {
    threshold: THRESHOLD,
  })
  const total = base.width * base.height
  const ratio = changed / total

  if (ratio > TOLERANCE) {
    writeFileSync(join(DIFF, `${shot.name}.png`), PNG.sync.write(diff))
    results.push({
      name: shot.name,
      status: 'DIFF',
      detail: `${changed} px (${(ratio * 100).toFixed(3)}%) -> dist/diff/${shot.name}.png`,
    })
  } else {
    results.push({
      name: shot.name,
      status: 'match',
      detail: changed ? `${changed} px (${(ratio * 100).toFixed(4)}%)` : 'exact',
    })
  }
}

for (const r of results) {
  console.log(`${r.status === 'match' ? 'ok  ' : 'FAIL'}  ${r.name} :: ${r.status}${r.detail ? ' ' + r.detail : ''}`)
}
if (errors.length) {
  console.log('\nPage errors:')
  for (const e of errors) console.log('  ' + e)
}

const failed = results.filter((r) => r.status !== 'match').length
console.log(`\n${results.length - failed}/${results.length} match`)
process.exit(failed || errors.length ? 1 : 0)
