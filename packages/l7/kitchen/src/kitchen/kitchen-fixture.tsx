import type { KitchenClient, KitchenFormula } from './kitchen-client'
import { kitchenStoreClient } from './kitchen-store'

type Seed = { name: string; recipeSlug: string; family: string; state: unknown; notes?: string; history?: { state: unknown; minutesAgo: number }[]; deleted?: boolean }

/** In-memory Notebook transport for Storybook, following the server's rules. */
export function memoryKitchenClient({ formulas: seeds = [], delay = 0, fail = false }: { formulas?: Seed[]; delay?: number; fail?: boolean } = {}): KitchenClient {
  let next = 1
  const newId = () => `story${String(next++).padStart(11, '0')}`
  const ago = (minutes: number) => new Date(Date.now() - minutes * 60000).toISOString()
  const formulas = seeds.map((seed): KitchenFormula => {
    const history = seed.history ?? [{ state: seed.state, minutesAgo: 60 * 24 * 3 }]
    const revisions = history.map((entry) => {
      const at = ago(entry.minutesAgo)
      return { id: String(next++), name: seed.name, state: structuredClone(entry.state), notes: seed.notes ?? '', createdAt: at, updatedAt: at }
    }).reverse()
    return { id: newId(), name: seed.name, recipeSlug: seed.recipeSlug, family: seed.family, state: structuredClone(seed.state), notes: seed.notes ?? '',
      revision: revisions.length, updatedAt: revisions[0].createdAt, deletedAt: seed.deleted ? ago(60 * 24) : null, revisions }
  })
  return kitchenStoreClient({ formulas, newId, delay, fail })
}
