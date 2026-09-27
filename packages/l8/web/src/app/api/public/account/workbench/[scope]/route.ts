import type { NextRequest } from 'next/server'
import { readWorkbench, validWorkbenchScope, validWorkbenchStore, WORKBENCH_BYTES, writeWorkbench } from '@eat-yeet/l4-content-cms/members'
import { cms } from '../../../../../../next/cms'
import { currentMember, failure, readJSON, reply, sameOrigin } from '../../../../../../next/account'

export const dynamic = 'force-dynamic'
type RouteContext = { params: Promise<{ scope: string }> }

export async function GET(request: NextRequest, route: RouteContext) {
  const { scope } = await route.params
  if (!validWorkbenchScope(scope)) return failure('Not found.', 404)
  const member = await currentMember(request)
  if (!member) return failure('Sign in to use saved formulas.', 401)
  return reply({ store: await readWorkbench(await cms(), member.id, scope) })
}

export async function PUT(request: NextRequest, route: RouteContext) {
  const { scope } = await route.params
  if (!validWorkbenchScope(scope)) return failure('Not found.', 404)
  if (!sameOrigin(request)) return failure('Please use the form on this site.', 403)
  const member = await currentMember(request)
  if (!member) return failure('Sign in to use saved formulas.', 401)
  const data = await readJSON(request, ['store'], WORKBENCH_BYTES)
  if (!data || !validWorkbenchStore(data.store)) return failure('Saved formulas are too large or invalid.', 400)
  return reply({ store: await writeWorkbench(await cms(), member.id, scope, data.store) })
}
