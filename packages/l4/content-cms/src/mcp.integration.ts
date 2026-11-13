import assert from 'node:assert/strict'
import type { Payload } from 'payload'
import { createHash, randomBytes } from 'node:crypto'
import { upsertGoogleMember } from './members'
import { allowedRedirect, createMcpCode, mcpTokenMember, redeemMcpCode, refreshMcpTokens, registerMcpClient, revokeMcpToken } from './mcp-auth'
import { createTrialRecipe, deleteTrialRecipe, readTrialRecipe } from './trial'

/**
 * The MCP connector's OAuth service, member/owner tool scoping and trial content
 * against the isolated app.
 * Google is outside the test; the code is issued the way the callback issues it.
 * `sync` re-runs Git content sync so trial rows are shown to survive it.
 */
export async function verifyMcp(payload: Payload, origin: string, sync: () => Promise<void>) {
  for (const uri of ['https://chatgpt.com/connector_platform_oauth_redirect', 'https://claude.ai/api/mcp/auth_callback', 'http://127.0.0.1:6274/oauth/callback'])
    assert.ok(allowedRedirect(uri), uri)
  for (const uri of ['https://chatgpt.com.evil.example/cb', 'http://chatgpt.com/cb', 'https://evil.example/cb', 'https://chatgpt.com:8443/cb', 'https://u:p@claude.ai/cb', 'javascript:alert(1)'])
    assert.ok(!allowedRedirect(uri), uri)

  const member = await upsertGoogleMember(payload, { sub: 'mcp-integration', email: 'mcp-owner@local.example', emailVerified: true, name: 'Owner' })
  assert.ok(member)
  const client = await registerMcpClient(payload, { name: 'test', redirectUris: ['https://chatgpt.com/connector_platform_oauth_redirect'] })
  assert.ok(!('error' in client))
  const redirectUri = client.redirectUris[0]!
  const verifier = randomBytes(48).toString('base64url')
  const challenge = createHash('sha256').update(verifier).digest('base64url')
  const code = () => createMcpCode(payload, { clientId: client.clientId, redirectUri, challenge, memberId: member.id })

  // Wrong verifier burns the code; codes work once; client and callback must match.
  const burned = await code()
  assert.equal(await redeemMcpCode(payload, { code: burned, clientId: client.clientId, redirectUri, verifier: randomBytes(48).toString('base64url') }), null)
  assert.equal(await redeemMcpCode(payload, { code: burned, clientId: client.clientId, redirectUri, verifier }), null)
  assert.equal(await redeemMcpCode(payload, { code: await code(), clientId: client.clientId, redirectUri: 'https://claude.ai/api/mcp/auth_callback', verifier }), null)

  // Through the token endpoint, as a chat client does it.
  const token = (body: Record<string, string>) => fetch(`${origin}/api/public/oauth/token`, { method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(body) }).then(async (r) => ({ status: r.status, body: await r.json() as any }))
  const issued = await token({ grant_type: 'authorization_code', code: await code(), client_id: client.clientId, redirect_uri: redirectUri, code_verifier: verifier })
  assert.equal(issued.status, 200)
  assert.equal(issued.body.token_type, 'Bearer')
  assert.equal((await mcpTokenMember(payload, issued.body.access_token))?.email, 'mcp-owner@local.example')

  // Any member can connect; only the owner's server includes the recipe-writing tools.
  const tools = await fetch(`${origin}/api/public/mcp`, { method: 'POST', headers: { Authorization: `Bearer ${issued.body.access_token}`,
    'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }) })
  assert.equal(tools.status, 200)
  const names = ((await tools.json()) as any).result.tools.map((tool: any) => tool.name)
  for (const name of ['search_recipes', 'get_recipe', 'rate_recipe', 'create_remix']) assert.ok(names.includes(name), name)
  for (const name of ['create_recipe', 'update_recipe', 'delete_recipe', 'upload_image', 'import_stock_photo', 'get_style_guide'])
    assert.ok(!names.includes(name), `members don't get ${name}`)
  const forbidden = await fetch(`${origin}/api/public/mcp`, { method: 'POST', headers: { Authorization: `Bearer ${issued.body.access_token}`,
    'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'delete_recipe', arguments: { slug: 'anything' } } }) })
  assert.match(JSON.stringify(await forbidden.json()), /not found|isError|-32602/i, 'calling an owner tool as a member fails')

  // Refresh rotates: the old refresh token stops working, the old access token is revoked.
  const refreshed = await token({ grant_type: 'refresh_token', refresh_token: issued.body.refresh_token, client_id: client.clientId })
  assert.equal(refreshed.status, 200)
  assert.equal(await refreshMcpTokens(payload, { refreshToken: issued.body.refresh_token, clientId: client.clientId }), null)
  assert.equal(await mcpTokenMember(payload, issued.body.access_token), null)
  await revokeMcpToken(payload, refreshed.body.access_token)
  assert.equal(await mcpTokenMember(payload, refreshed.body.access_token), null)

  // Connector tables have no REST surface.
  for (const collection of ['mcp-clients', 'mcp-codes', 'mcp-tokens', 'trial-recipes', 'trial-media'])
    assert.notEqual((await fetch(`${origin}/api/${collection}`)).status, 200, collection)

  // Content sync never touches trial recipes.
  const content = { slug: 'mcp-sync-survivor', title: 'Survivor', blocks: [], methodOptions: [] }
  const created = await createTrialRecipe(payload, { source: { slug: content.slug }, content, status: 'draft', gitSlugTaken: false })
  assert.ok('ok' in created)
  await sync()
  assert.ok(await readTrialRecipe(payload, content.slug))
  await deleteTrialRecipe(payload, content.slug)
}
