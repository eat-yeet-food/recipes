import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createNativeGrant, purgeExpiredNativeGrants, upsertGoogleMember } from '@eat-yeet/l4-content-cms/members'
import { createMcpCode } from '@eat-yeet/l4-content-cms/mcp-auth'
import { cms, mcpSettings, runtimeSettings } from '../../../../../../next/cms'
import { clearOAuthCookie, googleProfile, nativeRedirect, readOAuthCookie, redirectTo, startSession } from '../../../../../../next/account'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const saved = readOAuthCookie(request)
  const params = request.nextUrl.searchParams
  const code = params.get('code')
  // A chat client (MCP connector) gets the outcome at its own registered callback.
  const toClient = (params: Record<string, string>) => {
    const url = new URL(saved!.mcp!.redirectUri)
    for (const [key, value] of Object.entries({ ...params, state: saved!.mcp!.state, iss: runtimeSettings().origin })) url.searchParams.set(key, value)
    return clearOAuthCookie(NextResponse.redirect(url, { status: 303, headers: { 'Cache-Control': 'private, no-store' } }))
  }
  const failed = () => saved?.mcp ? toClient({ error: 'access_denied' })
    : clearOAuthCookie(saved?.native ? nativeRedirect({ error: 'google' }) : redirectTo('/account/sign-in?error=google'))
  if (!saved || !code || params.get('state') !== saved.state) return failed()
  try {
    const profile = await googleProfile(code, saved.verifier)
    const member = profile && await upsertGoogleMember(await cms(), profile)
    if (!member) return failed()
    if (saved.mcp) {
      // Only the site owner may connect a chat client.
      const owner = mcpSettings().ownerEmail
      if (!owner || member.email.toLowerCase() !== owner) return toClient({ error: 'access_denied', error_description: 'Only the site owner can connect.' })
      return toClient({ code: await createMcpCode(await cms(), { ...saved.mcp, memberId: member.id }) })
    }
    if (saved.native) {
      // The app gets a one-time code, never a cookie; it redeems the code with its verifier.
      const payload = await cms()
      await purgeExpiredNativeGrants(payload)
      return clearOAuthCookie(nativeRedirect({ code: await createNativeGrant(payload, member.id, saved.native) }))
    }
    const response = redirectTo(`/account/complete?returnTo=${encodeURIComponent(saved.returnTo)}`)
    return clearOAuthCookie(await startSession(response, member.id))
  } catch (error) {
    console.error('Google sign-in failed', error)
    return failed()
  }
}
