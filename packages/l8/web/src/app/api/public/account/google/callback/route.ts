import type { NextRequest } from 'next/server'
import { upsertGoogleMember } from '@eat-yeet/l4-content-cms/members'
import { cms } from '../../../../../../next/cms'
import { clearOAuthCookie, googleProfile, readOAuthCookie, redirectTo, startSession } from '../../../../../../next/account'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const saved = readOAuthCookie(request)
  const params = request.nextUrl.searchParams
  const code = params.get('code')
  const failed = () => clearOAuthCookie(redirectTo('/account/sign-in?error=google'))
  if (!saved || !code || params.get('state') !== saved.state) return failed()
  try {
    const profile = await googleProfile(code, saved.verifier)
    const member = profile && await upsertGoogleMember(await cms(), profile)
    if (!member) return failed()
    const response = redirectTo(`/account/complete?returnTo=${encodeURIComponent(saved.returnTo)}`)
    return clearOAuthCookie(await startSession(response, member.id))
  } catch (error) {
    console.error('Google sign-in failed', error)
    return failed()
  }
}
