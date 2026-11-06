import { KitchenError, cleanFormulaName, type KitchenClient, type KitchenFormula, type KitchenRevision } from './kitchen-client'

const COALESCE_MS = 2 * 60 * 1000
const HISTORY_LIMIT = 100
const DELETED_DAYS = 30

export type KitchenStoreOptions = {
  formulas?: KitchenFormula[]
  /** Called with every formula after each change, for persistence. */
  onChange?: (formulas: KitchenFormula[]) => void
  newId: () => string
  delay?: number
  fail?: boolean
}

/**
 * A Notebook transport over formulas held in this page, following the
 * server's rules: unique names, revision conflicts, edits within two minutes
 * coalescing into one History entry, restore as a new version and a 30-day
 * soft delete. Storybook keeps it in memory; visitors keep it in this browser.
 */
export function kitchenStoreClient({ formulas = [], onChange, newId, delay = 0, fail = false }: KitchenStoreOptions): KitchenClient {
  let revisionCount = 0
  const now = () => new Date().toISOString()
  const copy = <T,>(value: T) => structuredClone(value)
  const store = new Map(formulas.map((formula) => [formula.id, copy(formula)]))
  const changed = () => onChange?.(copy([...store.values()]))
  const revision = (name: string, state: unknown, notes: string, at = now()): KitchenRevision => ({ id: `${Date.now().toString(36)}${(revisionCount++).toString(36)}`, name, state: copy(state), notes, createdAt: at, updatedAt: at })
  const wait = async () => {
    if (delay) await new Promise((resolve) => setTimeout(resolve, delay))
    if (fail) throw new KitchenError('Notebook is unavailable. Please try again.', 503)
  }
  const own = (id: string) => {
    const formula = store.get(id)
    if (!formula) throw new KitchenError('This formula could not be found.', 404, 'not-found')
    return formula
  }
  const nameTaken = (name: string, except?: string) => [...store.values()].some((formula) => !formula.deletedAt && formula.id !== except && formula.name.toLowerCase() === cleanFormulaName(name).toLowerCase())
  const freeName = (base: string) => {
    const root = cleanFormulaName(base)
    for (let index = 1; ; index += 1) {
      const name = index === 1 ? root : `${root.slice(0, 80 - String(index).length - 1).trimEnd()} ${index}`
      if (!nameTaken(name)) return name
    }
  }
  const summary = ({ revisions: _revisions, notes: _notes, ...formula }: KitchenFormula) => formula
  const create = (recipeSlug: string, family: string, name: string, state: unknown, notes: string) => {
    const free = freeName(name)
    const id = newId()
    const formula: KitchenFormula = { id, name: free, recipeSlug, family, state: copy(state), notes, revision: 1, updatedAt: now(), deletedAt: null, revisions: [revision(free, state, notes)] }
    store.set(id, formula)
    changed()
    return copy(formula)
  }
  /** Coalesces into the latest entry within two minutes, never into the created entry. */
  const write = (formula: KitchenFormula, values: { name: string; state: unknown; notes: string }, coalesce = true) => {
    const at = now()
    Object.assign(formula, { ...copy(values), revision: formula.revision + 1, updatedAt: at })
    const [latest] = formula.revisions
    if (coalesce && formula.revisions.length > 1 && Date.now() - Date.parse(latest.createdAt) < COALESCE_MS) Object.assign(latest, { ...copy(values), updatedAt: at })
    else formula.revisions = [revision(values.name, values.state, values.notes, at), ...formula.revisions].slice(0, HISTORY_LIMIT)
    changed()
    return copy(formula)
  }
  const purge = () => {
    const cutoff = Date.now() - DELETED_DAYS * 24 * 60 * 60 * 1000
    let removed = false
    for (const [id, formula] of store) if (formula.deletedAt && Date.parse(formula.deletedAt) < cutoff) { store.delete(id); removed = true }
    if (removed) changed()
  }
  return {
    list: async () => {
      await wait()
      purge()
      const all = [...store.values()].map(summary).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      return copy({ formulas: all.filter((formula) => !formula.deletedAt), deleted: all.filter((formula) => formula.deletedAt) })
    },
    read: async (id) => { await wait(); return copy(own(id)) },
    create: async ({ recipeSlug, name, state, notes }) => {
      await wait()
      const family = (state as { formula?: { family?: string } }).formula?.family ?? recipeSlug
      return create(recipeSlug, family, name, state, notes)
    },
    save: async (id, { baseRevision, ...values }) => {
      await wait()
      const formula = own(id)
      if (formula.revision !== baseRevision) throw new KitchenError('This formula changed in another tab. Reload to see the latest version.', 409, 'conflict')
      if (nameTaken(values.name, id)) throw new KitchenError('You already have a formula with this name. Choose a different name.', 409, 'name-taken')
      return write(formula, values)
    },
    restore: async (id, revisionId) => {
      await wait()
      const formula = own(id)
      const old = formula.revisions.find((item) => item.id === revisionId)
      if (!old) throw new KitchenError('That version could not be found.', 404, 'not-found')
      return write(formula, { name: old.name, state: old.state, notes: old.notes }, false)
    },
    duplicate: async (id, name) => {
      await wait()
      const formula = own(id)
      return create(formula.recipeSlug, formula.family, name, formula.state, formula.notes)
    },
    remove: async (id) => {
      await wait()
      const formula = own(id)
      formula.deletedAt = now()
      changed()
      return copy(summary(formula))
    },
    undelete: async (id) => {
      await wait()
      const formula = own(id)
      formula.name = freeName(formula.name)
      formula.deletedAt = null
      changed()
      return copy(formula)
    },
  }
}
