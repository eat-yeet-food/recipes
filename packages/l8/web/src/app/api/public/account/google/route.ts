import type { NextRequest } from 'next/server'
import { failure, googleAuthorization, rateLimited, safeReturnTo } from '../../../../../next/account'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  if (await rateLimited(request, 'google')) return failure('Too many attempts. Please wait a minute and try again.', 429)
  return googleAuthorization(safeReturnTo(request.nextUrl.searchParams.get('returnTo'))) ?? failure('Google sign-in isn’t available right now.', 503)
}
