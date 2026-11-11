// Checks live /api/public/app/v1 responses against packages/l3/app-api/openapi.yaml
// so the Swift client (generated from the spec) and the server cannot drift.
// Usage: TEST_ORIGIN=http://127.0.0.1:3100 node test/app-api-contract.mjs
import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import { Ajv2020 } from 'ajv/dist/2020.js'
import { parse } from 'yaml'

const origin = process.env.TEST_ORIGIN ?? 'http://127.0.0.1:3000'
const spec = parse(readFileSync(new URL('../packages/l3/app-api/openapi.yaml', import.meta.url), 'utf8'))
const ajv = new Ajv2020({ strict: false, allErrors: true })
ajv.addSchema({ $id: 'spec', components: spec.components })
const check = (name, body) => {
  const validate = ajv.getSchema(`spec#/components/schemas/${name}`)
  if (!validate(body)) throw new Error(`${name} violates the contract: ${ajv.errorsText(validate.errors)}`)
}
const get = async (path) => {
  const response = await fetch(origin + '/api/public/app/v1' + path)
  assert.equal(response.headers.get('cache-control'), 'no-store', `${path} must be no-store`)
  return { status: response.status, body: await response.json() }
}

const index = await get('/recipes')
assert.equal(index.status, 200)
check('RecipeIndex', index.body)
assert.ok(index.body.recipes.length > 0, 'index lists published recipes')
for (const url of Object.values(index.body.images).flatMap((image) => [image.url, ...image.variants.map((v) => v.url)]))
  assert.match(url, /^https?:\/\//, 'image URLs are absolute')

const home = await get('/home')
assert.equal(home.status, 200)
check('Home', home.body)
assert.ok(home.body.hero.headline && home.body.images[home.body.hero.image], 'home has its hero copy and image')
assert.ok(home.body.latest.recipes.length > 0 && home.body.browse.categories.length > 0, 'home lists recipes and categories')

const remix = await get('/remix')
assert.equal(remix.status, 200)
check('RemixIndex', remix.body)
assert.ok(remix.body.recipes.length > 0, 'Remix lists calculator recipes')
for (const { slug } of remix.body.recipes) {
  const editor = await get(`/remix/${slug}`)
  check('RemixRecipe', editor.body)
  const post = (state) => fetch(`${origin}/api/public/app/v1/remix/${slug}/resolve`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ state }) })
  const asWritten = await (await post(editor.body.defaultState)).json()
  check('RemixResolution', asWritten)
  assert.ok(asWritten.valid && asWritten.changes.length === 0 && asWritten.recipe, `${slug} resolves as written with no changes`)
  const wetter = structuredClone(editor.body.defaultState)
  wetter.formula.hydrationPercent += 2
  const changed = await (await post(wetter)).json()
  assert.ok(changed.valid && changed.changes.some((c) => /hydration/i.test(c.label)), `${slug} reports a hydration change`)
  const broken = await (await post({ nonsense: true })).json()
  assert.equal(broken.valid, false, `${slug} rejects an invalid state`)
}
assert.equal((await fetch(`${origin}/api/public/app/v1/remix/sourdough-bread/resolve`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"state":{},"x":1}' })).status, 400)

let batches = 0
for (const { slug } of index.body.recipes) {
  const detail = await get(`/recipes/${slug}?count=2`)
  assert.equal(detail.status, 200, slug)
  check('RecipeDetail', detail.body)
  if (detail.body.batch) {
    batches++
    assert.equal(detail.body.batch.count, 2, `${slug} applies today's count`)
    // The calculator replaces the dough lines; steps must still find what they use.
    const doughNeeds = detail.body.recipe.blocks.flatMap((b) => b.steps.flatMap((s) => s.items.flatMap((i) => i.needs)))
      .filter((need) => /^(flour-|water$|salt$|yeast$|levain$)/.test(need.key))
    assert.ok(doughNeeds.length > 0, `${slug} steps list the calculator's dough ingredients`)
  }
  assert.ok(!JSON.stringify(detail.body.recipe.blocks).includes('{{'), `${slug} has no unbound step placeholders`)
}
assert.ok(batches > 0, 'at least one calculator recipe reports a batch')

const clamp = await get(`/recipes/${index.body.recipes.find((r) => r.slug === 'sourdough-bread')?.slug ?? index.body.recipes[0].slug}?count=500`)
assert.ok(!clamp.body.batch || clamp.body.batch.count === 99, 'count clamps to 99')
const missing = await get('/recipes/no-such-recipe')
assert.equal(missing.status, 404)
check('Error', missing.body)
console.log(`app API contract ok: ${index.body.recipes.length} recipes, ${batches} with batches`)
