import type { NextRequest } from 'next/server'
import { validChallenge } from '@eat-yeet/l4-content-cms/members'
import { failure, googleAuthorization, rateLimited, safeReturnTo } from '../../../../../next/account'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  if (await rateLimited(request, 'google')) return failure('Too many attempts. Please wait a minute and try again.', 429)
  const params = request.nextUrl.searchParams
  // The iPhone app: ?client=ios&challenge=<S256 of its verifier>.
  const client = params.get('client')
  if (client !== null && (client !== 'ios' || !validChallenge(params.get('challenge')))) return failure('Unsupported sign-in request.', 400)
  const native = client === 'ios' ? { challenge: params.get('challenge')! } : undefined
  return googleAuthorization(safeReturnTo(params.get('returnTo')), native) ?? failure('Google sign-in isn’t available right now.', 503)
}
