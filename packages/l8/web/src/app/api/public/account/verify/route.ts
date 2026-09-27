import type { NextRequest } from 'next/server'
import { verifyMemberEmail } from '@eat-yeet/l4-content-cms/members'
import { cms } from '../../../../../next/cms'
import { failure, readJSON, reply, sameOrigin } from '../../../../../next/account'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return failure('Please use the form on this site.', 403)
  const data = await readJSON(request, ['token'])
  if (typeof data?.token !== 'string' || !(await verifyMemberEmail(await cms(), data.token)))
    return failure('This confirmation link is invalid or was already used.', 400)
  return reply({ ok: true })
}
