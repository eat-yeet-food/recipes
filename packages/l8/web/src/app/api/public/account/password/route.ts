import type { NextRequest } from 'next/server'
import { changeMemberPassword } from '@eat-yeet/l4-content-cms/members'
import { cms } from '../../../../../next/cms'
import { accountProviders, currentMember, failure, rateLimited, readJSON, reply, sameOrigin, startSession } from '../../../../../next/account'

export const dynamic = 'force-dynamic'
const messages = { invalid: 'Your current password is incorrect.', locked: 'Too many attempts. Try again in 10 minutes.', weak: 'Use a password of at least 10 characters.' }

// Changing or adding a password signs out every device, then keeps this one signed in.
export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return failure('Please use the form on this site.', 403)
  if (await rateLimited(request, 'password')) return failure('Too many attempts. Please wait a minute and try again.', 429)
  const member = await currentMember(request)
  if (!member) return failure('Sign in to continue.', 401)
  const data = await readJSON(request, ['currentPassword', 'password'])
  if (!data || (data.currentPassword !== null && typeof data.currentPassword !== 'string') || typeof data.password !== 'string' ||
    String(data.currentPassword ?? '').length > 200 || data.password.length > 200) return failure(messages.weak, 400)
  const payload = await cms()
  const result = await changeMemberPassword(payload, member, data.currentPassword as string | null, data.password)
  if (!result.ok) return failure(messages[result.reason], result.reason === 'weak' ? 400 : 403)
  return startSession(reply({ member: { ...member, hasPassword: true }, providers: accountProviders() }), member.id)
}
