import { NextResponse, type NextRequest } from 'next/server'
import { readMcpClient, validChallenge } from '@eat-yeet/l4-content-cms/mcp-auth'
import { cms } from '../../../../../next/cms'
import { failure, googleAuthorization, rateLimited } from '../../../../../next/account'
import { origin } from '../../../../../next/mcp/oauth'

export const dynamic = 'force-dynamic'

/**
 * Starts a chat client's authorization: checks the client and its exact
 * registered callback, then sends the owner through Google sign-in. Errors that
 * would otherwise redirect to an unverified callback are shown here instead.
 */
export async function GET(request: NextRequest) {
  if (await rateLimited(request, 'oauth-authorize')) return failure('Too many attempts. Please wait a minute and try again.', 429)
  const params = request.nextUrl.searchParams
  const client = await readMcpClient(await cms(), params.get('client_id'))
  const redirectUri = params.get('redirect_uri') ?? ''
  if (!client || !client.redirectUris.includes(redirectUri)) return failure('Unknown connector or callback. Remove the connector and add it again.', 400)
  const back = (error: string, description: string) => {
    const url = new URL(redirectUri)
    // RFC 9207: every response names the issuer (ChatGPT's stable callback requires it).
    url.search = new URLSearchParams({ error, error_description: description, ...(params.get('state') ? { state: params.get('state')! } : {}), iss: origin() }).toString()
    return NextResponse.redirect(url, { status: 303, headers: { 'Cache-Control': 'private, no-store' } })
  }
  if (params.get('response_type') !== 'code') return back('unsupported_response_type', 'Only the code flow is supported.')
  if (params.get('code_challenge_method') !== 'S256' || !validChallenge(params.get('code_challenge'))) return back('invalid_request', 'PKCE with S256 is required.')
  const state = params.get('state') ?? ''
  if (state.length > 512) return back('invalid_request', 'state is too long.')
  return googleAuthorization('/', undefined, { clientId: client.clientId, redirectUri, state, challenge: params.get('code_challenge')! })
    ?? back('temporarily_unavailable', 'Google sign-in isn’t configured.')
}
