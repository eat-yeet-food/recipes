import type { NextRequest } from 'next/server'
import { deleteMember } from '@eat-yeet/l4-content-cms/members'
import { cms } from '../../../../../next/cms'
import { accountProviders, clearSession, currentMember, failure, readJSON, reply, sameOrigin } from '../../../../../next/account'

export const dynamic = 'force-dynamic'

// Deletion is explicit: the request must repeat the account's email address.
export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return failure('Please use the form on this site.', 403)
  const member = await currentMember(request)
  if (!member) return failure('Sign in to continue.', 401)
  const data = await readJSON(request, ['email'])
  if (typeof data?.email !== 'string' || data.email.trim().toLowerCase() !== member.email) return failure('Type your email address exactly to confirm.', 400)
  try {
    await deleteMember(await cms(), member.id)
    return clearSession(reply({ member: null, providers: accountProviders() }))
  } catch (error) {
    console.error('Account deletion failed', error)
    return failure('Your account could not be deleted. Please try again.', 503)
  }
}
