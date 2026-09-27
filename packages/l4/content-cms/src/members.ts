import { createHash, randomBytes } from 'node:crypto'
import type { Access, CollectionConfig, Payload } from 'payload'

// Members are public site accounts created only through Google sign-in. They
// never reach Payload admin or REST: every collection sets `endpoints: false`,
// and only this service's unforgeable capability (never serializable from
// JSON) grants access.
const memberCapability = Symbol.for('eat-yeet.member-service')
export const memberContext = { memberCapability }
export const memberPermitted: Access = ({ req }) => req.context.memberCapability === memberCapability
const hidden = { hidden: true }

export const SESSION_DAYS = 30
export const WORKBENCH_BYTES = 64 * 1024
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * The first release also offered email/password accounts. Payload's auth
 * columns (password hash, verification, lockout) and the retired fields below
 * stay declared only so the shared schema remains additive for online
 * releases; nothing reads or writes them. Dropping them is a separately
 * reviewed maintenance migration.
 */
export const membersCollection: CollectionConfig = {
  slug: 'members',
  admin: { hidden: true, useAsTitle: 'email' },
  endpoints: false,
  auth: { maxLoginAttempts: 5, lockTime: 600000, useSessions: false, removeTokenFromResponses: true, verify: true },
  access: { admin: () => false, create: memberPermitted, read: memberPermitted, update: memberPermitted, delete: memberPermitted },
  fields: [
    { name: 'displayName', type: 'text', required: true, maxLength: 80 },
    { name: 'displayNameConfirmed', type: 'checkbox', defaultValue: false, admin: hidden },
    { name: 'googleSubject', type: 'text', unique: true, index: true, admin: hidden },
    // Retired: see above.
    { name: 'hasPassword', type: 'checkbox', defaultValue: false, admin: hidden },
    { name: 'emailWindowStart', type: 'date', admin: hidden },
    { name: 'emailCount', type: 'number', defaultValue: 0, admin: hidden },
    { name: 'emailSentAt', type: 'date', admin: hidden },
  ],
}

export const memberSessionsCollection: CollectionConfig = {
  slug: 'member-sessions',
  admin: { hidden: true },
  endpoints: false,
  access: { create: memberPermitted, read: memberPermitted, update: memberPermitted, delete: memberPermitted },
  fields: [
    { name: 'tokenHash', type: 'text', required: true, unique: true },
    { name: 'member', type: 'relationship', relationTo: 'members', required: true, index: true },
    { name: 'expiresAt', type: 'date', required: true },
    { name: 'revokedAt', type: 'date' },
  ],
}

export const memberWorkbenchesCollection: CollectionConfig = {
  slug: 'member-workbenches',
  admin: { hidden: true },
  endpoints: false,
  access: { create: memberPermitted, read: memberPermitted, update: memberPermitted, delete: memberPermitted },
  fields: [
    { name: 'workbenchKey', type: 'text', required: true, unique: true },
    { name: 'member', type: 'relationship', relationTo: 'members', required: true, index: true },
    { name: 'scope', type: 'text', required: true, maxLength: 200 },
    { name: 'store', type: 'json', required: true },
  ],
}

export type Member = {
  id: string
  email: string
  displayName: string
  displayNameConfirmed: boolean
}

const options = { overrideAccess: false, user: null, context: memberContext, depth: 0 } as const
/** Public member IDs are strings; D1 relationships store numeric IDs. */
export const memberRef = (id: string | number) => typeof id === 'number' ? id : /^\d{1,15}$/.test(id) ? Number(id) : id
const hashToken = (token: string) => createHash('sha256').update(token).digest('hex')
const normalizeEmail = (value: string) => value.trim().toLowerCase()
export const cleanDisplayName = (value: string) => value.normalize('NFKC').trim().replace(/\s+/g, ' ')
export const validDisplayName = (value: string) => { const name = cleanDisplayName(value); return name.length >= 1 && name.length <= 80 }

function publicMember(doc: any): Member {
  return {
    id: String(doc.id),
    email: String(doc.email),
    displayName: String(doc.displayName),
    displayNameConfirmed: Boolean(doc.displayNameConfirmed),
  }
}

// Payload guards its auth bookkeeping fields behind a signed-in user. Like
// Payload's own auth operations, this service reads and writes those internal
// fields through the database adapter.
const rawMember = (payload: Payload, where: Record<string, any>) =>
  payload.db.findOne({ collection: 'members', where }) as Promise<any>
const writeAuthFields = (payload: Payload, id: string | number, data: Record<string, unknown>) =>
  payload.db.updateOne({ collection: 'members', id, data, returning: false })

export async function createSession(payload: Payload, memberId: string | number) {
  const token = randomBytes(32).toString('base64url')
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400000)
  await payload.create({ collection: 'member-sessions', ...options,
    data: { tokenHash: hashToken(token), member: memberRef(memberId), expiresAt: expiresAt.toISOString() } })
  return { token, expiresAt }
}

export async function sessionMember(payload: Payload, token: string | undefined): Promise<Member | null> {
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null
  const session = (await payload.find({ collection: 'member-sessions', ...options, limit: 1,
    where: { tokenHash: { equals: hashToken(token) } } })).docs[0] as any
  if (!session || session.revokedAt || Date.parse(session.expiresAt) <= Date.now()) return null
  const member = await rawMember(payload, { id: { equals: session.member } })
  if (!member || member._verified === false) return null
  return publicMember(member)
}

export async function revokeSession(payload: Payload, token: string | undefined) {
  if (!token) return
  await payload.update({ collection: 'member-sessions', ...options, where: { tokenHash: { equals: hashToken(token) } },
    data: { revokedAt: new Date().toISOString() } })
}

export async function revokeAllSessions(payload: Payload, memberId: string | number) {
  await payload.update({ collection: 'member-sessions', ...options,
    where: { and: [{ member: { equals: memberRef(memberId) } }, { revokedAt: { exists: false } }] },
    data: { revokedAt: new Date().toISOString() } })
}

export type GoogleProfile = { sub: string; email: string; emailVerified: boolean; name: string }
/** Google proves the address. A member is found by Google subject, then by email. */
export async function upsertGoogleMember(payload: Payload, profile: GoogleProfile): Promise<Member | null> {
  if (!profile.emailVerified || !/^[0-9A-Za-z_-]{1,255}$/.test(profile.sub) || !emailPattern.test(profile.email)) return null
  const bySubject = await rawMember(payload, { googleSubject: { equals: profile.sub } })
  if (bySubject) return publicMember(bySubject)
  const email = normalizeEmail(profile.email)
  const existing = await rawMember(payload, { email: { equals: email } })
  if (existing) return publicMember(await payload.update({ collection: 'members', ...options, id: existing.id, data: { googleSubject: profile.sub } }))
  const displayName = cleanDisplayName(profile.name).slice(0, 80) || email.split('@')[0]!.slice(0, 80)
  // Payload's auth collection requires a password; members never learn or use it.
  const created = await payload.create({ collection: 'members', ...options, disableVerificationEmail: true, data: {
    email, password: randomBytes(32).toString('base64url'), googleSubject: profile.sub, displayName, displayNameConfirmed: false } as any })
  await writeAuthFields(payload, created.id, { _verified: true, _verificationToken: null })
  return publicMember(created)
}

export async function updateDisplayName(payload: Payload, memberId: string, displayName: string) {
  if (!validDisplayName(displayName)) return null
  const updated = await payload.update({ collection: 'members', ...options, id: memberRef(memberId),
    data: { displayName: cleanDisplayName(displayName), displayNameConfirmed: true } })
  return publicMember(updated)
}

export async function memberNames(payload: Payload, ids: Array<string | number>) {
  const names = new Map<string, string>()
  const unique = [...new Set(ids.map(String))]
  // D1 limits bound parameters per statement.
  for (let index = 0; index < unique.length; index += 90) {
    const { docs } = await payload.find({ collection: 'members', ...options, pagination: false, select: { displayName: true },
      where: { id: { in: unique.slice(index, index + 90) } } })
    for (const doc of docs as any[]) names.set(String(doc.id), String(doc.displayName))
  }
  return names
}

const workbenchKey = (memberId: string, scope: string) => `${memberId}:${scope}`
export const validWorkbenchScope = (scope: string) => /^[a-z0-9.-]{1,120}:recipe-workbench:v1$/.test(scope)

export async function readWorkbench(payload: Payload, memberId: string, scope: string) {
  const doc = (await payload.find({ collection: 'member-workbenches', ...options, limit: 1,
    where: { workbenchKey: { equals: workbenchKey(memberId, scope) } } })).docs[0] as any
  return doc ? doc.store : null
}

/** The workbench store is the member's own opaque data; the client validates formulas on read. */
export function validWorkbenchStore(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const store = value as Record<string, unknown>
  const record = (item: unknown) => item && typeof item === 'object' && !Array.isArray(item)
  return Object.keys(store).every((key) => ['modes', 'presets', 'starterProfiles', 'defaults'].includes(key)) &&
    Array.isArray(store.presets) && store.presets.length <= 200 &&
    store.presets.every((preset: any) => record(preset) && typeof preset.id === 'string' && preset.id.length <= 100 &&
      typeof preset.name === 'string' && preset.name.length <= 80 && record(preset.formula)) &&
    (store.starterProfiles === undefined || (Array.isArray(store.starterProfiles) && store.starterProfiles.length <= 100)) &&
    (store.modes === undefined || record(store.modes)) && (store.defaults === undefined || record(store.defaults))
}

export async function writeWorkbench(payload: Payload, memberId: string, scope: string, store: unknown) {
  const key = workbenchKey(memberId, scope)
  const existing = (await payload.find({ collection: 'member-workbenches', ...options, limit: 1,
    where: { workbenchKey: { equals: key } } })).docs[0]
  if (existing) await payload.update({ collection: 'member-workbenches', ...options, id: existing.id, data: { store: store as any } })
  else {
    try { await payload.create({ collection: 'member-workbenches', ...options, data: { workbenchKey: key, member: memberRef(memberId), scope, store: store as any } }) }
    catch (error) {
      // A concurrent first save from another tab created the row.
      const raced = (await payload.find({ collection: 'member-workbenches', ...options, limit: 1, where: { workbenchKey: { equals: key } } })).docs[0]
      if (!raced) throw error
      await payload.update({ collection: 'member-workbenches', ...options, id: raced.id, data: { store: store as any } })
    }
  }
  return store
}

/** Removes the member and everything they wrote or saved. Threads on their reviews go too. */
export async function deleteMember(payload: Payload, memberId: string) {
  const id = memberRef(memberId)
  const ratingOptions = { overrideAccess: false, user: null, depth: 0, context: { ratingCapability: Symbol.for('eat-yeet.recipe-rating-service') } } as const
  const reviews = await payload.find({ collection: 'recipe-reviews', ...ratingOptions, pagination: false, select: { id: true }, where: { member: { equals: id } } })
  for (let index = 0; index < reviews.docs.length; index += 90)
    await payload.delete({ collection: 'recipe-review-replies', ...ratingOptions, where: { review: { in: reviews.docs.slice(index, index + 90).map((doc) => doc.id) } } })
  await payload.delete({ collection: 'recipe-review-replies', ...ratingOptions, where: { member: { equals: id } } })
  await payload.delete({ collection: 'recipe-reviews', ...ratingOptions, where: { member: { equals: id } } })
  await payload.delete({ collection: 'member-workbenches', ...options, where: { member: { equals: id } } })
  await payload.delete({ collection: 'member-sessions', ...options, where: { member: { equals: id } } })
  await payload.delete({ collection: 'members', ...options, id })
}
