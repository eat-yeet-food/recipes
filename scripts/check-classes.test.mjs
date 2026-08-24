/**
 * Tests the class guard itself.
 *
 * The guard's whole value is failing when a class does not exist in the
 * compiled stylesheet. An earlier version passed clean while `lg:flex` sat in a
 * one-line constant, which is precisely the bug it was written to catch — a
 * guard that silently passes is worse than none, so its blind spots get a test.
 *
 * Each case writes a tiny fixture project and asserts the guard's exit code.
 */

import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const GUARD = join(HERE, 'check-classes.mjs')

/** A stylesheet defining exactly the classes a fixture is allowed to use. */
const CSS = `
.flex{display:flex}.gap-10{gap:2.5rem}.hidden{display:none}.shrink-0{flex-shrink:0}
.lg\\:block{display:block}.w-\\[260px\\]{width:260px}.mt-12{margin-top:3rem}
.bg-charcoal{background:#2d2d2d}.text-white{color:#fff}.size-10{width:2.5rem}
.space-y-1{margin-top:.25rem}.rounded-full{border-radius:9999px}
`

function run(files) {
  const dir = mkdtempSync(join(tmpdir(), 'classguard-'))
  try {
    mkdirSync(join(dir, '.output', 'public', 'build'), { recursive: true })
    writeFileSync(join(dir, '.output', 'public', 'build', 'global-test.css'), CSS)
    for (const [name, body] of Object.entries(files)) {
      mkdirSync(dirname(join(dir, 'src', name)), { recursive: true })
      writeFileSync(join(dir, 'src', name), body)
    }
    const result = spawnSync('node', [GUARD, dir], { encoding: 'utf8' })
    return { code: result.status, out: (result.stdout ?? '') + (result.stderr ?? '') }
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

const results = []
const check = (name, ok, detail = '') => results.push({ name, ok: !!ok, detail: ok ? '' : detail })

/** The guard must FAIL, and name the offending class. */
function catches(name, files, expected) {
  const { code, out } = run(files)
  check(name, code !== 0 && out.includes(expected), `exit=${code} out=${out.trim().slice(0, 160)}`)
}

/** The guard must PASS — a false positive is a broken build. */
function allows(name, files) {
  const { code, out } = run(files)
  check(name, code === 0, `exit=${code} out=${out.trim().slice(0, 160)}`)
}

// --- shapes a class can reach the DOM through ---------------------------
catches('plain className attribute', { 'a.tsx': `export const A = () => <div className="mt-14" />` }, 'mt-14')

catches(
  'one-line constant',
  { 'a.tsx': `const TOGGLE = 'bg-charcoal text-white lg:flex'\nexport const A = () => <b className={TOGGLE} />` },
  'lg:flex',
)

catches(
  'multi-line constant',
  { 'a.tsx': `const T =\n  'bg-charcoal text-white xl:grid'\nexport const A = () => <b className={T} />` },
  'xl:grid',
)

catches(
  'ternary branch holding a lone token',
  { 'a.tsx': `export const A = ({o}) => <div className={o ? "mt-12" : "mt-14"} />` },
  'mt-14',
)

catches(
  'template literal with an interpolation',
  { 'a.tsx': 'export const A = ({o}) => <div className={`flex ${o} 2xl:hidden`} />' },
  '2xl:hidden',
)

catches(
  'class-carrying prop that is not className',
  { 'a.tsx': `export const A = () => <B sizeClass="size-10 2xl:flex" />` },
  '2xl:flex',
)

catches(
  'arbitrary value that does not exist',
  { 'a.tsx': `export const A = () => <div className="w-[261px]" />` },
  'w-[261px]',
)

// --- things that are not classes and must not be reported ---------------
allows('clean file', { 'a.tsx': `export const A = () => <div className="flex gap-10 hidden w-[260px] shrink-0 lg:block" />` })

allows('data strings that look like classes', {
  'a.tsx': `export const SLUGS = ['no-cook', 'gluten-free', 'north-american']\nexport const KEY = 'courses'`,
})

allows('DOM attribute values', {
  'a.tsx': `export const A = () => <ol role="list" id="clear-filters" />`,
})

allows('urls, meta keys, and css values', {
  'a.tsx':
    `export const M = [{property:'og:site_name'},{name:'twitter:card'}]\n` +
    `export const U = 'https://example.test'\n` +
    `export const NS = 'http://www.w3.org/2000/svg'\n` +
    `export const G = 'linear-gradient(180deg, rgba(45,45,45,0.55) 0%, transparent 50%)'`,
})

allows('comments discussing classes', {
  'a.tsx': '// `lg:flex` and `xl:grid` are not in the sheet\n/* mt-14 either */\nexport const A = () => <div className="flex" />',
})

allows('an svg path constant', {
  'a.tsx': `const P = 'M 17.89 0.25 L 23.69 0.25 C 26.4 0.25 27.47 -0.82 27.47 -3.53 Z'\nexport const A = () => <path d={P} />`,
})

// --- report -------------------------------------------------------------
for (const r of results) console.log(`${r.ok ? 'ok  ' : 'FAIL'}  ${r.name}${r.detail ? ' :: ' + r.detail : ''}`)
const failed = results.filter((r) => !r.ok).length
console.log(`\n${results.length - failed}/${results.length} passed`)
process.exit(failed ? 1 : 0)
