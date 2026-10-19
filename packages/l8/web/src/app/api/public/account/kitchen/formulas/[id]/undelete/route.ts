import type { NextRequest } from 'next/server'
import { undeleteKitchenFormula } from '@eat-yeet/l4-content-cms/kitchen'
import { formulaParam, kitchenReply, kitchenRequest } from '../../../../../../../../next/kitchen-api'

export const dynamic = 'force-dynamic'

export const POST = (request: NextRequest, route: { params: Promise<{ id: string }> }) => kitchenRequest(request, async (payload, member) => {
  const id = await formulaParam(route)
  return kitchenReply(id ? await undeleteKitchenFormula(payload, member.id, id) : { error: 'not-found' })
})
