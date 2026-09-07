import { readFileSync, readdirSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('../', import.meta.url))
export function designViolations(source, path) {
  const problems = []
  if (/--yeet-(tomato(?:-strong)?|pink|light-pink|cream|gray)\b/.test(source)) problems.push('retired editorial color token')
  if (/(?:bg|text|border|ring|shadow)-\[(?:#[0-9a-f]|rgba?\()/i.test(source) || /(?:color|backgroundColor):\s*['"]#[0-9a-f]/i.test(source)) problems.push('raw component color; use a semantic token')
  if (path.endsWith('.css') && !path.endsWith('/global.css') && /(?:color|background(?:-color)?|border-color):\s*#[0-9a-f]/i.test(source)) problems.push('raw CSS color outside the token source')
  if (path.endsWith('storybook.css') && /\[data-storybook-section\]\s+h[1-6]/.test(source)) problems.push('story wrapper restyles specimen headings')
  if (path.endsWith('storybook.css') && /var\(--color-danger\)/.test(source)) problems.push('status red used in story chrome')
  return problems
}
function walk(dir) { return readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(join(dir,e.name)) : [join(dir,e.name)]) }
export function checkDesignSystem() {
  const files = [...walk(join(ROOT,'packages')), ...readdirSync(join(ROOT,'apps')).flatMap(app => walk(join(ROOT,'apps',app,'src')))]
  const failures = files.filter(p => /\.(tsx|css)$/.test(p)).flatMap(p => designViolations(readFileSync(p,'utf8'),p).map(message => `${relative(ROOT,p)}: ${message}`))
  if (failures.length) throw new Error(failures.join('\n'))
  console.log('design-system: no retired palette, raw component colors, or specimen-leaking story chrome')
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) checkDesignSystem()
