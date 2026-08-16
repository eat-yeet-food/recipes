/**
 * Does the compiled stylesheet define these classes?
 *
 *   node scripts/has-class.mjs lg:flex mt-12 'w-[260px]'
 *
 * `global.css` is a finished Tailwind build with no compiler behind it, so a
 * utility the original site never used does not exist and silently styles
 * nothing. Check before reaching for one; `npm run classes` catches it later,
 * but this answers the question while you are still writing the markup.
 *
 * Quote arguments containing brackets — they are shell globs otherwise.
 */

import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const css = readFileSync(join(ROOT, 'src', 'styles', 'global.css'), 'utf8')

const defined = new Set(
  [...css.matchAll(/\.(-?(?:[A-Za-z_]|\\.)(?:[\w-]|\\.)*)/g)].map(([, raw]) =>
    raw.replace(/\\(.)/g, '$1'),
  ),
)

const names = process.argv.slice(2)
if (names.length === 0) {
  console.error("usage: node scripts/has-class.mjs <class>...   (quote 'w-[260px]')")
  process.exit(2)
}

let missing = 0
for (const name of names) {
  const ok = defined.has(name)
  if (!ok) missing++
  console.log(`  ${ok ? 'PRESENT' : 'MISSING'}  ${name}`)
}

if (missing > 0) {
  console.log(`\n${missing} of ${names.length} would style nothing.`)
  console.log('Use a class the original site used rather than hand-writing CSS.')
}
process.exit(missing > 0 ? 1 : 0)
