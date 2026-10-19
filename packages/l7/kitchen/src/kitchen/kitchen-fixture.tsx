import { KitchenError, cleanFormulaName, type KitchenClient, type KitchenFormula, type KitchenRevision } from './kitchen-client'

type Seed = { name: string; recipeSlug: string; family: string; state: unknown; notes?: string; history?: { state: unknown; minutesAgo: number }[]; deleted?: boolean }

/**
 * In-memory Test Kitchen transport for Storybook, following the server's
 * rules: unique names, revision conflicts, restore as a new version and soft
 * delete.
 */
export function memoryKitchenClient({ formulas: seeds = [], delay = 0, fail = false }: { formulas?: Seed[]; delay?: number; fail?: boolean } = {}): KitchenClient {
  let next = 1
  const id = () => `story${String(next++).padStart(11, '0')}`
  const now = () => new Date().toISOString()
  const ago = (minutes: number) => new Date(Date.now() - minutes * 60000).toISOString()
  const store = new Map<string, KitchenFormula>()
  const revision = (name: string, state: unknown, notes: string, at = now()): KitchenRevision => ({ id: String(next++), name, state: structuredClone(state), notes, createdAt: at, updatedAt: at })
  for (const seed of seeds) {
    const history = seed.history ?? [{ state: seed.state, minutesAgo: 60 * 24 * 3 }]
    const revisions = history.map((entry) => revision(seed.name, entry.state, seed.notes ?? '', ago(entry.minutesAgo))).reverse()
    const formulaId = id()
    store.set(formulaId, { id: formulaId, name: seed.name, recipeSlug: seed.recipeSlug, family: seed.family, state: structuredClone(seed.state), notes: seed.notes ?? '',
      revision: revisions.length, updatedAt: revisions[0].createdAt, deletedAt: seed.deleted ? ago(60 * 24) : null, revisions })
  }
  const wait = async () => {
    if (delay) await new Promise((resolve) => setTimeout(resolve, delay))
    if (fail) throw new KitchenError('Test Kitchen is unavailable. Please try again.', 503)
  }
  const own = (formulaId: string) => {
    const formula = store.get(formulaId)
    if (!formula) throw new KitchenError('This formula could not be found.', 404, 'not-found')
    return formula
  }
  const nameTaken = (name: string, except?: string) => [...store.values()].some((formula) => !formula.deletedAt && formula.id !== except && formula.name.toLowerCase() === cleanFormulaName(name).toLowerCase())
  const taken = () => new KitchenError('You already have a formula with this name. Choose a different name.', 409, 'name-taken')
  const copy = <T,>(value: T) => structuredClone(value)
  const summary = ({ revisions: _revisions, notes: _notes, ...formula }: KitchenFormula) => formula
  const create = (recipeSlug: string, family: string, name: string, state: unknown, notes: string) => {
    if (nameTaken(name)) throw taken()
    const formulaId = id()
    const formula: KitchenFormula = { id: formulaId, name: cleanFormulaName(name), recipeSlug, family, state: copy(state), notes, revision: 1, updatedAt: now(), deletedAt: null, revisions: [revision(cleanFormulaName(name), state, notes)] }
    store.set(formulaId, formula)
    return copy(formula)
  }
  const write = (formula: KitchenFormula, values: { name: string; state: unknown; notes: string }) => {
    Object.assign(formula, { ...copy(values), revision: formula.revision + 1, updatedAt: now() })
    formula.revisions = [revision(values.name, values.state, values.notes), ...formula.revisions].slice(0, 100)
    return copy(formula)
  }
  return {
    list: async () => {
      await wait()
      const all = [...store.values()].map(summary).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      return copy({ formulas: all.filter((formula) => !formula.deletedAt), deleted: all.filter((formula) => formula.deletedAt) })
    },
    read: async (formulaId) => { await wait(); return copy(own(formulaId)) },
    create: async ({ recipeSlug, name, state, notes }) => {
      await wait()
      const family = (state as { formula?: { family?: string } }).formula?.family ?? recipeSlug
      return create(recipeSlug, family, name, state, notes)
    },
    save: async (formulaId, { baseRevision, ...values }) => {
      await wait()
      const formula = own(formulaId)
      if (formula.revision !== baseRevision) throw new KitchenError('This formula changed in another tab. Reload to see the latest version.', 409, 'conflict')
      if (nameTaken(values.name, formulaId)) throw taken()
      return write(formula, values)
    },
    restore: async (formulaId, revisionId) => {
      await wait()
      const formula = own(formulaId)
      const old = formula.revisions.find((item) => item.id === revisionId)
      if (!old) throw new KitchenError('That version could not be found.', 404, 'not-found')
      return write(formula, { name: old.name, state: old.state, notes: old.notes })
    },
    duplicate: async (formulaId, name) => {
      await wait()
      const formula = own(formulaId)
      return create(formula.recipeSlug, formula.family, name, formula.state, formula.notes)
    },
    remove: async (formulaId) => {
      await wait()
      const formula = own(formulaId)
      formula.deletedAt = now()
      return copy(summary(formula))
    },
    undelete: async (formulaId) => {
      await wait()
      const formula = own(formulaId)
      if (nameTaken(formula.name, formulaId)) formula.name = `${formula.name} (restored)`
      formula.deletedAt = null
      return copy(formula)
    },
  }
}
