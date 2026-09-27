import type { NextRequest } from 'next/server'
import { revokeSession, updateDisplayName } from '@eat-yeet/l4-content-cms/members'
import { cms } from '../../../../../next/cms'
import { accountProviders, clearSession, currentMember, failure, readJSON, reply, sameOrigin, sessionToken } from '../../../../../next/account'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const member = await currentMember(request)
    const response = reply({ member, providers: accountProviders() })
    return member || !sessionToken(request) ? response : clearSession(response)
  } catch (error) {
    console.error('Account session failed', error)
    return failure('Your account is unavailable. Please try again.', 503)
  }
}

export async function PATCH(request: NextRequest) {
  if (!sameOrigin(request)) return failure('Please use the form on this site.', 403)
  const member = await currentMember(request)
  if (!member) return failure('Sign in to continue.', 401)
  const data = await readJSON(request, ['displayName'])
  if (typeof data?.displayName !== 'string') return failure('Enter a name of 80 characters or fewer.', 400)
  const updated = await updateDisplayName(await cms(), member.id, data.displayName)
  return updated ? reply({ member: updated, providers: accountProviders() }) : failure('Enter a name of 80 characters or fewer.', 400)
}

export async function DELETE(request: NextRequest) {
  if (!sameOrigin(request)) return failure('Please use the form on this site.', 403)
  await revokeSession(await cms(), sessionToken(request))
  return clearSession(reply({ member: null, providers: accountProviders() }))
}
