import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import type { Access, CollectionConfig, Payload, Where } from 'payload'
import { memberRef } from './member-ref'

/**
 * OAuth 2.1 for the owner's MCP connector (ChatGPT, Claude). Chat clients
 * register themselves (RFC 7591), send the owner through Google sign-in with
 * PKCE, and receive short-lived access tokens plus rotating refresh tokens.
 * Only SHA-256 hashes of codes and tokens are stored. Like the member
 * collections, these have no REST/admin surface; only this service's
 * unforgeable capability reaches them.
 */
const mcpCapability = Symbol.for('eat-yeet.mcp-auth-service')
const permitted: Access = ({ req }) => req.context.mcpCapability === mcpCapability
const options = { overrideAccess: false, user: null, depth: 0, context: { mcpCapability } } as const
const hidden = { admin: { hidden: true }, endpoints: false as const,
  access: { admin: () => false, create: permitted, read: permitted, update: permitted, delete: permitted } }

export const MCP_AUTH = { codeSeconds: 60, accessSeconds: 3600, refreshDays: 30, clients: 200 } as const

export const mcpClientsCollection: CollectionConfig = {
  slug: 'mcp-clients', ...hidden,
  fields: [
    { name: 'clientId', type: 'text', required: true, unique: true },
    { name: 'name', type: 'text', maxLength: 200 },
    { name: 'redirectUris', type: 'json', required: true },
  ],
}

export const mcpCodesCollection: CollectionConfig = {
  slug: 'mcp-codes', ...hidden,
  fields: [
    { name: 'codeHash', type: 'text', required: true, unique: true },
    { name: 'clientId', type: 'text', required: true },
    { name: 'redirectUri', type: 'text', required: true },
    { name: 'challenge', type: 'text', required: true },
    { name: 'member', type: 'relationship', relationTo: 'members', required: true, index: true },
    { name: 'expiresAt', type: 'date', required: true },
  ],
}

export const mcpTokensCollection: CollectionConfig = {
  slug: 'mcp-tokens', ...hidden,
  fields: [
    { name: 'accessHash', type: 'text', required: true, unique: true },
    { name: 'refreshHash', type: 'text', required: true, unique: true },
    { name: 'clientId', type: 'text', required: true, index: true },
    { name: 'member', type: 'relationship', relationTo: 'members', required: true, index: true },
    { name: 'accessExpiresAt', type: 'date', required: true },
    { name: 'refreshExpiresAt', type: 'date', required: true },
    { name: 'revokedAt', type: 'date' },
  ],
}

const hash = (value: string) => createHash('sha256').update(value).digest('hex')
const secret = () => randomBytes(32).toString('base64url')
const tokenPattern = /^[A-Za-z0-9_-]{43}$/
const clientPattern = /^mcp_[A-Za-z0-9_-]{32}$/

/**
 * Where a code may be sent: the chat products' HTTPS callbacks, and loopback
 * for local tools (MCP Inspector, Claude Code). Nothing else, so a stolen
 * client registration can't send codes to an attacker's site.
 */
export function allowedRedirect(uri: unknown): uri is string {
  if (typeof uri !== 'string' || uri.length > 500) return false
  let url: URL
  try { url = new URL(uri) } catch { return false }
  if (url.hash || url.username || url.password) return false
  if (url.protocol === 'https:' && ['chatgpt.com', 'chat.openai.com', 'platform.openai.com', 'claude.ai', 'claude.com'].includes(url.hostname) && !url.port) return true
  const host = url.hostname.replace(/^\[(.*)\]$/, '$1')
  return url.protocol === 'http:' && ['localhost', '127.0.0.1', '::1'].includes(host)
}

export type McpClient = { clientId: string; name: string; redirectUris: string[] }

export async function registerMcpClient(payload: Payload, input: { name?: unknown; redirectUris: unknown }): Promise<McpClient | { error: string }> {
  const uris = input.redirectUris
  if (!Array.isArray(uris) || uris.length < 1 || uris.length > 10 || !uris.every(allowedRedirect)) return { error: 'invalid_redirect_uri' }
  const { totalDocs } = await payload.count({ collection: 'mcp-clients', ...options })
  if (totalDocs >= MCP_AUTH.clients) return { error: 'temporarily_unavailable' }
  const name = typeof input.name === 'string' ? input.name.slice(0, 200) : ''
  const clientId = 'mcp_' + randomBytes(24).toString('base64url')
  await payload.create({ collection: 'mcp-clients', ...options, data: { clientId, name, redirectUris: uris } })
  return { clientId, name, redirectUris: uris as string[] }
}

export async function readMcpClient(payload: Payload, clientId: unknown): Promise<McpClient | null> {
  if (typeof clientId !== 'string' || !clientPattern.test(clientId)) return null
  const doc = (await payload.find({ collection: 'mcp-clients', ...options, limit: 1, where: { clientId: { equals: clientId } } })).docs[0] as any
  return doc ? { clientId: doc.clientId, name: doc.name ?? '', redirectUris: doc.redirectUris } : null
}

export const validChallenge = (value: unknown): value is string => typeof value === 'string' && tokenPattern.test(value)

export async function createMcpCode(payload: Payload, input: { clientId: string; redirectUri: string; challenge: string; memberId: string }) {
  if (!validChallenge(input.challenge)) throw new Error('invalid challenge')
  // Codes left unredeemed go on the next sign-in.
  await payload.delete({ collection: 'mcp-codes', ...options, where: { expiresAt: { less_than: new Date().toISOString() } } })
  const code = secret()
  await payload.create({ collection: 'mcp-codes', ...options, data: { codeHash: hash(code), clientId: input.clientId, redirectUri: input.redirectUri,
    challenge: input.challenge, member: memberRef(input.memberId), expiresAt: new Date(Date.now() + MCP_AUTH.codeSeconds * 1000).toISOString() } })
  return code
}

export type McpTokens = { accessToken: string; refreshToken: string; expiresIn: number }

async function issue(payload: Payload, clientId: string, memberId: string | number): Promise<McpTokens> {
  const accessToken = secret(), refreshToken = secret()
  await payload.create({ collection: 'mcp-tokens', ...options, data: {
    accessHash: hash(accessToken), refreshHash: hash(refreshToken), clientId, member: memberRef(String(memberId)),
    accessExpiresAt: new Date(Date.now() + MCP_AUTH.accessSeconds * 1000).toISOString(),
    refreshExpiresAt: new Date(Date.now() + MCP_AUTH.refreshDays * 86400000).toISOString() } })
  return { accessToken, refreshToken, expiresIn: MCP_AUTH.accessSeconds }
}

const same = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b))

/** A code works at most once: it is deleted before anything is checked. */
export async function redeemMcpCode(payload: Payload, input: { code: unknown; clientId: unknown; redirectUri: unknown; verifier: unknown }): Promise<McpTokens | null> {
  const { code, clientId, redirectUri, verifier } = input
  if (typeof code !== 'string' || !tokenPattern.test(code) || typeof clientId !== 'string' || typeof redirectUri !== 'string' ||
    typeof verifier !== 'string' || !/^[A-Za-z0-9._~-]{43,128}$/.test(verifier)) return null
  const deleted = await payload.delete({ collection: 'mcp-codes', ...options, where: { codeHash: { equals: hash(code) } } })
  const grant = deleted.docs?.[0] as any
  if (!grant || deleted.docs.length !== 1 || deleted.errors?.length) return null
  if (Date.parse(grant.expiresAt) <= Date.now() || grant.clientId !== clientId || grant.redirectUri !== redirectUri) return null
  if (!same(createHash('sha256').update(verifier).digest('base64url'), grant.challenge)) return null
  return issue(payload, clientId, grant.member)
}

/** Refresh tokens rotate: the old pair is revoked as the new one is issued. */
export async function refreshMcpTokens(payload: Payload, input: { refreshToken: unknown; clientId: unknown }): Promise<McpTokens | null> {
  const { refreshToken, clientId } = input
  if (typeof refreshToken !== 'string' || !tokenPattern.test(refreshToken) || typeof clientId !== 'string') return null
  const { docs } = await payload.update({ collection: 'mcp-tokens', ...options,
    where: { and: [{ refreshHash: { equals: hash(refreshToken) } }, { clientId: { equals: clientId } }, { revokedAt: { exists: false } },
      { refreshExpiresAt: { greater_than: new Date().toISOString() } }] },
    data: { revokedAt: new Date().toISOString() } })
  const row = docs[0] as any
  if (!row || docs.length !== 1) return null
  return issue(payload, clientId, row.member)
}

/** The member an access token speaks for, with their email (the caller checks the owner allowlist). */
export async function mcpTokenMember(payload: Payload, accessToken: string | undefined): Promise<{ id: string; email: string; displayName: string } | null> {
  if (!accessToken || !tokenPattern.test(accessToken)) return null
  const row = (await payload.find({ collection: 'mcp-tokens', ...options, limit: 1, where: { accessHash: { equals: hash(accessToken) } } })).docs[0] as any
  if (!row || row.revokedAt || Date.parse(row.accessExpiresAt) <= Date.now()) return null
  const member = await payload.db.findOne({ collection: 'members', where: { id: { equals: row.member } } }) as any
  if (!member || member._verified === false) return null
  return { id: String(member.id), email: String(member.email).toLowerCase(), displayName: String(member.displayName) }
}

export async function revokeMcpToken(payload: Payload, token: unknown) {
  if (typeof token !== 'string' || !tokenPattern.test(token)) return
  const where: Where = { or: [{ accessHash: { equals: hash(token) } }, { refreshHash: { equals: hash(token) } }] }
  await payload.update({ collection: 'mcp-tokens', ...options, where, data: { revokedAt: new Date().toISOString() } })
}

/** For `pnpm mcp:token`: a token minted on the CLI for the owner (scripted end-to-end tests). */
export async function mintMcpTokens(payload: Payload, memberId: string) { return issue(payload, 'cli', memberId) }

export async function revokeAllMcpTokens(payload: Payload) {
  await payload.update({ collection: 'mcp-tokens', ...options, where: { revokedAt: { exists: false } }, data: { revokedAt: new Date().toISOString() } })
}

/** Account deletion clears the member's connector grants too. */
export async function deleteMemberMcp(payload: Payload, memberId: string) {
  await payload.delete({ collection: 'mcp-codes', ...options, where: { member: { equals: memberRef(memberId) } } })
  await payload.delete({ collection: 'mcp-tokens', ...options, where: { member: { equals: memberRef(memberId) } } })
}
