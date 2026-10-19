import type { NextRequest } from 'next/server'
import { restoreKitchenRevision } from '@eat-yeet/l4-content-cms/kitchen'
import { readJSON } from '../../../../../../../../next/account'
import { formulaParam, invalidBody, kitchenReply, kitchenRequest } from '../../../../../../../../next/kitchen-api'

export const dynamic = 'force-dynamic'

export const POST = (request: NextRequest, route: { params: Promise<{ id: string }> }) => kitchenRequest(request, async (payload, member) => {
  const id = await formulaParam(route)
  if (!id) return kitchenReply({ error: 'not-found' })
  const data = await readJSON(request, ['revisionId'])
  if (typeof data?.revisionId !== 'string') return invalidBody()
  return kitchenReply(await restoreKitchenRevision(payload, member.id, id, data.revisionId))
})
