import type { NextRequest } from 'next/server'
import { emailPattern, registerMember, validDisplayName, validPassword } from '@eat-yeet/l4-content-cms/members'
import { cms } from '../../../../../next/cms'
import { accountProviders, failure, rateLimited, readJSON, reply, sameOrigin } from '../../../../../next/account'

export const dynamic = 'force-dynamic'

// The response is identical whether or not the address already has an account.
export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return failure('Please use the form on this site.', 403)
  if (!accountProviders().email) return failure('Email sign-up isn’t available right now.', 503)
  if (await rateLimited(request, 'register')) return failure('Too many attempts. Please wait a minute and try again.', 429)
  const data = await readJSON(request, ['displayName', 'email', 'password'])
  if (typeof data?.email !== 'string' || !emailPattern.test(data.email.trim()) || data.email.length > 320)
    return failure('Enter a valid email address.', 400)
  if (typeof data.displayName !== 'string' || !validDisplayName(data.displayName)) return failure('Enter a name of 80 characters or fewer.', 400)
  if (typeof data.password !== 'string' || !validPassword(data.password)) return failure('Use a password of at least 10 characters.', 400)
  try {
    await registerMember(await cms(), { email: data.email, password: data.password, displayName: data.displayName })
    return reply({ ok: true })
  } catch (error) {
    console.error('Account registration failed', error)
    return failure('Your account could not be created. Please try again.', 503)
  }
}
