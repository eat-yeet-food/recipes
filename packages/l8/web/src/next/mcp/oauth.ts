import 'server-only'
import { NextResponse, type NextRequest } from 'next/server'
import { mcpTokenMember } from '@eat-yeet/l4-content-cms/mcp-auth'
import { cms, mcpSettings, runtimeSettings } from '../cms'

/**
 * OAuth discovery and bearer checks for the MCP connector (the Eat / Yeet ChatGPT
 * app). The site is its own authorization server: chat clients register, the
 * member signs in with Google, and the client receives tokens it sends to
 * `/api/public/mcp`.
 */
export const MCP_PATH = '/api/public/mcp'
export const OAUTH_PATH = '/api/public/oauth'
export const SCOPES = ['recipes']

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type, Mcp-Session-Id, Mcp-Protocol-Version, Last-Event-ID',
  'Access-Control-Expose-Headers': 'WWW-Authenticate, Mcp-Session-Id, Mcp-Protocol-Version' }
export const corsHeaders = (extra: Record<string, string> = {}) => ({ ...cors, 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex', ...extra })
export const preflight = () => new NextResponse(null, { status: 204, headers: corsHeaders() })
export const json = (body: unknown, status = 200, extra: Record<string, string> = {}) => NextResponse.json(body, { status, headers: corsHeaders(extra) })
export const oauthError = (error: string, description: string, status = 400) => json({ error, error_description: description }, status)

export const origin = () => runtimeSettings().origin

export const protectedResourceMetadata = () => ({
  resource: origin() + MCP_PATH,
  authorization_servers: [origin()],
  bearer_methods_supported: ['header'],
  scopes_supported: SCOPES,
  resource_name: 'Eat / Yeet',
  resource_documentation: origin() + '/recipes',
})

export const authorizationServerMetadata = () => ({
  issuer: origin(),
  authorization_endpoint: origin() + OAUTH_PATH + '/authorize',
  token_endpoint: origin() + OAUTH_PATH + '/token',
  registration_endpoint: origin() + OAUTH_PATH + '/register',
  revocation_endpoint: origin() + OAUTH_PATH + '/revoke',
  response_types_supported: ['code'],
  response_modes_supported: ['query'],
  grant_types_supported: ['authorization_code', 'refresh_token'],
  code_challenge_methods_supported: ['S256'],
  token_endpoint_auth_methods_supported: ['none'],
  revocation_endpoint_auth_methods_supported: ['none'],
  scopes_supported: SCOPES,
  authorization_response_iss_parameter_supported: true,
})

/** 401 that points the client at discovery (RFC 9728). */
export function unauthorized(description = 'Sign in to Eat / Yeet to use this connector.') {
  const resourceMetadata = `${origin()}/.well-known/oauth-protected-resource${MCP_PATH}`
  return json({ error: 'invalid_token', error_description: description }, 401, {
    'WWW-Authenticate': `Bearer resource_metadata="${resourceMetadata}", error="invalid_token", error_description="${description}"` })
}

/** A signed-in member using the connector. `owner` (OWNER_EMAIL) also gets the recipe-writing tools. */
export type McpMember = { id: string; email: string; displayName: string; owner: boolean }

/** The member behind a bearer token, or null. */
export async function mcpMember(request: NextRequest | Request): Promise<McpMember | null> {
  const match = request.headers.get('authorization')?.match(/^Bearer ([A-Za-z0-9_-]{43})$/)
  if (!match) return null
  const member = await mcpTokenMember(await cms(), match[1])
  if (!member) return null
  const owner = mcpSettings().ownerEmail
  return { ...member, owner: Boolean(owner) && member.email === owner }
}

/** Token and register endpoints accept form or JSON bodies, small. */
export async function readBody(request: NextRequest, limit = 8192): Promise<Record<string, unknown> | null> {
  const text = await request.text().catch(() => '')
  if (text.length > limit) return null
  const type = request.headers.get('content-type')?.split(';')[0]?.trim()
  try {
    if (type === 'application/json') { const data = JSON.parse(text); return data && typeof data === 'object' && !Array.isArray(data) ? data : null }
    if (type === 'application/x-www-form-urlencoded') return Object.fromEntries(new URLSearchParams(text))
  } catch { /* fall through */ }
  return null
}
