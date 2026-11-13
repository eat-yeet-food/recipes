/**
 * Shared by the chatbot end-to-end runs: after a model built and posted a
 * recipe through the connector, prove the result on the live site, then
 * exercise follow-up tools directly and clean up.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'

export const site = process.env.MCP_SITE ?? 'https://eatyeet.com'
export const server = `${site}/api/public/mcp`
/** Minted by `pnpm mcp token --env production` (or locally without --env). */
export function ownerToken() {
  const environment = site.includes('127.0.0.1') ? 'local' : 'production'
  return process.env.MCP_TOKEN ?? JSON.parse(readFileSync(new URL(`../../.local/${environment}/mcp-token.json`, import.meta.url), 'utf8')).accessToken
}

export const prompt = (dish) => `Create and publish a complete recipe on Eat / Yeet for ${dish}. Use a stock photo for the hero image with good alt text.
Include equipment, ingredients in at least two named sections (amounts first, each with an id), steps that list the ingredients they use, and at least two tips.
When it's published, reply with only its slug on the last line.`

export async function connect() {
  const client = new Client({ name: 'eatyeet-e2e', version: '1.0.0' })
  await client.connect(new StreamableHTTPClientTransport(new URL(server), { requestInit: { headers: { Authorization: `Bearer ${ownerToken()}` } } }))
  const call = async (name, args = {}) => {
    const result = await client.callTool({ name, arguments: args })
    if (result.isError) throw new Error(`${name}: ${result.content[0].text}`)
    return result.structuredContent
  }
  return { client, call }
}

/** Finds the newest trial recipe created since `startedAt`. */
export async function newestTrial(call, startedAt) {
  const { recipes } = await call('list_trial_recipes')
  return recipes.find((r) => Date.parse(r.createdAt) >= startedAt - 5000) ?? null
}

export async function verifyPosted(label, slug, { keep = false } = {}) {
  const { client, call } = await connect()
  try {
    const { recipe, revision, status } = await call('get_recipe', { slug })
    assert.equal(status, 'published', `${label}: published`)
    const card = recipe.blocks.find((b) => b.type === 'recipe')
    assert.ok(recipe.title && recipe.description && recipe.totalMinutes > 0 && recipe.yieldUnit, `${label}: facts`)
    assert.ok(card.ingredients.length >= 2 && card.ingredients.every((s) => s.title && s.items.length), `${label}: named ingredient sections`)
    assert.ok(card.steps.flatMap((s) => s.items).some((i) => i.uses?.length), `${label}: steps reference ingredients`)
    assert.ok(card.tips.length >= 2, `${label}: tips`)

    const page = await (await fetch(`${site}/recipes/${slug}`, { headers: { 'Cache-Control': 'no-cache' } })).text()
    assert.ok(page.includes(recipe.title.replace(/&/g, '&amp;')) || page.includes(recipe.title), `${label}: page title`)
    assert.ok(page.includes('Trial recipe'), `${label}: Trial byline`)
    assert.match(page, /<meta name="robots" content="noindex/, `${label}: noindex`)
    const hero = page.match(/\/media\/([a-f0-9]{64})\/\d+\.avif/)
    assert.ok(hero, `${label}: hero image markup`)
    assert.equal((await fetch(new URL(hero[0], page.includes('media.eatyeet.com') ? 'https://media.eatyeet.com' : site))).status, 200, `${label}: hero served`)
    const app = await (await fetch(`${site}/api/public/app/v1/recipes/${slug}`)).json()
    assert.equal(app.recipe.title, recipe.title, `${label}: iPhone app API`)

    // Follow-ups the owner does next: edit, then (unless kept for review) delete.
    const edited = await call('update_recipe', { ...sourceInput(recipe), slug, expectedRevision: revision, title: `${recipe.title} (edited)` })
    assert.equal(edited.recipe.revision, revision + 1)
    if (!keep) {
      await call('delete_recipe', { slug })
      assert.equal((await fetch(`${site}/recipes/${slug}`, { headers: { 'Cache-Control': 'no-cache' } })).status, 404, `${label}: deleted`)
    }
    console.log(`${label}: posted ${site}/recipes/${slug} — verified${keep ? ' (kept)' : ', edited and deleted'}`)
  } finally { await client.close() }
}

/** The tool input shape back from a stored source. */
function sourceInput(source) {
  const { slug: _slug, created: _created, blocks, ...facts } = source
  const card = blocks.find((b) => b.type === 'recipe')
  return { ...facts, equipment: card.equipment, ingredients: card.ingredients, steps: card.steps, tips: card.tips, notes: card.notes,
    extraBlocks: blocks.slice(blocks.indexOf(card) + 1) }
}
