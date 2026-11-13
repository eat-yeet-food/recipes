import type { NextRequest } from 'next/server'
import { redeemMcpCode, refreshMcpTokens } from '@eat-yeet/l4-content-cms/mcp-auth'
import { cms } from '../../../../../next/cms'
import { rateLimited } from '../../../../../next/account'
import { SCOPES, json, oauthError, preflight, readBody } from '../../../../../next/mcp/oauth'

export const dynamic = 'force-dynamic'
export const OPTIONS = preflight

export async function POST(request: NextRequest) {
  if (await rateLimited(request, 'oauth-token')) return oauthError('temporarily_unavailable', 'Too many attempts. Try again in a minute.', 429)
  const body = await readBody(request)
  if (!body) return oauthError('invalid_request', 'Send a form-encoded token request.')
  const payload = await cms()
  const tokens = body.grant_type === 'authorization_code'
    ? await redeemMcpCode(payload, { code: body.code, clientId: body.client_id, redirectUri: body.redirect_uri, verifier: body.code_verifier })
    : body.grant_type === 'refresh_token'
      ? await refreshMcpTokens(payload, { refreshToken: body.refresh_token, clientId: body.client_id })
      : undefined
  if (tokens === undefined) return oauthError('unsupported_grant_type', 'Use authorization_code or refresh_token.')
  if (!tokens) return oauthError('invalid_grant', 'The code or refresh token is invalid or expired. Connect again.')
  return json({ access_token: tokens.accessToken, token_type: 'Bearer', expires_in: tokens.expiresIn, refresh_token: tokens.refreshToken, scope: SCOPES.join(' ') })
}
