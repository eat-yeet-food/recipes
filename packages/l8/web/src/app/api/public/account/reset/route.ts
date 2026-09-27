import type { NextRequest } from 'next/server'
import { resetMemberPassword, validPassword } from '@eat-yeet/l4-content-cms/members'
import { cms } from '../../../../../next/cms'
import { failure, rateLimited, readJSON, reply, sameOrigin } from '../../../../../next/account'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return failure('Please use the form on this site.', 403)
  if (await rateLimited(request, 'reset')) return failure('Too many attempts. Please wait a minute and try again.', 429)
  const data = await readJSON(request, ['password', 'token'])
  if (typeof data?.password !== 'string' || !validPassword(data.password)) return failure('Use a password of at least 10 characters.', 400)
  if (typeof data.token !== 'string' || !(await resetMemberPassword(await cms(), data.token, data.password)))
    return failure('This reset link is invalid or has expired. Request a new one.', 400)
  return reply({ ok: true })
}
