import type { NextRequest } from 'next/server'
import { registerMcpClient } from '@eat-yeet/l4-content-cms/mcp-auth'
import { cms } from '../../../../../next/cms'
import { rateLimited } from '../../../../../next/account'
import { json, oauthError, preflight, readBody } from '../../../../../next/mcp/oauth'

export const dynamic = 'force-dynamic'
export const OPTIONS = preflight

/** Dynamic client registration (RFC 7591) for chat clients. Public clients only; callbacks are allowlisted. */
export async function POST(request: NextRequest) {
  if (await rateLimited(request, 'oauth-register')) return oauthError('temporarily_unavailable', 'Too many registrations. Try again in a minute.', 429)
  const body = await readBody(request)
  if (!body) return oauthError('invalid_client_metadata', 'Send JSON client metadata.')
  if (body.token_endpoint_auth_method != null && body.token_endpoint_auth_method !== 'none')
    return oauthError('invalid_client_metadata', 'Only public clients (token_endpoint_auth_method "none") are supported.')
  const client = await registerMcpClient(await cms(), { name: body.client_name, redirectUris: body.redirect_uris })
  if ('error' in client) return oauthError(client.error, client.error === 'invalid_redirect_uri'
    ? 'Redirect URIs must be ChatGPT or Claude callbacks, or loopback for local tools.' : 'Registration is unavailable.')
  return json({ client_id: client.clientId, client_id_issued_at: Math.floor(Date.now() / 1000), client_name: client.name || undefined,
    redirect_uris: client.redirectUris, token_endpoint_auth_method: 'none', grant_types: ['authorization_code', 'refresh_token'], response_types: ['code'] }, 201)
}
