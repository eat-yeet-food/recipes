import { randomBytes } from 'node:crypto'
import type { Access, CollectionConfig, Payload } from 'payload'
import { formulaStateErrors, isDoughFormulaState, type DoughFormulaState } from '@eat-yeet/l2-recipe-domain/formula-state'
import { memberRef } from './member-ref'
import { contentServices } from './service'

// Test Kitchen formulas belong to one member and are never public. Like the
// other member collections they have no REST/admin surface; only this
// service's unforgeable capability reaches them.
const kitchenCapability = Symbol.for('eat-yeet.kitchen-service')
const permitted: Access = ({ req }) => req.context.kitchenCapability === kitchenCapability
const context = { kitchenCapability }

export const KITCHEN_LIMITS = {
  nameLength: 80,
  notesLength: 2000,
  stateBytes: 16 * 1024,
  formulas: 200,
  revisions: 100,
  /** Edits this close together collapse into one History entry. */
  coalesceMs: 2 * 60 * 1000,
  deletedDays: 30,
} as const

export const kitchenFormulasCollection: CollectionConfig = {
  slug: 'kitchen-formulas',
  admin: { hidden: true },
  endpoints: false,
  access: { create: permitted, read: permitted, update: permitted, delete: permitted },
  fields: [
    { name: 'formulaId', type: 'text', required: true, unique: true },
    { name: 'member', type: 'relationship', relationTo: 'members', required: true, index: true },
    { name: 'recipeSlug', type: 'text', required: true, index: true, maxLength: 160 },
    { name: 'family', type: 'text', required: true, maxLength: 20 },
    { name: 'name', type: 'text', required: true, maxLength: KITCHEN_LIMITS.nameLength },
    // Unique per member and case-insensitive; deleted formulas release their name.
    { name: 'nameKey', type: 'text', required: true, unique: true },
    { name: 'state', type: 'json', required: true },
    { name: 'notes', type: 'textarea', maxLength: KITCHEN_LIMITS.notesLength },
    { name: 'revision', type: 'number', required: true, defaultValue: 1 },
    { name: 'deletedAt', type: 'date' },
  ],
}

export const kitchenRevisionsCollection: CollectionConfig = {
  slug: 'kitchen-revisions',
  admin: { hidden: true },
  endpoints: false,
  access: { create: permitted, read: permitted, update: permitted, delete: permitted },
  fields: [
    { name: 'formula', type: 'relationship', relationTo: 'kitchen-formulas', required: true, index: true },
    { name: 'member', type: 'relationship', relationTo: 'members', required: true, index: true },
    { name: 'name', type: 'text', required: true, maxLength: KITCHEN_LIMITS.nameLength },
    { name: 'state', type: 'json', required: true },
    { name: 'notes', type: 'textarea', maxLength: KITCHEN_LIMITS.notesLength },
  ],
}

export type KitchenFormulaSummary = {
  id: string
  name: string
  recipeSlug: string
  family: DoughFormulaState['formula']['family']
  state: DoughFormulaState
  revision: number
  updatedAt: string
  deletedAt: string | null
}
export type KitchenRevision = { id: string; name: string; state: DoughFormulaState; notes: string; createdAt: string; updatedAt: string }
export type KitchenFormula = KitchenFormulaSummary & { notes: string; revisions: KitchenRevision[] }
export type KitchenFailure = { error: 'not-found' | 'invalid' | 'name-taken' | 'conflict' | 'limit' }
export type KitchenResult<T> = { ok: T } | KitchenFailure

export type KitchenCreateInput = { recipeSlug: string; name: string; state: unknown; notes: string }
export type KitchenSaveInput = { baseRevision: number; name: string; state: unknown; notes: string }

const formulas = { collection: 'kitchen-formulas', overrideAccess: false, user: null, context, depth: 0 } as const
const revisions = { collection: 'kitchen-revisions', overrideAccess: false, user: null, context, depth: 0 } as const
const formulaIdPattern = /^[A-Za-z0-9_-]{16}$/
const revisionIdPattern = /^\d{1,15}$/

export const cleanFormulaName = (value: string) => value.normalize('NFKC').trim().replace(/\s+/g, ' ')
export const validFormulaId = (value: string) => formulaIdPattern.test(value)
const nameKey = (memberId: string, name: string) => `${memberId}:${cleanFormulaName(name).toLowerCase()}`
const releasedNameKey = (formulaId: string) => `deleted:${formulaId}`
const fail = (error: KitchenFailure['error']): KitchenFailure => ({ error })

function validName(value: unknown): value is string {
  if (typeof value !== 'string') return false
  const name = cleanFormulaName(value)
  return name.length >= 1 && name.length <= KITCHEN_LIMITS.nameLength
}

function validState(value: unknown): value is DoughFormulaState {
  return isDoughFormulaState(value) && JSON.stringify(value).length <= KITCHEN_LIMITS.stateBytes && formulaStateErrors(value).length === 0
}

const validNotes = (value: unknown): value is string => typeof value === 'string' && value.length <= KITCHEN_LIMITS.notesLength

function summary(doc: any): KitchenFormulaSummary {
  return {
    id: String(doc.formulaId),
    name: String(doc.name),
    recipeSlug: String(doc.recipeSlug),
    family: doc.family,
    state: doc.state,
    revision: Number(doc.revision),
    updatedAt: String(doc.updatedAt),
    deletedAt: doc.deletedAt ? String(doc.deletedAt) : null,
  }
}

const revision = (doc: any): KitchenRevision => ({
  id: String(doc.id), name: String(doc.name), state: doc.state, notes: String(doc.notes ?? ''),
  createdAt: String(doc.createdAt), updatedAt: String(doc.updatedAt),
})

async function ownFormula(payload: Payload, memberId: string, formulaId: string) {
  if (!validFormulaId(formulaId)) return null
  return (await payload.find({ ...formulas, limit: 1,
    where: { and: [{ formulaId: { equals: formulaId } }, { member: { equals: memberRef(memberId) } }] } })).docs[0] as any ?? null
}

/** The recipe must be published and offer a calculator for the same dough family. */
async function workbenchRecipe(payload: Payload, slug: string, family: string) {
  if (!/^[a-z0-9-]{1,160}$/.test(slug)) return null
  const { recipe } = await contentServices(payload).recipes.getRecipe({ slug })
  return recipe?.workbench && recipe.workbench.id === family ? recipe : null
}

async function nameTaken(payload: Payload, memberId: string, name: string, exceptFormulaId?: string) {
  const { docs } = await payload.find({ ...formulas, limit: 1, select: { formulaId: true },
    where: { nameKey: { equals: nameKey(memberId, name) } } })
  return Boolean(docs[0] && String((docs[0] as any).formulaId) !== exceptFormulaId)
}

const isUniqueViolation = (error: unknown) => /unique|constraint/i.test(String((error as any)?.message ?? error) + String((error as any)?.cause ?? ''))

/** D1 bounds the parameters in one statement, so large deletes go 90 rows at a time. */
async function deleteWhere(payload: Payload, options: typeof formulas | typeof revisions, where: Record<string, unknown>) {
  while (true) {
    const { docs } = await payload.find({ ...options, limit: 90, select: { id: true }, where: where as any })
    if (!docs.length) return
    await payload.delete({ ...options, where: { id: { in: docs.map((doc) => doc.id) } } })
  }
}

async function pruneRevisions(payload: Payload, formulaDocId: string | number) {
  const { docs } = await payload.find({ ...revisions, pagination: false, sort: '-createdAt', select: { id: true },
    where: { formula: { equals: formulaDocId } } })
  const stale = docs.slice(KITCHEN_LIMITS.revisions).map((doc) => doc.id)
  for (let index = 0; index < stale.length; index += 90)
    await payload.delete({ ...revisions, where: { id: { in: stale.slice(index, index + 90) } } })
}

async function readRevisions(payload: Payload, formulaDocId: string | number) {
  const { docs } = await payload.find({ ...revisions, limit: KITCHEN_LIMITS.revisions, sort: '-createdAt',
    where: { formula: { equals: formulaDocId } } })
  return docs.map(revision)
}

async function fullFormula(payload: Payload, doc: any): Promise<KitchenFormula> {
  return { ...summary(doc), notes: String(doc.notes ?? ''), revisions: await readRevisions(payload, doc.id) }
}

/** Active formulas plus the ones deleted within the last 30 days; older deletions are purged. */
export async function listKitchenFormulas(payload: Payload, memberId: string) {
  const member = memberRef(memberId)
  const cutoff = new Date(Date.now() - KITCHEN_LIMITS.deletedDays * 86400000).toISOString()
  const expired = await payload.find({ ...formulas, pagination: false, select: { id: true },
    where: { and: [{ member: { equals: member } }, { deletedAt: { less_than: cutoff } }] } })
  for (const doc of expired.docs) {
    await deleteWhere(payload, revisions, { formula: { equals: doc.id } })
    await payload.delete({ ...formulas, id: doc.id })
  }
  const { docs } = await payload.find({ ...formulas, pagination: false, sort: '-updatedAt',
    select: { formulaId: true, name: true, recipeSlug: true, family: true, state: true, revision: true, updatedAt: true, deletedAt: true },
    where: { member: { equals: member } } })
  const all = docs.map(summary)
  return { formulas: all.filter((formula) => !formula.deletedAt), deleted: all.filter((formula) => formula.deletedAt) }
}

export async function readKitchenFormula(payload: Payload, memberId: string, formulaId: string): Promise<KitchenResult<KitchenFormula>> {
  const doc = await ownFormula(payload, memberId, formulaId)
  return doc ? { ok: await fullFormula(payload, doc) } : fail('not-found')
}

async function insertFormula(payload: Payload, memberId: string, data: { recipeSlug: string; name: string; state: DoughFormulaState; notes: string }): Promise<KitchenResult<KitchenFormula>> {
  const member = memberRef(memberId)
  const { totalDocs } = await payload.count({ ...formulas, where: { member: { equals: member } } })
  if (totalDocs >= KITCHEN_LIMITS.formulas) return fail('limit')
  const name = cleanFormulaName(data.name)
  if (await nameTaken(payload, memberId, name)) return fail('name-taken')
  let created: any
  try {
    created = await payload.create({ ...formulas, data: {
      formulaId: randomBytes(12).toString('base64url'), member, recipeSlug: data.recipeSlug, family: data.state.formula.family,
      name, nameKey: nameKey(memberId, name), state: data.state as any, notes: data.notes, revision: 1,
    } })
  } catch (error) {
    // A simultaneous save from another tab claimed the name first.
    if (isUniqueViolation(error) && await nameTaken(payload, memberId, name)) return fail('name-taken')
    throw error
  }
  await payload.create({ ...revisions, data: { formula: created.id, member, name, state: data.state as any, notes: data.notes } })
  return { ok: await fullFormula(payload, created) }
}

export async function createKitchenFormula(payload: Payload, memberId: string, input: KitchenCreateInput): Promise<KitchenResult<KitchenFormula>> {
  if (!validName(input.name) || !validState(input.state) || !validNotes(input.notes)) return fail('invalid')
  if (!await workbenchRecipe(payload, input.recipeSlug, input.state.formula.family)) return fail('not-found')
  return insertFormula(payload, memberId, { recipeSlug: input.recipeSlug, name: input.name, state: input.state, notes: input.notes })
}

/**
 * Autosave. The client sends the revision it started from; a newer revision
 * means another tab saved in between, and nothing is overwritten.
 */
export async function saveKitchenFormula(payload: Payload, memberId: string, formulaId: string, input: KitchenSaveInput): Promise<KitchenResult<KitchenFormula>> {
  if (!Number.isSafeInteger(input.baseRevision) || !validName(input.name) || !validState(input.state) || !validNotes(input.notes)) return fail('invalid')
  const doc = await ownFormula(payload, memberId, formulaId)
  if (!doc || doc.deletedAt) return fail('not-found')
  if (Number(doc.revision) !== input.baseRevision) return fail('conflict')
  if (input.state.formula.family !== doc.family) return fail('invalid')
  const name = cleanFormulaName(input.name)
  if (await nameTaken(payload, memberId, name, formulaId)) return fail('name-taken')
  return writeRevision(payload, memberId, doc, { name, state: input.state, notes: input.notes }, true)
}

async function writeRevision(payload: Payload, memberId: string, doc: any, values: { name: string; state: DoughFormulaState; notes: string }, coalesce: boolean): Promise<KitchenResult<KitchenFormula>> {
  let updated: any
  try {
    updated = await payload.update({ ...formulas, id: doc.id, data: {
      name: values.name, nameKey: nameKey(memberId, values.name), state: values.state as any, notes: values.notes, revision: Number(doc.revision) + 1,
    } })
  } catch (error) {
    if (isUniqueViolation(error)) return fail('name-taken')
    throw error
  }
  // The newest entry absorbs quick follow-up edits, except the first entry,
  // which stays the formula as it was created.
  const recent = (await payload.find({ ...revisions, limit: 2, sort: '-createdAt', where: { formula: { equals: doc.id } } })).docs as any[]
  const latest = recent[0]
  const fresh = recent.length > 1 && Date.now() - Date.parse(latest.createdAt) < KITCHEN_LIMITS.coalesceMs
  if (coalesce && fresh) await payload.update({ ...revisions, id: latest.id, data: values as any })
  else {
    await payload.create({ ...revisions, data: { formula: doc.id, member: memberRef(memberId), ...values } as any })
    await pruneRevisions(payload, doc.id)
  }
  return { ok: await fullFormula(payload, updated) }
}

/** Restoring writes the old values as a new History entry, so a restore can itself be undone. */
export async function restoreKitchenRevision(payload: Payload, memberId: string, formulaId: string, revisionId: string): Promise<KitchenResult<KitchenFormula>> {
  if (!revisionIdPattern.test(revisionId)) return fail('not-found')
  const doc = await ownFormula(payload, memberId, formulaId)
  if (!doc || doc.deletedAt) return fail('not-found')
  const old = (await payload.find({ ...revisions, limit: 1,
    where: { and: [{ id: { equals: revisionId } }, { formula: { equals: doc.id } }] } })).docs[0] as any
  if (!old || !validState(old.state)) return fail('not-found')
  // A restored name may since belong to another formula; keep the current name then.
  const name = await nameTaken(payload, memberId, old.name, formulaId) ? String(doc.name) : String(old.name)
  return writeRevision(payload, memberId, doc, { name, state: old.state, notes: String(old.notes ?? '') }, false)
}

export async function duplicateKitchenFormula(payload: Payload, memberId: string, formulaId: string, name: unknown): Promise<KitchenResult<KitchenFormula>> {
  if (!validName(name)) return fail('invalid')
  const doc = await ownFormula(payload, memberId, formulaId)
  if (!doc || doc.deletedAt) return fail('not-found')
  return insertFormula(payload, memberId, { recipeSlug: String(doc.recipeSlug), name, state: doc.state, notes: String(doc.notes ?? '') })
}

/** Deleted formulas stay restorable for 30 days and release their name meanwhile. */
export async function deleteKitchenFormula(payload: Payload, memberId: string, formulaId: string): Promise<KitchenResult<KitchenFormulaSummary>> {
  const doc = await ownFormula(payload, memberId, formulaId)
  if (!doc) return fail('not-found')
  if (doc.deletedAt) return { ok: summary(doc) }
  const updated = await payload.update({ ...formulas, id: doc.id, data: { deletedAt: new Date().toISOString(), nameKey: releasedNameKey(formulaId) } })
  return { ok: summary(updated) }
}

export async function undeleteKitchenFormula(payload: Payload, memberId: string, formulaId: string): Promise<KitchenResult<KitchenFormula>> {
  const doc = await ownFormula(payload, memberId, formulaId)
  if (!doc) return fail('not-found')
  if (!doc.deletedAt) return { ok: await fullFormula(payload, doc) }
  let name = String(doc.name)
  if (await nameTaken(payload, memberId, name)) {
    const suffix = ' (restored)'
    name = `${name.slice(0, KITCHEN_LIMITS.nameLength - suffix.length)}${suffix}`
    if (await nameTaken(payload, memberId, name)) return fail('name-taken')
  }
  const updated = await payload.update({ ...formulas, id: doc.id, data: { deletedAt: null, name, nameKey: nameKey(memberId, name) } as any })
  return { ok: await fullFormula(payload, updated) }
}

/** Account deletion removes every formula and its history. */
export async function deleteMemberKitchen(payload: Payload, memberId: string) {
  const member = memberRef(memberId)
  await deleteWhere(payload, revisions, { member: { equals: member } })
  await deleteWhere(payload, formulas, { member: { equals: member } })
}
