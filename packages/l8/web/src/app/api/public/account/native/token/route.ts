import type { NextRequest } from 'next/server'
import { redeemNativeGrant } from '@eat-yeet/l4-content-cms/members'
import { cms } from '../../../../../../next/cms'
import { failure, rateLimited, readJSON, reply } from '../../../../../../next/account'

export const dynamic = 'force-dynamic'

/**
 * The iPhone app trades its one-time sign-in code and PKCE verifier for a session
 * token, which it keeps in the Keychain and sends as `Authorization: Bearer`.
 */
export async function POST(request: NextRequest) {
  if (await rateLimited(request, 'native-token')) return failure('Too many attempts. Please wait a minute and try again.', 429)
  const body = await readJSON(request, ['code', 'verifier'], 1024)
  if (!body) return failure('Unsupported request.', 400)
  const session = await redeemNativeGrant(await cms(), body.code, body.verifier)
  if (!session) return failure('That sign-in link expired. Please try again.', 401)
  return reply({ token: session.token, expiresAt: session.expiresAt.toISOString() })
}
