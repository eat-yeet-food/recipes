import type { NextRequest } from 'next/server'
import { deleteKitchenFormula, readKitchenFormula, saveKitchenFormula } from '@eat-yeet/l4-content-cms/kitchen'
import { readJSON } from '../../../../../../../next/account'
import { formulaParam, invalidBody, KITCHEN_BODY_BYTES, kitchenReply, kitchenRequest } from '../../../../../../../next/kitchen-api'

export const dynamic = 'force-dynamic'
type RouteContext = { params: Promise<{ id: string }> }

export const GET = (request: NextRequest, route: RouteContext) => kitchenRequest(request, async (payload, member) => {
  const id = await formulaParam(route)
  return kitchenReply(id ? await readKitchenFormula(payload, member.id, id) : { error: 'not-found' })
}, { write: false })

// Autosave: replaces the formula's values and records them in History.
export const PATCH = (request: NextRequest, route: RouteContext) => kitchenRequest(request, async (payload, member) => {
  const id = await formulaParam(route)
  if (!id) return kitchenReply({ error: 'not-found' })
  const data = await readJSON(request, ['baseRevision', 'name', 'notes', 'state'], KITCHEN_BODY_BYTES)
  if (!data || !Number.isSafeInteger(data.baseRevision) || typeof data.name !== 'string' || typeof data.notes !== 'string') return invalidBody()
  return kitchenReply(await saveKitchenFormula(payload, member.id, id, { baseRevision: Number(data.baseRevision), name: data.name, notes: data.notes, state: data.state }))
})

// Soft delete: the formula stays restorable for 30 days.
export const DELETE = (request: NextRequest, route: RouteContext) => kitchenRequest(request, async (payload, member) => {
  const id = await formulaParam(route)
  return kitchenReply(id ? await deleteKitchenFormula(payload, member.id, id) : { error: 'not-found' })
})
