/**
 * Guard: every Tailwind class the components use must exist in the compiled
 * stylesheet.
 *
 * Tailwind v4 compiles live now (`@tailwindcss/vite`, from the `@theme` block
 * in `src/styles/global.css`), but that source file is not a class list — it's
 * `@theme`/`@utility`/`@layer` declarations, and Tailwind only emits a utility
 * class for what it actually finds used in scanned source. A typo'd class still
 * produces nothing: it isn't valid Tailwind
 * syntax, or nothing anywhere references it, so nothing compiles it. Same
 * silent-failure symptom, different root cause. That is not hypothetical:
 * `lg:flex` on the search page's row once left it a
 * plain block, so the filter sidebar stacked above the results on desktop
 * instead of sitting beside them, and nothing errored.
 *
 * So this guard reads the *compiled build output* (`.output/public/build/
 * *.css`) instead of the source file — which means a build has to exist first.
 * `pnpm run build` runs this after `vite build` for exactly that reason.
 *
 * Classes reach the DOM through more than `className="…"` — ternaries, hoisted
 * constants, and props like `sizeClass` / `extra` all end up there. So this
 * tokenizes *every* string and template literal and decides whether the literal
 * is a class list, rather than trying to recognize the shapes that wrap one.
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join, dirname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

// An explicit root lets scripts/check-classes.test.mjs point this at fixtures and
// prove the guard still catches each shape a class can reach the DOM through.
const ROOT = process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), '..')
const BUILD_DIR = join(ROOT, '.output', 'public', 'build')

/**
 * Class selectors the compiled build defines, unescaped back to source form.
 * The leading character must be name-like so decimals in values (`.5rem`) are
 * not harvested as classes. Reads every `.css` file under the build directory
 * (currently two: `global-<hash>.css`, `site-overrides-<hash>.css`) rather
 * than hardcoding names, since the hashes change every build.
 */
function definedClasses() {
  if (!existsSync(BUILD_DIR)) {
    console.error(`classes: no build output at ${relative(ROOT, BUILD_DIR)} — run 'vite build' first`)
    process.exit(1)
  }
  const cssFiles = readdirSync(BUILD_DIR).filter((f) => f.endsWith('.css'))
  const css = cssFiles.map((f) => readFileSync(join(BUILD_DIR, f), 'utf8')).join('\n')
  const found = new Set()
  for (const [, raw] of css.matchAll(/\.(-?(?:[A-Za-z_]|\\.)(?:[\w-]|\\.)*)/g)) {
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
 * A utility starts with a letter, a digit (`2xl:flex`), an arbitrary-value
 * bracket, or a negative sign.
 */
const CLASS_SHAPE = /^-?[a-z0-9@[]/

/**
 * Brackets balance, and no comma appears outside them. Arbitrary values carry
 * commas inside brackets (`text-[clamp(28px,4vw,40px)]`), but a top-level comma
 * means this is a CSS selector list or value, not a utility.
 */
function balanced(token) {
  let depth = 0
  for (const ch of token) {
    if (ch === '(' || ch === '[') depth++
    else if (ch === ')' || ch === ']') depth--
    else if (ch === ',' && depth === 0) return false
    if (depth < 0) return false
  }
  return depth === 0
}

/** Strip variant prefixes: `data-[state=open]:lg:bg-white` -> `bg-white`. */
function base(token) {
  let depth = 0
  let start = 0
  for (let i = 0; i < token.length; i++) {
    const ch = token[i]
    if (ch === '[' || ch === '(') depth++
    else if (ch === ']' || ch === ')') depth--
    else if (ch === ':' && depth === 0) start = i + 1
  }
  return token.slice(start)
}

const tokenize = (value) => value.replace(/\$\{[^}]*\}/g, ' ').split(/\s+/).filter(Boolean)

/** Every string and template literal in a slice of source, with line numbers. */
function literals(source, offset = 0) {
  const out = []
  const pattern = /'([^'\\\n]*(?:\\.[^'\\\n]*)*)'|"([^"\\\n]*(?:\\.[^"\\\n]*)*)"|`([^`\\]*(?:\\.[^`\\]*)*)`/g
  for (const match of source.matchAll(pattern)) {
    out.push({ value: match[1] ?? match[2] ?? match[3] ?? '', index: (match.index ?? 0) + offset })
  }
  return out
}

/**
 * The value expression of every `className=` in the file. A brace-balanced scan
 * rather than a regex, so `className={open ? 'a' : 'b'}` and
 * `className={`x ${y}`}` are captured whole.
 *
 * Inside one of these, context is proof: every token is a class, so lone tokens
 * are checked too and a bare `mt-14` typo cannot hide.
 */
function classNameExpressions(source) {
  const out = []
  for (const match of source.matchAll(/className=/g)) {
    let i = (match.index ?? 0) + 'className='.length
    if (source[i] === '{') {
      let depth = 0
      const start = i
      for (; i < source.length; i++) {
        if (source[i] === '{') depth++
        else if (source[i] === '}' && --depth === 0) break
      }
      out.push({ text: source.slice(start, i + 1), offset: start })
    } else if (source[i] === '"' || source[i] === "'") {
      const quote = source[i]
      const start = i
      i = source.indexOf(quote, i + 1)
      out.push({ text: source.slice(start, i + 1), offset: start })
    }
  }
  return out
}

/**
 * Whether a literal found outside a className is a class list.
 *
 * Classes also arrive via hoisted constants and props like `sizeClass`, so
 * those literals are scanned too — but a literal there could equally be data.
 * Requiring one token that the stylesheet already defines, or one carrying a
 * variant or arbitrary-value marker, separates `bg-charcoal text-white` from
 * `no-cook`, `courses`, or `role="list"`.
 */
function isClassList(tokens, defined) {
  if (tokens.length === 0) return false
  if (!tokens.every((t) => CLASS_SHAPE.test(t) && balanced(t))) return false
  return tokens.some((t) => defined.has(t) || t.includes('['))
}

/**
 * Blank out comments, preserving offsets so reported line numbers stay right.
 * Prose about classes is not classes — the backticks in a comment explaining
 * the `lg:flex` bug parse as a template literal otherwise.
 */
function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:])\/\/[^\n]*/g, (m, lead) => lead + ' '.repeat(m.length - lead.length))
}

/** Markers lucide adds to icons; never styled by the sheet. */
const NON_UTILITY = new Set(['lucide', 'lucide-'])

/**
 * Tailwind's `group`/`peer` declaration classes (bare, or named — `group/
 * button`, `peer/field`) never compile to a standalone `.group{}`/`.peer{}`
 * rule themselves; only a `group-*:`/`peer-*:` *consumer* elsewhere (e.g.
 * `group-hover:opacity-100`, `group-data-selected/command-item:text-foreground`)
 * emits a compound selector referencing them. shadcn's generated components
 * declare several (button.tsx's `group/button`, command.tsx's `group/
 * command-item`) whether or not this specific file happens to consume them,
 * so checking these against compiled output the same way as a real utility
 * always produces a false positive.
 */
const GROUP_OR_PEER = /^(group|peer)(\/[\w-]+)?$/

const defined = definedClasses()
const problems = []

const sourceRoots = ['packages', 'src']
  .map((dir) => join(ROOT, dir))
  .filter((dir) => existsSync(dir))

for (const file of sourceRoots.flatMap(sourceFiles)) {
  const source = stripComments(readFileSync(file, 'utf8'))
  const name = relative(ROOT, file)
  const lineAt = (index) => source.slice(0, index).split('\n').length
  const report = (token, index) => {
    if (NON_UTILITY.has(token) || GROUP_OR_PEER.test(token) || defined.has(token)) return
    problems.push({ file: name, line: lineAt(index), token })
  }

  // Inside className=, every token is a class by construction.
  const covered = new Set()
  for (const { text, offset } of classNameExpressions(source)) {
    for (const { value, index } of literals(text, offset)) {
      covered.add(index)
      for (const token of tokenize(value)) report(token, index)
    }
  }

  // Everywhere else — constants, class-carrying props — a literal has to look
  // like a class list before its tokens are trusted.
  for (const { value, index } of literals(source)) {
    if (covered.has(index)) continue
    const tokens = tokenize(value)
    if (!isClassList(tokens, defined)) continue
    for (const token of tokens) report(token, index)
  }
}

if (problems.length === 0) {
  console.log('classes: every utility used is defined in global.css')
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
