#!/usr/bin/env node
// Fails when iOS views use raw design values instead of EatYeetUI tokens: numeric sizes, spacing,
// radii, strokes, durations, offsets and font sizes, SF system fonts and ad hoc colors/opacities.
// Token definitions (Tokens.swift, Typography.swift), tests and dev tools are exempt.
// Usage: node scripts/ios-tokens.mjs   (also runs before every `pnpm ios build`)
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const ios = join(root, 'mobile/ios')
const exempt = /\/(Tests|UITests|DevTools|EatYeetAPI|EatYeetCore|build)\/|\/(Tokens|Typography)\.swift$/

// A literal other than 0 or 1 (which stay legal: no inset, full scale, hairline-free layout math).
const n = String.raw`-?(?:[2-9]|\d{2,}|\d*\.\d+|1\.\d+)\b`
const rules = [
  [new RegExp(String.raw`\b(?:width|height|minWidth|minHeight|maxWidth|maxHeight|spacing|horizontalSpacing|verticalSpacing|cornerRadius|lineWidth|radius|size|x|y|minimumDistance|duration|[a-zA-Z]+Radius):\s*${n}`), 'raw number in a layout or style argument'],
  [new RegExp(String.raw`\.(?:padding|offset|lineSpacing|tracking|kerning|blur|opacity)\(\s*(?:\.[a-z]+,\s*)?${n}`), 'raw number in a modifier'],
  [/\.font\(\.system\(/, 'SF system font: use Typeface (text) or Typeface.icon(IconSize.…) (glyphs)'],
  [/\.font\(\.(?:largeTitle|title|title2|title3|headline|subheadline|body|callout|footnote|caption|caption2)\b/, 'SF text style: use Typeface'],
  [/\bColor\((?:red|white|hue|\.sRGB|#)/, 'ad hoc color: add it to Palette'],
  [/\bColor\.(?:black|gray|red|blue|green|yellow|orange|pink|purple|white)\b/, 'system color: use Palette'],
  [/\.(?:foregroundStyle|foregroundColor|background|fill|tint)\(\.(?:black|gray|red|blue|green|white|secondary|primary)\b/, 'system color: use Palette'],
  [/milliseconds\(\d+\)\).*(?:reviewing|baking|withAnimation)/, 'raw delay for UI motion: use Motion'],
]

function* swift(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) yield* swift(path)
    else if (name.endsWith('.swift')) yield path
  }
}

const problems = []
for (const file of swift(ios)) {
  if (exempt.test(file)) continue
  readFileSync(file, 'utf8').split('\n').forEach((line, index) => {
    const code = line.replace(/\/\/.*$/, '')
    if (/\bstatic let\b/.test(code)) return // a named constant is how a value gets a name
    for (const [pattern, message] of rules) if (pattern.test(code)) problems.push(`${relative(root, file)}:${index + 1}: ${message}\n    ${line.trim()}`)
  })
}

if (problems.length) {
  console.error(`iOS token check: ${problems.length} raw design value${problems.length === 1 ? '' : 's'}\n\n${problems.join('\n')}`)
  process.exit(1)
}
console.log('iOS token check: ok')
