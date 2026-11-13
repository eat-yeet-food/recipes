/**
 * ChatGPT's path: an OpenAI model builds and posts a full recipe through the
 * Eat / Yeet connector (Responses API remote MCP tool; OpenAI connects to the
 * public endpoint). Usage: node test/mcp-e2e/openai.mjs ["dish"] [--keep]
 * Needs OPENAI_API_KEY (and OPENAI_MODEL to override the model) and an owner token.
 */
import { connect, newestTrial, prompt, server, ownerToken, verifyPosted } from './check.mjs'

const dish = process.argv.slice(2).find((a) => !a.startsWith('--')) ?? 'black bean chili'
if (!process.env.OPENAI_API_KEY) throw new Error('Set OPENAI_API_KEY')
const startedAt = Date.now()
const response = await fetch('https://api.openai.com/v1/responses', {
  method: 'POST',
  headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: process.env.OPENAI_MODEL ?? 'gpt-5',
    input: prompt(dish),
    tools: [{ type: 'mcp', server_label: 'eat_yeet', server_url: server, authorization: ownerToken(), require_approval: 'never' }],
  }),
  signal: AbortSignal.timeout(15 * 60 * 1000),
})
const result = await response.json()
if (!response.ok) throw new Error(`OpenAI ${response.status}: ${JSON.stringify(result.error ?? result)}`)
const calls = (result.output ?? []).filter((o) => o.type === 'mcp_call')
for (const failed of calls.filter((c) => c.error)) console.log(`  ${failed.name} failed: ${JSON.stringify(failed.error)}`)
console.log(`openai: ${calls.length} tool calls: ${calls.map((c) => c.name).join(', ')}`)
const { client: mcp, call } = await connect()
const posted = (await newestTrial(call, startedAt))?.slug ?? String(result.output_text ?? '').trim().split('\n').at(-1).trim()
await mcp.close()
await verifyPosted('openai', posted, { keep: process.argv.includes('--keep') })
