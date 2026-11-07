import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { basename, dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('../', import.meta.url))
const RETIRED_ALIASES = ['warm', 'warm-deep', 'highlight', 'support', 'support-strong', 'support-soft', 'border-light', 'border-medium', 'secondary', 'secondary-foreground', 'accent', 'accent-foreground', 'brand-strong', 'action-label', 'border-on-brand', 'border-on-ink']
const UTIL = '(?:bg|text|border|from|via|to|fill|stroke|ring|outline|divide|decoration|placeholder:text)'
const isPrimitive = (path) => /ui-primitives\/src\/primitives\//.test(path)
const isStory = (path) => /\.stories\.tsx$/.test(path)
const isTokenSource = (path) => path.endsWith('/global.css')

export function designViolations(source, path) {
  const problems = []
  const code = path.endsWith('.tsx')
  if (/--yeet-(tomato(?:-strong)?|pink|light-pink|cream|gray)\b/.test(source)) problems.push('retired editorial color token')
  if (/(?:bg|text|border|ring|shadow)-\[(?:#[0-9a-f]|rgba?\()/i.test(source) || /(?:color|backgroundColor):\s*['"]#[0-9a-f]/i.test(source)) problems.push('raw component color; use a semantic token')
  if (path.endsWith('.css') && !isTokenSource(path) && /(?:color|background(?:-color)?|border-color):\s*#[0-9a-f]/i.test(source)) problems.push('raw CSS color outside the token source')
  if (path.endsWith('storybook.css') && /\[data-storybook-section\]\s+h[1-6]/.test(source)) problems.push('story wrapper restyles specimen headings')
  if (path.endsWith('storybook.css') && /var\(--color-danger\)/.test(source)) problems.push('status red used in story chrome')
  if (isTokenSource(path) && new RegExp(`--color-(?:${RETIRED_ALIASES.join('|')}|sidebar[a-z-]*):`).test(source)) problems.push('retired color alias declared')
  if (!code) return problems
  if (/\btext-\[\d+(?:\.\d+)?px\]|\btext-\[clamp\(/.test(source)) problems.push('arbitrary font size; use the type scale')
  if (/\btracking-(?:\[[^\]]+\]|(?:wide|wider|widest)\b)/.test(source)) problems.push('arbitrary letter-spacing; use tracking-eyebrow or tracking-label')
  if (new RegExp(`${UTIL}-\\[var\\(--color-`).test(source) || /\[(?:color|background|border-color):var\(--color-/.test(source)) problems.push('var(--color-*) escape; use the utility')
  if (/\btext-ink\/\d+/.test(source)) problems.push('opacity-tinted ink text; use text-muted-foreground')
  if (new RegExp(`\\b${UTIL}-(?:${RETIRED_ALIASES.join('|')}|sidebar[a-z-]*)\\b`).test(source)) problems.push('retired color alias')
  if (/\bTextSelect\b|text-select/.test(source)) problems.push('TextSelect is retired')
  if (/\bvariant=["'](?:on-ink|quiet-on-ink|secondary|outline)["']/.test(source)) problems.push('retired button variant')
  if (/\b(?:rounded-lg|rounded-md)\b/.test(source)) problems.push('radius outside the radius roles')
  if (!isPrimitive(path) && !path.endsWith('gradients-accents.stories.tsx')) {
    if (/<button\b[^>]*className=[^>]*rounded-control/.test(source)) problems.push('hand-rolled pill button; use Button or Toggle')
    if (/bg-gradient-accent|brand-stripe|from-brand\b/.test(source)) problems.push('hand-rolled stripe or accent rule; use Surface action, DialogContent stripe or AccentRule')
    if (/<(?:input|textarea|select)\b[^>]*className=[^>]*\bbg-ink\b/.test(source) || /(?:Input|Textarea|Select)\b[^>]*className=[^>]*\bbg-ink\b/.test(source)) problems.push('dark form field')
    if (/aria-label="Breadcrumb"/.test(source)) problems.push('hand-rolled breadcrumbs; use Breadcrumbs')
  }
  if (isPrimitive(path) && /fieldClassName\s*=\s*'[^']*\bbg-ink\b/.test(source)) problems.push('dark field default')
  return problems
}

/** Every primitive needs a story; every story names an owner (a colocated component or an app composition). */
export function storyCoverage(files) {
  const problems = []
  for (const file of files.filter((f) => isPrimitive(f) && /\.tsx$/.test(f) && !isStory(f))) {
    const base = basename(file, '.tsx')
    const owners = { button: ['button', 'toggle'], surface: ['surface', 'accent-rule'] }[base] ?? [base]
    if (!owners.some((name) => existsSync(join(dirname(file), `${name}.stories.tsx`)))) problems.push(`${file}: primitive without a story`)
  }
  for (const story of files.filter(isStory)) {
    const source = readFileSync(story, 'utf8')
    if (!/title:\s*'/.test(source)) problems.push(`${story}: story without a title`)
    if (!/from '\.\/|from '@eat-yeet\/|from '@app\/|from '@\/lib|from '\.\/foundation-kit'/.test(source)) problems.push(`${story}: story without an owner import`)
  }
  return problems
}

function walk(dir) { return readdirSync(dir, { withFileTypes: true }).filter(e => !['.next', '.open-next', '.wrangler', 'node_modules', 'generated', 'dist', '.nx', 'storybook-static'].includes(e.name)).flatMap(e => e.isDirectory() ? walk(join(dir,e.name)) : [join(dir,e.name)]) }
/** cn()'s tailwind-merge must list every custom scale token, or it drops sizes it mistakes for colors. */
export function mergeConfigDrift(css, utils) {
  const out = []
  for (const [scale, prefix] of [['text','text'],['tracking','tracking'],['radius','radius'],['shadow','shadow']]) {
    const theme = [...css.matchAll(new RegExp(`^\\s*--${prefix}-([a-z-]+):`, 'gm'))].map(m => m[1]).filter(n => !(prefix === 'text' && n.includes('--')))
    const listed = (utils.match(new RegExp(`${scale}: \\[([^\\]]*)\\]`)) ?? [, ''])[1].match(/'([^']+)'/g)?.map(x => x.slice(1, -1)) ?? []
    for (const n of theme.filter(n => !listed.includes(n))) out.push(`--${prefix}-${n} is missing from cn()'s tailwind-merge ${scale} list`)
    for (const n of listed.filter(n => !theme.includes(n))) out.push(`tailwind-merge ${scale} list names ${n}, which global.css does not define`)
  }
  return out
}

export function checkDesignSystem() {
  const files = [...walk(join(ROOT,'packages')), ...readdirSync(join(ROOT,'apps')).flatMap(app => walk(join(ROOT,'apps',app,'src')))]
  const failures = [
    ...files.filter(p => /\.(tsx|css)$/.test(p)).flatMap(p => designViolations(readFileSync(p,'utf8'),p).map(message => `${relative(ROOT,p)}: ${message}`)),
    ...mergeConfigDrift(readFileSync(join(ROOT,'packages/l8/web/src/styles/global.css'),'utf8'), readFileSync(join(ROOT,'packages/l0/foundation/src/utils.ts'),'utf8')).map(m => `packages/l0/foundation/src/utils.ts: ${m}`),
    ...storyCoverage(files).map((m) => relative(ROOT, m.split(':')[0]) + ':' + m.split(':').slice(1).join(':')),
  ]
  if (failures.length) throw new Error(failures.join('\n'))
  console.log('design-system: tokens, scales, owned patterns and story coverage conform')
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) checkDesignSystem()
