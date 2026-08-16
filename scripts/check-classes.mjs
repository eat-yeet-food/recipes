/**
 * Guard: every Tailwind class the components use must exist in the compiled
 * stylesheet.
 *
 * `src/styles/global.css` is the original site's *production* Tailwind build.
 * There is no Tailwind compiler in this project, so a class the original site
 * never used simply does not exist — and using one fails silently, styling
 * nothing. That is not hypothetical: `lg:flex` on the search page's row left it
 * a plain block, so the filter sidebar stacked above the results on desktop
 * instead of sitting beside them, and nothing errored.
 *
 * Anything reported here must be replaced with a class the sheet defines.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, dirname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const CSS = join(ROOT, 'src', 'styles', 'global.css')

/** Class selectors the stylesheet defines, unescaped back to source form. */
function definedClasses() {
  const css = readFileSync(CSS, 'utf8')
  const found = new Set()
  // Class selectors, with CSS escaping: .lg\:w-\[260px\]
  for (const [, raw] of css.matchAll(/\.((?:[\w-]|\\.)+)/g)) {
    found.add(raw.replace(/\\(.)/g, '$1'))
  }
  return found
}

function sourceFiles(dir) {
  const out = []
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) out.push(...sourceFiles(path))
    else if (/\.tsx?$/.test(path)) out.push(path)
  }
  return out
}

/**
 * Classes are only checkable when they are literal. Template holes such as
 * `${open ? 'a' : 'b'}` are split out and their literal fragments still read,
 * so a conditional class is covered as long as both branches are literal.
 */
function usedClasses(source) {
  const out = []
  const attr = /className=(?:"([^"]*)"|\{`([^`]*)`\}|\{'([^']*)'\})/g
  for (const match of source.matchAll(attr)) {
    const value = match[1] ?? match[2] ?? match[3] ?? ''
    for (const token of value.replace(/\$\{[^}]*\}/g, ' ').split(/\s+/)) {
      if (token) out.push({ token, index: match.index ?? 0 })
    }
  }
  // Class strings hoisted into consts, e.g. `const CHECKBOX = '...'`
  for (const match of source.matchAll(/^\s*'([^']{20,})'|^\s*"([^"]{20,})"/gm)) {
    const value = match[1] ?? match[2] ?? ''
    const tokens = value.split(/\s+/).filter(Boolean)
    // Accept a constant as a class list only when every token both looks like a
    // utility and has balanced brackets. CSS value strings (gradients, custom
    // properties) and the SVG wordmark path each fail on some token, so the
    // whole string is rejected rather than reported as 100 bogus classes.
    if (!tokens.every((t) => CLASS_SHAPE.test(t) && balanced(t))) continue
    for (const token of tokens) out.push({ token, index: match.index ?? 0 })
  }
  return out
}

/** A utility starts with a letter, an arbitrary-value bracket, or a negative. */
const CLASS_SHAPE = /^-?[a-z@[]/

/**
 * Brackets balance, and no comma appears outside them. Arbitrary values carry
 * commas inside brackets (`text-[clamp(28px,4vw,40px)]`), but a top-level comma
 * means this is a CSS selector list or value, not a utility.
 */
const balanced = (token) => {
  let depth = 0
  for (const ch of token) {
    if (ch === '(' || ch === '[') depth++
    else if (ch === ')' || ch === ']') depth--
    else if (ch === ',' && depth === 0) return false
    if (depth < 0) return false
  }
  return depth === 0
}

/** Markers the original emitted for lucide icons; never styled by the sheet. */
const NON_UTILITY = new Set(['lucide', 'lucide-'])

/** Not utilities: data/aria variants resolve at runtime, and bare words aren't classes. */
function isCheckable(token) {
  if (!/^[a-z@[-]/.test(token)) return false
  if (token.includes('${') || token.includes('`')) return false
  if (NON_UTILITY.has(token) || token.startsWith('--')) return false
  if (!balanced(token)) return false
  // Variant stacks (hover:, sm:, data-[…]:) are checked as written; the compiled
  // sheet contains the full escaped selector, so this stays exact.
  return true
}

const defined = definedClasses()
const problems = []

for (const file of sourceFiles(join(ROOT, 'src'))) {
  const source = readFileSync(file, 'utf8')
  const lines = source.split('\n')
  for (const { token, index } of usedClasses(source)) {
    if (!isCheckable(token) || defined.has(token)) continue
    const line = source.slice(0, index).split('\n').length
    problems.push({ file: relative(ROOT, file), line, token, text: lines[line - 1]?.trim().slice(0, 70) })
  }
}

if (problems.length === 0) {
  console.log(`classes: every utility used is defined in global.css`)
  process.exit(0)
}

console.error(`classes: ${problems.length} utilities are NOT in the compiled stylesheet\n`)
const seen = new Set()
for (const p of problems) {
  const key = `${p.file}:${p.token}`
  if (seen.has(key)) continue
  seen.add(key)
  console.error(`  ${p.file}:${p.line}  ${p.token}`)
}
console.error('\nThese style nothing. Replace them with classes global.css defines.')
process.exit(1)
