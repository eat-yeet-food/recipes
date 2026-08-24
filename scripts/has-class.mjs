/**
 * Does the compiled build define these classes?
 *
 *   node scripts/has-class.mjs lg:flex mt-12 'w-[260px]'
 *
 * Tailwind v4 compiles live from the `@theme` block in `src/styles/global.css`,
 * but only emits a utility for what it finds used in scanned source — so a
 * typo or an unused arbitrary value still silently styles nothing. Check
 * before reaching for one; `pnpm run classes` catches it later, but this
 * answers the question while you are still writing the markup.
 *
 * Requires a prior `vite build` — this reads `.output/public/build/*.css`,
 * the compiled output, not the `@theme` source.
 *
 * Quote arguments containing brackets — they are shell globs otherwise.
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join, dirname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const BUILD_DIR = join(ROOT, '.output', 'public', 'build')

if (!existsSync(BUILD_DIR)) {
  console.error(`has-class: no build output at ${relative(ROOT, BUILD_DIR)} — run 'vite build' first`)
  process.exit(2)
}

const css = readdirSync(BUILD_DIR)
  .filter((f) => f.endsWith('.css'))
  .map((f) => readFileSync(join(BUILD_DIR, f), 'utf8'))
  .join('\n')

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
  console.log('Use a real Tailwind utility, or extend the @theme block in global.css.')
}
process.exit(missing > 0 ? 1 : 0)
