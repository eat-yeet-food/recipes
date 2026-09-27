import type { NextRequest } from 'next/server'
import { emailPattern, forgotMemberPassword } from '@eat-yeet/l4-content-cms/members'
import { cms } from '../../../../../next/cms'
import { accountProviders, failure, rateLimited, readJSON, reply, sameOrigin } from '../../../../../next/account'

export const dynamic = 'force-dynamic'

// Always succeeds for a well-formed address so the form cannot reveal accounts.
export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return failure('Please use the form on this site.', 403)
  if (!accountProviders().email) return failure('Password reset isn’t available right now.', 503)
  if (await rateLimited(request, 'forgot')) return failure('Too many attempts. Please wait a minute and try again.', 429)
  const data = await readJSON(request, ['email'])
  if (typeof data?.email !== 'string' || !emailPattern.test(data.email.trim()) || data.email.length > 320)
    return failure('Enter a valid email address.', 400)
  try { await forgotMemberPassword(await cms(), data.email) }
  catch (error) { console.error('Password reset email failed', error) }
  return reply({ ok: true })
}
