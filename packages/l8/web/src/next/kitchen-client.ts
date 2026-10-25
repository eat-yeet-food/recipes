'use client'
import { KitchenError, type KitchenClient, type KitchenErrorCode, type KitchenFormula, type KitchenFormulaSummary, type KitchenList } from '@eat-yeet/l7-kitchen/kitchen/kitchen-client'
import { ACCOUNT_API } from './account-client'

const KITCHEN_API = `${ACCOUNT_API}/kitchen/formulas`

/** Same-origin JSON request; failures keep the server's message and code. */
async function kitchenRequest<T>(path: string, method = 'GET', body?: unknown, fallback = 'Notebook is unavailable. Please try again.'): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${KITCHEN_API}${path}`, {
      method, cache: 'no-store', credentials: 'same-origin',
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch { throw new KitchenError('You appear to be offline. Your edits are kept on this page.', 0) }
  const data = await response.json().catch(() => null)
  if (!response.ok) throw new KitchenError(data?.error || fallback, response.status, data?.code as KitchenErrorCode | undefined)
  return data as T
}

const formula = (id: string, action = '') => `/${encodeURIComponent(id)}${action}`

export const kitchenClient: KitchenClient = {
  list: () => kitchenRequest<KitchenList>('', 'GET', undefined, 'Your formulas could not be loaded.'),
  read: (id) => kitchenRequest<KitchenFormula>(formula(id), 'GET', undefined, 'This formula could not be loaded.'),
  create: (input) => kitchenRequest<KitchenFormula>('', 'POST', input, 'Your formula could not be saved. Please try again.'),
  save: (id, input) => kitchenRequest<KitchenFormula>(formula(id), 'PATCH', input, 'Your changes could not be saved. They are kept on this page.'),
  restore: (id, revisionId) => kitchenRequest<KitchenFormula>(formula(id, '/restore'), 'POST', { revisionId }, 'That version could not be restored.'),
  duplicate: (id, name) => kitchenRequest<KitchenFormula>(formula(id, '/duplicate'), 'POST', { name }, 'The copy could not be created.'),
  remove: (id) => kitchenRequest<KitchenFormulaSummary>(formula(id), 'DELETE', undefined, 'The formula could not be deleted.'),
  undelete: (id) => kitchenRequest<KitchenFormula>(formula(id, '/undelete'), 'POST', undefined, 'The formula could not be restored.'),
}
