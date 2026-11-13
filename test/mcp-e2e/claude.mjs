/**
 * Claude builds and posts a full recipe through the Eat / Yeet connector
 * (Messages API MCP connector; Anthropic connects to the public endpoint).
 * Usage: node test/mcp-e2e/claude.mjs ["dish"] [--keep]   — needs ANTHROPIC_API_KEY and an owner token.
 */
import Anthropic from '@anthropic-ai/sdk'
import { connect, newestTrial, prompt, server, ownerToken, verifyPosted } from './check.mjs'

const dish = process.argv.slice(2).find((a) => !a.startsWith('--')) ?? 'lemon garlic roast chicken'
const startedAt = Date.now()
const client = new Anthropic()
const messages = [{ role: 'user', content: prompt(dish) }]
let response
for (let turn = 0; turn < 8; turn++) {
  response = await client.beta.messages.stream({
    model: 'claude-opus-5-5',
    max_tokens: 64000,
    output_config: { effort: 'medium' },
    betas: ['mcp-client-2025-11-20', 'server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    mcp_servers: [{ type: 'url', url: server, name: 'eat-yeet', authorization_token: ownerToken() }],
    tools: [{ type: 'mcp_toolset', mcp_server_name: 'eat-yeet' }],
    messages,
  }).finalMessage()
  messages.push({ role: 'assistant', content: response.content })
  if (response.stop_reason !== 'pause_turn') break
}
if (response.stop_reason === 'refusal') throw new Error(`Refused: ${response.stop_details?.category ?? 'unknown'}`)
const calls = response.content.filter((b) => b.type === 'mcp_tool_use').map((b) => b.name)
console.log(`claude: ${calls.length} tool calls in the last turn: ${calls.join(', ')}`)
const text = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim()
const { client: mcp, call } = await connect()
const posted = (await newestTrial(call, startedAt))?.slug ?? text.split('\n').at(-1).trim()
await mcp.close()
await verifyPosted('claude', posted, { keep: process.argv.includes('--keep') })
