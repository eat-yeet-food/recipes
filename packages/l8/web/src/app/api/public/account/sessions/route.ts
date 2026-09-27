import type { NextRequest } from 'next/server'
import { memberRef, revokeAllSessions } from '@eat-yeet/l4-content-cms/members'
import { cms } from '../../../../../next/cms'
import { accountProviders, clearSession, currentMember, failure, reply, sameOrigin } from '../../../../../next/account'

export const dynamic = 'force-dynamic'

export async function DELETE(request: NextRequest) {
  if (!sameOrigin(request)) return failure('Please use the form on this site.', 403)
  const member = await currentMember(request)
  if (!member) return failure('Sign in to continue.', 401)
  await revokeAllSessions(await cms(), memberRef(member.id))
  return clearSession(reply({ member: null, providers: accountProviders() }))
}
