import { createHash, randomBytes } from 'node:crypto'
import { AuthenticationError, LockedAuth, UnverifiedEmail, type Access, type CollectionConfig, type Payload } from 'payload'

// Members are public site accounts. They never reach Payload admin or REST:
// every collection sets `endpoints: false`, and only this service's
// unforgeable capability (never serializable from JSON) grants access.
const memberCapability = Symbol.for('eat-yeet.member-service')
export const memberContext = { memberCapability }
export const memberPermitted: Access = ({ req }) => req.context.memberCapability === memberCapability
const hidden = { hidden: true }

export const SESSION_DAYS = 30
const EMAIL_WINDOW_MS = 24 * 60 * 60 * 1000
const EMAIL_COOLDOWN_MS = 60 * 1000
const EMAIL_DAILY_LIMIT = 5
export const WORKBENCH_BYTES = 64 * 1024
export const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export type AccountEmailLinks = { verify: (token: string) => string; reset: (token: string) => string }

const emailShell = (heading: string, body: string, href: string, action: string) =>
  `<div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;color:#1d1a16">` +
  `<h1 style="font-size:22px">${heading}</h1><p>${body}</p>` +
  `<p><a href="${href}" style="display:inline-block;background:#f5cf00;color:#1d1a16;padding:12px 20px;border-radius:8px;font-weight:700;text-decoration:none">${action}</a></p>` +
  `<p style="font-size:13px;color:#5c554c">If you didn’t request this, you can ignore this email.</p></div>`

export function membersCollection(links: AccountEmailLinks): CollectionConfig {
  return {
    slug: 'members',
    admin: { hidden: true, useAsTitle: 'email' },
    endpoints: false,
    auth: {
      tokenExpiration: 300,
      maxLoginAttempts: 5,
      lockTime: 600000,
      useSessions: false,
      removeTokenFromResponses: true,
      verify: {
        generateEmailSubject: () => 'Confirm your Eat / Yeet account',
        generateEmailHTML: ({ token }) => emailShell('Confirm your email',
          'Confirm this address to finish creating your Eat / Yeet account.', links.verify(String(token)), 'Confirm email'),
      },
      forgotPassword: {
        expiration: 3600000,
        generateEmailSubject: () => 'Reset your Eat / Yeet password',
        generateEmailHTML: (args) => emailShell('Reset your password',
          'This link expires in one hour.', links.reset(String(args?.token)), 'Choose a new password'),
      },
    },
    access: { admin: () => false, create: memberPermitted, read: memberPermitted, update: memberPermitted, delete: memberPermitted },
    fields: [
      { name: 'displayName', type: 'text', required: true, maxLength: 80 },
      { name: 'displayNameConfirmed', type: 'checkbox', defaultValue: false, admin: hidden },
      { name: 'googleSubject', type: 'text', unique: true, index: true, admin: hidden },
      { name: 'hasPassword', type: 'checkbox', defaultValue: false, admin: hidden },
      { name: 'emailWindowStart', type: 'date', admin: hidden },
      { name: 'emailCount', type: 'number', defaultValue: 0, admin: hidden },
      { name: 'emailSentAt', type: 'date', admin: hidden },
    ],
  }
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
  hasPassword: boolean
  google: boolean
}

const options = { overrideAccess: false, user: null, context: memberContext, depth: 0 } as const
/** Public member IDs are strings; D1 relationships store numeric IDs. */
export const memberRef = (id: string | number) => typeof id === 'number' ? id : /^\d{1,15}$/.test(id) ? Number(id) : id
const hashToken = (token: string) => createHash('sha256').update(token).digest('hex')
export const normalizeEmail = (value: string) => value.trim().toLowerCase()
export const cleanDisplayName = (value: string) => value.normalize('NFKC').trim().replace(/\s+/g, ' ')
export const validDisplayName = (value: string) => { const name = cleanDisplayName(value); return name.length >= 1 && name.length <= 80 }
export const validPassword = (value: string) => value.length >= 10 && value.length <= 200

function publicMember(doc: any): Member {
  return {
    id: String(doc.id),
    email: String(doc.email),
    displayName: String(doc.displayName),
    displayNameConfirmed: Boolean(doc.displayNameConfirmed),
    hasPassword: Boolean(doc.hasPassword),
    google: Boolean(doc.googleSubject),
  }
}

// Payload guards its auth bookkeeping fields (verification, lockout) behind a
// signed-in user. Like Payload's own auth operations, this service reads and
// writes those internal fields through the database adapter.
const rawMember = (payload: Payload, where: Record<string, any>) =>
  payload.db.findOne({ collection: 'members', where }) as Promise<any>
const writeAuthFields = (payload: Payload, id: string | number, data: Record<string, unknown>) =>
  payload.db.updateOne({ collection: 'members', id, data, returning: false })
const memberByEmail = (payload: Payload, email: string) => rawMember(payload, { email: { equals: normalizeEmail(email) } })

/** Bound outgoing mail per address so account forms cannot be used to flood an inbox. */
async function reserveEmail(payload: Payload, member: any, now = Date.now()) {
  const windowStart = member.emailWindowStart ? Date.parse(member.emailWindowStart) : 0
  const fresh = !windowStart || now - windowStart > EMAIL_WINDOW_MS
  const count = fresh ? 0 : Number(member.emailCount ?? 0)
  const sentAt = member.emailSentAt ? Date.parse(member.emailSentAt) : 0
  if (count >= EMAIL_DAILY_LIMIT || now - sentAt < EMAIL_COOLDOWN_MS) return false
  await payload.update({ collection: 'members', ...options, id: member.id, data: {
    emailWindowStart: new Date(fresh ? now : windowStart).toISOString(), emailCount: count + 1, emailSentAt: new Date(now).toISOString() } })
  return true
}

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

/**
 * Registration never reveals whether an address exists. A verified account is
 * left untouched. An unverified account belongs to nobody yet, so a repeat
 * registration replaces its password and sends a fresh confirmation link.
 */
export async function registerMember(payload: Payload, input: { email: string; password: string; displayName: string }) {
  const email = normalizeEmail(input.email)
  const existing = await memberByEmail(payload, email)
  if (existing && existing._verified !== false) return
  if (existing) {
    if (!(await reserveEmail(payload, existing))) return
    const token = randomBytes(20).toString('hex')
    await payload.update({ collection: 'members', ...options, id: existing.id,
      data: { password: input.password, hasPassword: true, displayName: cleanDisplayName(input.displayName), displayNameConfirmed: true } as any })
    await writeAuthFields(payload, existing.id, { _verificationToken: token })
    const member = payload.collections.members.config
    await payload.sendEmail({ to: email, subject: await (member.auth.verify as any).generateEmailSubject({}),
      html: await (member.auth.verify as any).generateEmailHTML({ token }) })
    return
  }
  const now = new Date().toISOString()
  await payload.create({ collection: 'members', ...options, data: {
    email, password: input.password, hasPassword: true, displayName: cleanDisplayName(input.displayName), displayNameConfirmed: true,
    emailWindowStart: now, emailCount: 1, emailSentAt: now } as any })
}

export async function verifyMemberEmail(payload: Payload, token: string) {
  if (!/^[a-f0-9]{20,128}$/.test(token)) return false
  try { return Boolean(await payload.verifyEmail({ collection: 'members', token })) }
  catch { return false }
}

export type LoginResult = { ok: true; member: Member } | { ok: false; reason: 'invalid' | 'locked' | 'unverified' }
export async function loginMember(payload: Payload, email: string, password: string): Promise<LoginResult> {
  try {
    const { user } = await payload.login({ collection: 'members', data: { email: normalizeEmail(email), password } }) as any
    return { ok: true, member: publicMember(user) }
  } catch (error) {
    if (error instanceof LockedAuth) return { ok: false, reason: 'locked' }
    if (error instanceof UnverifiedEmail) return { ok: false, reason: 'unverified' }
    if (error instanceof AuthenticationError) return { ok: false, reason: 'invalid' }
    throw error
  }
}

export async function forgotMemberPassword(payload: Payload, email: string) {
  const member = await memberByEmail(payload, email)
  if (!member || !(await reserveEmail(payload, member))) return
  await payload.forgotPassword({ collection: 'members', data: { email: normalizeEmail(email) } })
}

/** A completed reset proves control of the address, so it also confirms it. */
export async function resetMemberPassword(payload: Payload, token: string, password: string) {
  if (!/^[a-f0-9]{20,128}$/.test(token)) return null
  try {
    const { user } = await payload.resetPassword({ collection: 'members', overrideAccess: true, data: { token, password } }) as any
    await payload.update({ collection: 'members', ...options, id: user.id, data: { hasPassword: true } })
    await writeAuthFields(payload, user.id, { _verified: true, _verificationToken: null, loginAttempts: 0, lockUntil: null })
    await revokeAllSessions(payload, user.id)
    return String(user.id)
  } catch { return null }
}

export type GoogleProfile = { sub: string; email: string; emailVerified: boolean; name: string }
/**
 * Google proves the address, so it can claim an existing email account. If
 * that account never confirmed its email, its password came from whoever
 * registered it first and is discarded.
 */
export async function upsertGoogleMember(payload: Payload, profile: GoogleProfile): Promise<Member | null> {
  if (!profile.emailVerified || !/^[0-9A-Za-z_-]{1,255}$/.test(profile.sub) || !emailPattern.test(profile.email)) return null
  const bySubject = await rawMember(payload, { googleSubject: { equals: profile.sub } })
  if (bySubject) return publicMember(bySubject)
  const email = normalizeEmail(profile.email)
  const displayName = cleanDisplayName(profile.name).slice(0, 80) || email.split('@')[0]!.slice(0, 80)
  const existing = await memberByEmail(payload, email)
  if (existing) {
    const unverified = existing._verified === false
    const updated = await payload.update({ collection: 'members', ...options, id: existing.id, data: {
      googleSubject: profile.sub,
      ...(unverified ? { password: randomBytes(32).toString('base64url'), hasPassword: false, displayNameConfirmed: false, displayName } : {}),
    } as any })
    await writeAuthFields(payload, existing.id, { _verified: true, _verificationToken: null })
    if (unverified) await revokeAllSessions(payload, existing.id)
    return publicMember(updated)
  }
  const created = await payload.create({ collection: 'members', ...options, disableVerificationEmail: true, data: {
    email, password: randomBytes(32).toString('base64url'), hasPassword: false, googleSubject: profile.sub,
    displayName, displayNameConfirmed: false } as any })
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

export type PasswordChange = { ok: true } | { ok: false; reason: 'invalid' | 'locked' | 'weak' }
/**
 * Members with a password must prove it (with Payload's lockout); Google-only
 * members may add one. Every existing session is revoked afterwards.
 */
export async function changeMemberPassword(payload: Payload, member: Member, current: string | null, next: string): Promise<PasswordChange> {
  if (!validPassword(next)) return { ok: false, reason: 'weak' }
  if (member.hasPassword) {
    const login = await loginMember(payload, member.email, current ?? '')
    if (!login.ok) return { ok: false, reason: login.reason === 'locked' ? 'locked' : 'invalid' }
  }
  await payload.update({ collection: 'members', ...options, id: memberRef(member.id), data: { password: next, hasPassword: true } as any })
  await revokeAllSessions(payload, memberRef(member.id))
  return { ok: true }
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
