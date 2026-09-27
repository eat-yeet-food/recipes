import type { NextRequest } from 'next/server'
import { loginMember } from '@eat-yeet/l4-content-cms/members'
import { cms } from '../../../../../next/cms'
import { accountProviders, failure, rateLimited, readJSON, reply, sameOrigin, startSession } from '../../../../../next/account'

export const dynamic = 'force-dynamic'

const messages = {
  invalid: 'That email and password don’t match.',
  locked: 'Too many attempts. Try again in 10 minutes or reset your password.',
  unverified: 'Confirm your email first. Check your inbox for the link.',
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return failure('Please use the form on this site.', 403)
  if (await rateLimited(request, 'login')) return failure('Too many attempts. Please wait a minute and try again.', 429)
  const data = await readJSON(request, ['email', 'password'])
  if (typeof data?.email !== 'string' || typeof data.password !== 'string' || data.email.length > 320 || data.password.length > 200)
    return failure(messages.invalid, 400)
  try {
    const result = await loginMember(await cms(), data.email, data.password)
    if (!result.ok) return failure(messages[result.reason], result.reason === 'invalid' ? 401 : 403)
    return await startSession(reply({ member: result.member, providers: accountProviders() }), result.member.id)
  } catch (error) {
    console.error('Account login failed', error)
    return failure('Sign-in is unavailable. Please try again.', 503)
  }
}
