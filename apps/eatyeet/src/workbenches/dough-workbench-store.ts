import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import type { DoughFormula, StarterProfile } from '@eat-yeet/l2-recipe-domain/formula'
import { useAccount, type AccountClient } from '@eat-yeet/l6-ui-shell/account/account'
import { clone, completeFormula, isDoughFormula, type DoughWorkbenchConfig, type InputMode } from './dough-workbench-model'

export interface FormulaPreset {
  id: string
  name: string
  formula: DoughFormula
}

export type WorkbenchStore = {
  modes: Record<string, InputMode>
  presets: FormulaPreset[]
  starterProfiles: Array<{ id: string; name: string; profile: StarterProfile }>
  /** The saved formula each recipe opens with, by recipe slug: the member's last choice. */
  defaults: Record<string, string>
}

export const EMPTY_STORE: WorkbenchStore = { modes: {}, presets: [], starterProfiles: [], defaults: {} }

const formulaKey = (formula: DoughFormula) => {
  const complete = completeFormula(formula)
  const process = complete.process
  const comparable = { ...complete, ...(process ? { process: { ...process, foldMethod: undefined, folds: process.folds.map(({ atMinutes, method }) => ({ atMinutes, method: method ?? process.foldMethod })) } } : {}) }
  return JSON.stringify(comparable, (_key, value) => value && typeof value === 'object' && !Array.isArray(value) ? Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right))) : value)
}
/** Formulas match by value: key order, fold row IDs and inherited fold techniques are ignored. */
export const formulasMatch = (left: DoughFormula, right: DoughFormula) => formulaKey(left) === formulaKey(right)

/** The recipe's own formula for a method: its recommendation where one exists, over the default. */
export const authoredFormula = (config: DoughWorkbenchConfig, methodId: string): DoughFormula =>
  completeFormula({ ...clone(config.defaultSelection.formula), ...clone(config.recommendedFormulas[methodId] ?? {}) }, config.defaultSelection.formula)
export const isAuthoredFormula = (config: DoughWorkbenchConfig, formula: DoughFormula) =>
  formulasMatch(config.defaultSelection.formula, formula) || Object.values(config.recommendedFormulas).some((recommended) => formulasMatch(recommended, formula))

/** Remembers the member's choice for a recipe; no preset means the authored recipe. */
export const withRecipeChoice = (store: WorkbenchStore, slug: string, presetId?: string): WorkbenchStore => ({
  ...store,
  defaults: presetId ? { ...store.defaults, [slug]: presetId } : Object.fromEntries(Object.entries(store.defaults).filter(([key]) => key !== slug)),
})

export function normalizeStore(value: any): WorkbenchStore {
  return value && typeof value === 'object'
    ? { ...EMPTY_STORE, ...value, modes: value.modes ?? {}, defaults: value.defaults ?? {}, presets: Array.isArray(value.presets) ? value.presets.filter((preset: FormulaPreset) => preset && typeof preset.id === 'string' && typeof preset.name === 'string' && isDoughFormula(preset.formula)) : [], starterProfiles: value.starterProfiles ?? [] }
    : clone(EMPTY_STORE)
}

type Snapshot = { store: WorkbenchStore; status: 'loading' | 'ready' | 'failed' }
type Entry = { snapshot: Snapshot; listeners: Set<() => void>; reading: Promise<void> | null; writes: Promise<unknown>; revision: number }
const SIGNED_OUT: Snapshot = { store: EMPTY_STORE, status: 'loading' }

// The recipe page and the calculator show the same member store, so one copy
// per account transport is shared and every write is seen by both.
const entries = new WeakMap<AccountClient, Map<string, Entry>>()
function entryFor(client: AccountClient, key: string) {
  let scoped = entries.get(client)
  if (!scoped) entries.set(client, scoped = new Map())
  let entry = scoped.get(key)
  if (!entry) scoped.set(key, entry = { snapshot: { store: EMPTY_STORE, status: 'loading' }, listeners: new Set(), reading: null, writes: Promise.resolve(), revision: 0 })
  return entry
}
function publish(entry: Entry, snapshot: Snapshot) {
  entry.snapshot = snapshot
  for (const listener of entry.listeners) listener()
}
function read(entry: Entry, client: AccountClient, storageKey: string) {
  entry.reading ??= (async () => {
    const revision = entry.revision
    try {
      const store = normalizeStore(await client.readWorkbench(storageKey))
      // A write that finished during this read is newer than what the read returned.
      if (entry.revision === revision) publish(entry, { store, status: 'ready' })
    } catch {
      if (entry.snapshot.status !== 'ready') publish(entry, { ...entry.snapshot, status: 'failed' })
    } finally { entry.reading = null }
  })()
  return entry.reading
}

export type WorkbenchStoreUpdate = WorkbenchStore | ((current: WorkbenchStore) => WorkbenchStore)

/**
 * The signed-in member's saved formulas for a storage scope. Mounting reads
 * the account again; writes run in order and resolve false when the store has
 * not loaded or the account rejects them.
 */
export function useWorkbenchStore(storageScope: string) {
  const { member, client } = useAccount()
  const memberId = member?.id ?? null
  const storageKey = `${storageScope}:recipe-workbench:v1`
  const entry = memberId ? entryFor(client, `${memberId}:${storageKey}`) : null
  const subscribe = useCallback((listener: () => void) => {
    entry?.listeners.add(listener)
    return () => { entry?.listeners.delete(listener) }
  }, [entry])
  const snapshot = useSyncExternalStore(subscribe, () => entry?.snapshot ?? SIGNED_OUT, () => SIGNED_OUT)
  const [persisting, setPersisting] = useState(false)

  useEffect(() => { if (entry) void read(entry, client, storageKey) }, [entry, client, storageKey])

  const persist = useCallback(async (update: WorkbenchStoreUpdate) => {
    if (!entry || entry.snapshot.status !== 'ready') return false
    setPersisting(true)
    const write = entry.writes.then(async () => {
      const next = typeof update === 'function' ? update(entry.snapshot.store) : update
      await client.writeWorkbench(storageKey, next)
      entry.revision += 1
      publish(entry, { store: next, status: 'ready' })
    })
    entry.writes = write.catch(() => {})
    try { await write; return true } catch { return false } finally { setPersisting(false) }
  }, [entry, client, storageKey])

  return { store: snapshot.store, status: snapshot.status, persisting, persist }
}
