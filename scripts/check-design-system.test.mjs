import test from 'node:test'
import assert from 'node:assert/strict'
import { designViolations } from './check-design-system.mjs'

test('rejects retired palettes and raw component styling', () => {
  assert.ok(designViolations('text-[var(--yeet-tomato)]', 'button.tsx').length)
  assert.ok(designViolations('bg-[#ff0000]', 'button.tsx').length)
  assert.ok(designViolations('[data-storybook-section] h2 {color:var(--color-danger)}', 'storybook.css').length)
})
test('allows semantic status, normal recipe prose, and token source', () => {
  assert.deepEqual(designViolations('text-danger bg-danger-soft; tomato sauce and pink icing', 'recipe.tsx'), [])
  assert.deepEqual(designViolations(':root{color:#25231f}', '/styles/global.css'), [])
  assert.deepEqual(designViolations('[data-storybook-section] > h2 {color:var(--color-ink)}', 'storybook.css'), [])
})
