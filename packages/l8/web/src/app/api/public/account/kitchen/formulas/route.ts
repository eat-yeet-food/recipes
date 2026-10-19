import type { NextRequest } from 'next/server'
import { createKitchenFormula, listKitchenFormulas } from '@eat-yeet/l4-content-cms/kitchen'
import { readJSON, reply } from '../../../../../../next/account'
import { invalidBody, KITCHEN_BODY_BYTES, kitchenReply, kitchenRequest } from '../../../../../../next/kitchen-api'

export const dynamic = 'force-dynamic'

export const GET = (request: NextRequest) => kitchenRequest(request, async (payload, member) =>
  reply(await listKitchenFormulas(payload, member.id)), { write: false })

export const POST = (request: NextRequest) => kitchenRequest(request, async (payload, member) => {
  const data = await readJSON(request, ['name', 'notes', 'recipeSlug', 'state'], KITCHEN_BODY_BYTES)
  if (!data || typeof data.name !== 'string' || typeof data.notes !== 'string' || typeof data.recipeSlug !== 'string') return invalidBody()
  return kitchenReply(await createKitchenFormula(payload, member.id, { name: data.name, notes: data.notes, recipeSlug: data.recipeSlug, state: data.state }), 201)
})
