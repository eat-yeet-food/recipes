'use client'
import { useEffect, useMemo, useState } from 'react'
import { useAccount } from '@eat-yeet/l6-ui-shell/account/account'
import { KitchenError, type KitchenClient, type KitchenFormula } from './kitchen-client'
import { kitchenStoreClient } from './kitchen-store'

// Signed-out formulas live in this browser until the visitor signs in; then
// they move to the account and these keys only redirect old local links.
const FORMULAS_KEY = 'eatyeet:kitchen:formulas'
const MOVED_KEY = 'eatyeet:kitchen:moved'
/** Local IDs share the route's 16-character shape and are easy to tell apart. */
export const LOCAL_ID_PREFIX = 'local'
export const isLocalFormulaId = (id: string) => id.startsWith(LOCAL_ID_PREFIX)

const readJson = <T,>(key: string, fallback: T): T => {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) as T : fallback } catch { return fallback }
}
const readFormulas = () => { const value = readJson<unknown>(FORMULAS_KEY, []); return Array.isArray(value) ? value as KitchenFormula[] : [] }
const writeFormulas = (formulas: KitchenFormula[]) => {
  try {
    if (formulas.length) localStorage.setItem(FORMULAS_KEY, JSON.stringify(formulas))
    else localStorage.removeItem(FORMULAS_KEY)
  } catch { throw new KitchenError('This browser could not keep your formula. Sign in to save it to your account.', 507) }
}
const readMoved = () => readJson<Record<string, string>>(MOVED_KEY, {})
const newLocalId = () => {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const bytes = crypto.getRandomValues(new Uint8Array(16 - LOCAL_ID_PREFIX.length))
  return LOCAL_ID_PREFIX + [...bytes].map((byte) => alphabet[byte % alphabet.length]).join('')
}

/**
 * Notebook in this browser. Every call rereads storage, so two tabs see each
 * other's saves and a stale revision is refused, as on the server.
 */
const browserStore = () => kitchenStoreClient({ formulas: readFormulas(), onChange: writeFormulas, newId: newLocalId })
export const localKitchenClient: KitchenClient = {
  list: () => browserStore().list(),
  read: (id) => browserStore().read(id),
  create: (input) => browserStore().create(input),
  save: (id, input) => browserStore().save(id, input),
  restore: (id, revisionId) => browserStore().restore(id, revisionId),
  duplicate: (id, name) => browserStore().duplicate(id, name),
  remove: (id) => browserStore().remove(id),
  undelete: (id) => browserStore().undelete(id),
}

/** Signed-in calls accept the local IDs of formulas that moved to the account. */
const movedAware = (remote: KitchenClient): KitchenClient => {
  const id = (value: string) => readMoved()[value] ?? value
  return {
    ...remote,
    read: (formulaId) => remote.read(id(formulaId)),
    save: (formulaId, input) => remote.save(id(formulaId), input),
    restore: (formulaId, revisionId) => remote.restore(id(formulaId), revisionId),
    duplicate: (formulaId, name) => remote.duplicate(id(formulaId), name),
    remove: (formulaId) => remote.remove(id(formulaId)),
    undelete: (formulaId) => remote.undelete(id(formulaId)),
  }
}

let moving: Promise<number> | null = null
/**
 * Moves this browser's formulas to the account, oldest first, keeping names
 * (the server picks a free variant) and current values. Each formula leaves
 * the browser only after the account has it, so an interrupted move resumes
 * on the next visit. Recently deleted local formulas are not moved.
 */
export function moveLocalFormulas(remote: KitchenClient) {
  moving ??= (async () => {
    let count = 0
    try {
      const pending = readFormulas().filter((formula) => !formula.deletedAt).sort((a, b) => a.updatedAt.localeCompare(b.updatedAt))
      for (const formula of pending) {
        const created = await remote.create({ recipeSlug: formula.recipeSlug, name: formula.name, state: formula.state, notes: formula.notes })
        try { localStorage.setItem(MOVED_KEY, JSON.stringify({ ...readMoved(), [formula.id]: created.id })) } catch {}
        writeFormulas(readFormulas().filter((item) => item.id !== formula.id))
        count += 1
      }
      writeFormulas(readFormulas().filter((item) => !item.deletedAt))
    } catch {} finally { moving = null }
    return count
  })()
  return moving
}

export type NotebookClient = {
  /** Null while the account is being checked or local formulas are moving. */
  client: KitchenClient | null
  /** True when formulas are kept in this browser. */
  local: boolean
  /** How many local formulas just moved to the account. */
  moved: number
}

/** Signed out, Notebook keeps formulas in this browser; signing in moves them to the account. */
export function useNotebookClient(remote: KitchenClient): NotebookClient {
  const { status } = useAccount()
  const [moved, setMoved] = useState<number | null>(null)
  useEffect(() => {
    if (status !== 'signed-in') { setMoved(null); return }
    let active = true
    void moveLocalFormulas(remote).then((count) => { if (active) setMoved(count) })
    return () => { active = false }
  }, [status, remote])
  const signedIn = useMemo(() => movedAware(remote), [remote])
  if (status === 'signed-out') return { client: localKitchenClient, local: true, moved: 0 }
  if (status === 'signed-in' && moved !== null) return { client: signedIn, local: false, moved }
  return { client: null, local: false, moved: 0 }
}
