import test from 'node:test'
import assert from 'node:assert/strict'
import { designViolations } from './check-design-system.mjs'

const fails = (source, path = 'packages/l7/x/src/x.tsx') => assert.ok(designViolations(source, path).length, source)
const passes = (source, path = 'packages/l7/x/src/x.tsx') => assert.deepEqual(designViolations(source, path), [], source)

test('rejects retired palettes and raw component styling', () => {
  fails('text-[var(--yeet-tomato)]')
  fails('bg-[#ff0000]')
  fails('[data-storybook-section] h2 {color:var(--color-danger)}', 'storybook.css')
})
test('rejects values outside the scales', () => {
  fails('className="text-[13px]"')
  fails('className="text-[clamp(28px,4vw,40px)]"')
  fails('className="tracking-[2px]"')
  fails('className="tracking-widest"')
  fails('className="rounded-lg"')
})
test('rejects escapes, opacity ink and retired aliases', () => {
  fails('className="text-[var(--color-ink)]"')
  fails('className="border-[var(--color-border)]"')
  fails('className="text-ink/65"')
  fails('className="bg-warm-deep"')
  fails('className="text-support-strong"')
  fails('className="text-brand-strong"')
  fails('className="text-action-label"')
  fails(':root{--color-highlight: red;}', '/styles/global.css')
})
test('rejects hand-rolled owned patterns outside primitives', () => {
  fails('<button type="button" className="min-h-11 rounded-control bg-brand">')
  fails('<div className="h-1 bg-gradient-accent" />')
  fails('<div className="brand-stripe" />')
  fails('<input className="bg-ink text-white" />')
  fails('<nav aria-label="Breadcrumb">')
  fails('<Button variant="on-ink">')
  fails("import { TextSelect } from './text-select'")
})
test('rejects a dark field default in primitives', () => {
  fails("export const fieldClassName = 'rounded-field bg-ink text-white'", 'packages/l5/ui-primitives/src/primitives/input.tsx')
})
test('allows semantic tokens, scales, owned patterns and prose', () => {
  passes('text-danger bg-danger-soft; tomato sauce and pink icing')
  passes('className="text-caption tracking-eyebrow rounded-field text-muted-foreground bg-tint"')
  passes(':root{color:#25231f}', '/styles/global.css')
  passes('[data-storybook-section] > h2 {color:var(--color-ink)}', 'storybook.css')
  passes('<div className="brand-stripe pt-[34px]" />', 'packages/l5/ui-primitives/src/primitives/surface.tsx')
  passes('<Surface action><Toggle pressed={on}>Savory</Toggle></Surface>')
})

test('cn merge config must match the theme scales', async () => {
  const { mergeConfigDrift } = await import('./check-design-system.mjs')
  const css = '  --text-page: 1px;\n  --tracking-title: 1px;\n  --radius-field: 1px;\n  --shadow-card: x;\n'
  assert.deepEqual(mergeConfigDrift(css, "text: ['page'], tracking: ['title'], radius: ['field'], shadow: ['card']"), [])
  assert.match(mergeConfigDrift(css, "text: [], tracking: ['title'], radius: ['field'], shadow: ['card']").join(), /--text-page is missing/)
})
