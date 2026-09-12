import assert from 'node:assert/strict'
import { it } from 'node:test'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import type { RecipeContent } from '@eat-yeet/l4-content-model/recipes'
import type { ArticleContent } from '@eat-yeet/l4-content-model/articles'
import { buildContent } from './build-content.mjs'

// These view models stand in for a CMS adapter: no YAML/Markdown parser involved.
const recipe: RecipeContent = {
  slug: 'cms-recipe', title: 'CMS recipe', order: null, description: 'A recipe', category: '',
  defaultMethod: '', methodOptions: [], courses: [], cuisines: [], methods: [], restrictions: [],
  occasions: [], ingredientTypes: [], prepMinutes: null, cookMinutes: null, totalMinutes: null,
  yieldAmount: null, yieldUnit: '', image: 'photo.jpg', imageHash: '', created: '2026-01-01',
  searchText: 'cms recipe', blocks: [{ type: 'markdown', html: '<p>Sanitized CMS content.</p>' }],
}
const article: ArticleContent = {
  slug: 'cms-article', title: 'CMS article', order: null, description: '', type: 'guide', category: '',
  tags: [], image: '', imageHash: '', created: '', searchText: 'cms article', blocks: recipe.blocks,
}

function fixture(t: { after: (fn: () => void) => void }) {
  const root = mkdtempSync(join(tmpdir(), 'content-build-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const imagesDir = join(root, 'images')
  const generatedDir = join(root, 'generated')
  mkdirSync(imagesDir)
  writeFileSync(join(imagesDir, 'photo.jpg'), 'image bytes')
  return { root, appId: 'test', imagesDir, generatedDir, recipes: [recipe], articles: [article] }
}

it('publishes non-YAML content models with the existing indexes and lazy bodies', (t) => {
  const input = fixture(t)
  buildContent(input)
  const read = (path: string) => JSON.parse(readFileSync(join(input.generatedDir, path), 'utf8'))
  assert.equal(read('index.json')[0].blocks, undefined)
  assert.equal(read('articles/index.json')[0].blocks, undefined)
  assert.deepEqual(read('recipes/cms-recipe.json').blocks, recipe.blocks)
  assert.deepEqual(read('articles/cms-article.json').blocks, article.blocks)
  assert.match(read('index.json')[0].imageHash, /^[a-f0-9]{8}$/)
  writeFileSync(join(input.generatedDir, 'stale.json'), 'old')
  buildContent(input)
  assert.equal(existsSync(join(input.generatedDir, 'stale.json')), false)
})

it('retains the previous output after invalid slugs, collisions, images, or serialization', (t) => {
  const input = fixture(t)
  buildContent(input)
  const before = readFileSync(join(input.generatedDir, 'index.json'), 'utf8')
  const assertUnchanged = () => assert.equal(readFileSync(join(input.generatedDir, 'index.json'), 'utf8'), before)
  for (const slug of ['../outside', 'UPPER', 'two words', '%2e%2e', 'a/b', 'a\\b', '']) {
    assert.throws(() => buildContent({ ...input, recipes: [{ ...recipe, slug }] }), /invalid slug/)
    assertUnchanged()
  }
  assert.throws(() => buildContent({ ...input, recipes: [recipe, recipe] }), /duplicate slug/)
  assert.throws(() => buildContent({ ...input, articles: [{ ...article, slug: 'index' }] }), /reserved/)
  assert.throws(() => buildContent({ ...input, articles: [article, article] }), /duplicate slug/)
  for (const image of ['missing.jpg', '../outside.jpg', '/outside.jpg', '%2e%2e/outside.jpg']) {
    assert.throws(() => buildContent({ ...input, recipes: [{ ...recipe, image }] }), /image/)
    assertUnchanged()
  }
  // A valid identity too long for the filesystem fails while writing staging, before publication.
  assert.throws(() => buildContent({ ...input, recipes: [{ ...recipe, slug: 'a'.repeat(300) }] }), /ENAMETOOLONG/)
  assertUnchanged()
  const config: Record<string, unknown> = {}
  config.cycle = config
  assert.throws(() => buildContent({ ...input, recipes: [{ ...recipe, workbench: { id: 'test', config } }] }), /circular/i)
  assertUnchanged()
})

it('rejects image symlink escapes including nested method blocks', (t) => {
  const input = fixture(t)
  writeFileSync(join(input.root, 'outside.jpg'), 'outside')
  symlinkSync(join(input.root, 'outside.jpg'), join(input.imagesDir, 'escape.jpg'))
  assert.throws(() => buildContent({ ...input, recipes: [{ ...recipe, image: 'escape.jpg' }] }), /symlink escapes/)
  const blocks: RecipeContent['blocks'] = [{ type: 'section', layout: 'prose', columns: [{ blocks: [
    { type: 'image', layout: { mode: 'vertical' }, images: [{ src: '/images/escape.jpg', alt: 'Test' }] },
  ] }] }]
  const method = { id: 'one', label: 'One', description: '', prepMinutes: null, cookMinutes: null, totalMinutes: null, yieldAmount: null, yieldUnit: '', blocks }
  assert.throws(() => buildContent({ ...input, recipes: [{ ...recipe, methodOptions: [method] }] }), /symlink escapes/)
  assert.equal(existsSync(input.generatedDir), false)
})
