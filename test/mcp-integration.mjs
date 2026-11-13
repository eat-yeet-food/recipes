/**
 * The owner's MCP connector against a running local server (pnpm dev or pnpm serve):
 * OAuth discovery and refusals, then every tool group through the real MCP client.
 * Usage: node test/mcp-integration.mjs [origin]   (mints a local owner token first)
 */
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'

const origin = process.argv[2] ?? 'http://127.0.0.1:3000'
const root = new URL('../', import.meta.url)
const step = (name) => console.log(`- ${name}`)

step('discovery documents')
const prm = await (await fetch(`${origin}/.well-known/oauth-protected-resource/api/public/mcp`)).json()
assert.equal(prm.resource, `${origin}/api/public/mcp`)
const as = await (await fetch(`${origin}/.well-known/oauth-authorization-server`)).json()
assert.deepEqual(as.code_challenge_methods_supported, ['S256'])

step('no token → 401 pointing at discovery')
const anonymous = await fetch(`${origin}/api/public/mcp`, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' }, body: '{}' })
assert.equal(anonymous.status, 401)
assert.match(anonymous.headers.get('www-authenticate'), /resource_metadata="[^"]+oauth-protected-resource/)
assert.equal((await fetch(`${origin}/api/public/mcp`, { method: 'POST', headers: { Authorization: `Bearer ${'x'.repeat(43)}` } })).status, 401)

step('client registration accepts chat callbacks only')
const register = (uris) => fetch(as.registration_endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_name: 'test', redirect_uris: uris }) })
assert.equal((await register(['https://evil.example/callback'])).status, 400)
const client = await (await register(['https://chatgpt.com/connector_platform_oauth_redirect'])).json()
assert.match(client.client_id, /^mcp_/)

step('authorize: unknown callback is refused here; a good request goes to Google with PKCE')
const authorize = (params) => fetch(`${as.authorization_endpoint}?${new URLSearchParams(params)}`, { redirect: 'manual' })
const base = { response_type: 'code', client_id: client.client_id, redirect_uri: 'https://chatgpt.com/connector_platform_oauth_redirect', code_challenge: 'a'.repeat(43), code_challenge_method: 'S256', state: 'xyz' }
assert.equal((await authorize({ ...base, redirect_uri: 'https://chatgpt.com/other' })).status, 400)
const plain = await authorize({ ...base, code_challenge_method: 'plain' })
assert.match(plain.headers.get('location'), /^https:\/\/chatgpt\.com\/connector_platform_oauth_redirect\?error=invalid_request/)
const started = await authorize(base)
assert.ok([302, 303, 307].includes(started.status), `redirect, got ${started.status}`)
if (started.headers.get('location').includes('error=temporarily_unavailable')) console.log('  (Google sign-in isn’t configured here; the client is told so)')
else {
  assert.match(started.headers.get('location'), /^https:\/\/accounts\.google\.com\//)
  assert.match(started.headers.get('set-cookie'), /eatyeet-oauth=.*Path=\/api\/public\/account\/google/)
}

step('token endpoint refuses made-up codes')
const bogus = await fetch(as.token_endpoint, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ grant_type: 'authorization_code', code: 'b'.repeat(43), client_id: client.client_id, redirect_uri: base.redirect_uri, code_verifier: 'c'.repeat(43) }) })
assert.equal((await bogus.json()).error, 'invalid_grant')

step('owner token')
execFileSync('pnpm', ['-s', 'mcp', 'token', '--create-owner'], { cwd: root, stdio: ['ignore', 'ignore', 'inherit'] })
const { accessToken } = JSON.parse(readFileSync(new URL('.local/local/mcp-token.json', root), 'utf8'))
const mcp = new Client({ name: 'eatyeet-integration', version: '1.0.0' })
await mcp.connect(new StreamableHTTPClientTransport(new URL(`${origin}/api/public/mcp`), { requestInit: { headers: { Authorization: `Bearer ${accessToken}` } } }))
const call = async (name, args = {}) => {
  const result = await mcp.callTool({ name, arguments: args })
  if (result.isError) throw new Error(`${name}: ${result.content[0].text}`)
  return result.structuredContent
}
const refused = async (name, args) => { const result = await mcp.callTool({ name, arguments: args }); assert.equal(result.isError, true, `${name} should fail`); return result.content[0].text }

const tools = (await mcp.listTools()).tools
for (const tool of tools) assert.ok(tool.annotations && 'readOnlyHint' in tool.annotations, `${tool.name} has annotations`)
step(`${tools.length} tools listed`)

step('read: search, get, categories')
const all = await call('search_recipes')
assert.ok(all.total >= 10)
const pollo = await call('get_recipe', { slug: 'pollo-asado' })
assert.equal(pollo.source, 'git')
assert.ok((await call('list_categories')).facets.courses.includes('mains'))

step('images: upload (base64) and reuse')
const photo = readFileSync(new URL('apps/eatyeet/public/images/pollo-asado.jpg', root)).toString('base64')
const image = await call('upload_image', { base64: photo, alt: 'Charred chicken thighs on a board' })
assert.match(image.image, /^trial\/[a-f0-9]{64}\.webp$/)
assert.equal((await call('upload_image', { base64: photo, alt: 'again' })).image, image.image)
assert.equal((await fetch(new URL(image.preview))).headers.get('content-type'), 'image/webp')

step('recipes: refusals, create + publish, render, update, conflict')
const slug = `mcp-test-${Date.now().toString(36)}`
const recipe = {
  title: 'MCP Test Chili', description: 'A smoky weeknight chili written through the connector.', category: 'savory',
  prepMinutes: 15, cookMinutes: 45, totalMinutes: 60, yieldAmount: 6, yieldUnit: 'servings', image: image.image,
  courses: ['mains'], cuisines: ['american'], methods: ['stovetop'],
  extraBlocks: [{ type: 'markdown', markdown: 'Made for **testing**.' }],
  equipment: [{ title: '', items: ['Dutch oven'] }],
  ingredients: [{ title: 'Beef & Beans', items: [{ id: 'beef', text: '900g ground beef' }, { id: 'beans', text: '2 cans kidney beans, drained' }, { id: 'spice', text: '3 tbsp chili powder' }] }],
  steps: [{ title: '', items: [{ text: '**Brown:** Brown the beef in the Dutch oven.', uses: ['beef'] }, { text: 'Add the beans and spices; simmer 40 minutes.', uses: ['beans', 'spice'] }] }],
  tips: ['Better the next day.'], notes: [],
}
assert.match(await refused('create_recipe', { ...recipe, slug: 'pollo-asado', publish: true }), /already uses the slug/)
assert.match(await refused('create_recipe', { ...recipe, slug, image: `trial/${'0'.repeat(64)}.webp` }), /isn’t imported/)
assert.match(await refused('create_recipe', { ...recipe, slug, steps: [{ title: '', items: [{ text: 'x', uses: ['nope'] }] }] }), /unknown ingredient/)
// A failed run must not leave its recipe behind (other suites count recipes).
process.on('exit', (code) => { if (code) execFileSync('pnpm', ['-s', 'mcp', 'wipe'], { cwd: root, stdio: 'ignore' }) })
const created = await call('create_recipe', { ...recipe, slug, publish: true })
assert.equal(created.recipe.status, 'published')
const page = await (await fetch(`${origin}/recipes/${slug}`)).text()
assert.ok(page.indexOf('Made for <strong>testing</strong>') > page.indexOf('data-ingredients-card'), 'story after the recipe card')
assert.ok(!page.includes('&amp;amp;') && page.includes('Beef &amp; Beans'), 'section title ampersand renders once')
for (const text of ['MCP Test Chili', 'Trial recipe', '900g ground beef', 'Brown the beef', 'Better the next day', 'Made for <strong>testing</strong>']) assert.ok(page.includes(text), `page shows ${text}`)
assert.match(page, /<meta name="robots" content="noindex/)
assert.ok(!page.includes('"@type":"Recipe"'), 'no structured data for trials')
assert.match(page, /\/media\/[a-f0-9]{64}\/\d+\.avif/)
assert.ok((await (await fetch(`${origin}/recipes`)).text()).includes('MCP Test Chili'), 'listed on /recipes')
const app = await (await fetch(`${origin}/api/public/app/v1/recipes/${slug}`)).json()
assert.equal(app.recipe?.title ?? app.title, 'MCP Test Chili')
assert.ok(!(await (await fetch(`${origin}/sitemap.xml`)).text()).includes(slug), 'not in the sitemap')
const source = await call('get_recipe', { slug })
assert.equal(source.revision, 1)
const updated = await call('update_recipe', { ...recipe, slug, title: 'MCP Test Chili, Updated', expectedRevision: 1 })
assert.equal(updated.recipe.revision, 2)
assert.match(await refused('update_recipe', { ...recipe, slug, expectedRevision: 1 }), /changed since revision 1/)
assert.match(await refused('update_recipe', { ...recipe, slug: 'pollo-asado', expectedRevision: 1 }), /Git recipes can’t be edited/)
await call('unpublish_recipe', { slug })
assert.equal((await fetch(`${origin}/recipes/${slug}`)).status, 404)
await call('publish_recipe', { slug })
assert.ok((await call('list_trial_recipes')).recipes.some((r) => r.slug === slug))

step('reviews on a Git recipe')
const rated = await call('rate_recipe', { slug: 'pollo-asado', score: 5, review: 'Connector test review.' })
assert.ok(rated.ratings.reviews.some((r) => r.own))
await call('delete_rating', { slug: 'pollo-asado' })

step('remix')
const remixable = (await call('list_remix_recipes')).recipes
assert.ok(remixable.length > 0)
const start = await call('get_remix_recipe', { recipeSlug: remixable[0].slug })
assert.equal((await call('preview_remix', { recipeSlug: start.slug, state: start.defaultState })).valid, true)
const remix = (await call('create_remix', { recipeSlug: start.slug, name: `MCP test ${slug}`, state: start.defaultState })).remix
assert.ok((await call('list_remixes')).remixes.some((r) => r.id === remix.id))
const saved = (await call('save_remix', { id: remix.id, baseRevision: remix.revision, name: `MCP test ${slug} renamed`, state: start.defaultState, notes: 'note' })).remix
assert.equal(saved.name, `MCP test ${slug} renamed`)
assert.match(await refused('save_remix', { id: remix.id, baseRevision: remix.revision, name: 'x', state: start.defaultState }), /changed since/)
await call('delete_remix', { id: remix.id })

step('delete')
await call('delete_recipe', { slug })
assert.equal((await fetch(`${origin}/recipes/${slug}`)).status, 404)
await mcp.close()
console.log('mcp integration: ok')
