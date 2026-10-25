import 'server-only'
import type { NextRequest } from 'next/server'
import type { Member } from '@eat-yeet/l4-content-cms/members'
import type { KitchenFailure, KitchenResult } from '@eat-yeet/l4-content-cms/kitchen'
import { validFormulaId } from '@eat-yeet/l4-content-cms/kitchen'
import type { Payload } from 'payload'
import { cms } from './cms'
import { currentMember, failure, reply, sameOrigin } from './account'

/** A formula state, its name and notes fit well inside this. */
export const KITCHEN_BODY_BYTES = 24 * 1024

const failures: Record<KitchenFailure['error'], [string, number]> = {
  'not-found': ['This formula could not be found.', 404],
  invalid: ['Check the formula name, values and notes, then try again.', 400],
  'name-taken': ['You already have a formula with this name. Choose a different name.', 409],
  conflict: ['This formula changed in another tab. Reload to see the latest version.', 409],
  limit: ['You can keep up to 200 formulas. Delete one to add another.', 409],
}

export function kitchenReply<T>(result: KitchenResult<T>, status = 200) {
  if ('ok' in result) return reply(result.ok, status)
  const [error, code] = failures[result.error]
  return reply({ error, code: result.error }, code)
}

type Handler = (payload: Payload, member: Member) => Promise<Response>

/**
 * Shared guard for every kitchen request: same-origin writes, a signed-in
 * member, and a generic failure that never leaks internals.
 */
export async function kitchenRequest(request: NextRequest, handler: Handler, { write = true } = {}) {
  if (write && !sameOrigin(request)) return failure('Please use Notebook on this site.', 403)
  const member = await currentMember(request)
  if (!member) return failure('Sign in to use your Notebook formulas.', 401)
  try {
    return await handler(await cms(), member)
  } catch (error) {
    console.error('Notebook request failed', error)
    return failure('Notebook is unavailable. Your edits are still on this page; please try again.', 503)
  }
}

export async function formulaParam(route: { params: Promise<{ id: string }> }) {
  const { id } = await route.params
  return validFormulaId(id) ? id : null
}

export const invalidBody = () => failure('Check the formula name, values and notes, then try again.', 400)
