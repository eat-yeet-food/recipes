import 'server-only'
import { createHash, randomBytes } from 'node:crypto'
import { NextResponse, type NextRequest } from 'next/server'
import { createSession, sessionMember, SESSION_DAYS, type Member } from '@eat-yeet/l4-content-cms/members'
import { accountRateLimiter, cms, googleSettings, runtimeSettings } from './cms'

// The member cookie is scoped to the account API. It never reaches document
// requests, so anonymous HTML caching stays effective for signed-in readers.
export const ACCOUNT_API = '/api/public/account'
const SESSION_COOKIE = 'eatyeet-member'
const OAUTH_COOKIE = 'eatyeet-oauth'
const OAUTH_PATH = `${ACCOUNT_API}/google`

export const reply = (body: unknown, status = 200) => NextResponse.json(body, {
  status, headers: { 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex' },
})
export const failure = (error: string, status: number) => reply({ error }, status)
const secure = () => runtimeSettings().origin.startsWith('https:')

export function sameOrigin(request: NextRequest) {
  return request.headers.get('origin') === runtimeSettings().origin && request.headers.get('sec-fetch-site') !== 'cross-site'
}

/** Read a small JSON object whose keys must match exactly. */
export async function readJSON(request: NextRequest, keys: string[], limit = 8192): Promise<Record<string, unknown> | null> {
  if (request.headers.get('content-type')?.split(';')[0] !== 'application/json') return null
  const reader = request.body?.getReader()
  if (!reader) return null
  let body = '', length = 0
  const decoder = new TextDecoder()
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    length += value.byteLength
    if (length > limit) { await reader.cancel(); return null }
    body += decoder.decode(value, { stream: true })
  }
  try {
    const data = JSON.parse(body + decoder.decode())
    if (!data || typeof data !== 'object' || Array.isArray(data)) return null
    return Object.keys(data).sort().join(',') === [...keys].sort().join(',') ? data : null
  } catch { return null }
}

/** Bound sign-in attempts per client address when the Worker binding exists. */
export async function rateLimited(request: NextRequest, action: string) {
  const limiter = accountRateLimiter()
  if (!limiter) return false
  const client = request.headers.get('cf-connecting-ip') ?? 'unknown'
  return !(await limiter.limit({ key: `${action}:${client}` })).success
}

export const sessionToken = (request: NextRequest) => request.cookies.get(SESSION_COOKIE)?.value
export async function currentMember(request: NextRequest): Promise<Member | null> {
  const token = sessionToken(request)
  return token ? sessionMember(await cms(), token) : null
}

export async function startSession(response: NextResponse, memberId: string) {
  const { token, expiresAt } = await createSession(await cms(), memberId)
  response.cookies.set(SESSION_COOKIE, token, { httpOnly: true, secure: secure(), sameSite: 'lax',
    path: ACCOUNT_API, expires: expiresAt, maxAge: SESSION_DAYS * 86400 })
  return response
}
export function clearSession(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, '', { httpOnly: true, secure: secure(), sameSite: 'lax', path: ACCOUNT_API, maxAge: 0 })
  return response
}

export const accountProviders = () => ({ google: Boolean(googleSettings()) })

/** Accept only same-site relative destinations. */
export function safeReturnTo(value: unknown) {
  return typeof value === 'string' && /^\/(?![/\\])[^\s\\]{0,500}$/.test(value) && !value.startsWith('/api/') ? value : '/'
}

const base64url = (bytes: Buffer) => bytes.toString('base64url')
export function googleAuthorization(returnTo: string) {
  const google = googleSettings()
  if (!google) return null
  const state = base64url(randomBytes(24))
  const verifier = base64url(randomBytes(48))
  const challenge = base64url(createHash('sha256').update(verifier).digest())
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  url.search = new URLSearchParams({
    client_id: google.clientId,
    redirect_uri: `${runtimeSettings().origin}${OAUTH_PATH}/callback`,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    prompt: 'select_account',
  }).toString()
  const response = NextResponse.redirect(url, { headers: { 'Cache-Control': 'private, no-store' } })
  response.cookies.set(OAUTH_COOKIE, JSON.stringify({ state, verifier, returnTo }), { httpOnly: true, secure: secure(),
    sameSite: 'lax', path: OAUTH_PATH, maxAge: 600 })
  return response
}

export function readOAuthCookie(request: NextRequest) {
  try {
    const value = JSON.parse(request.cookies.get(OAUTH_COOKIE)?.value ?? '')
    if (typeof value.state === 'string' && typeof value.verifier === 'string') return { state: value.state as string, verifier: value.verifier as string, returnTo: safeReturnTo(value.returnTo) }
  } catch {}
  return null
}
export function clearOAuthCookie(response: NextResponse) {
  response.cookies.set(OAUTH_COOKIE, '', { httpOnly: true, secure: secure(), sameSite: 'lax', path: OAUTH_PATH, maxAge: 0 })
  return response
}

/** Exchange the authorization code directly with Google over TLS, then read the verified profile. */
export async function googleProfile(code: string, verifier: string) {
  const google = googleSettings()
  if (!google) return null
  const token = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ code, code_verifier: verifier, client_id: google.clientId, client_secret: google.clientSecret,
      redirect_uri: `${runtimeSettings().origin}${OAUTH_PATH}/callback`, grant_type: 'authorization_code' }),
    signal: AbortSignal.timeout(10000),
  })
  if (!token.ok) return null
  const { access_token: accessToken } = await token.json() as { access_token?: string }
  if (!accessToken) return null
  const profile = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` }, signal: AbortSignal.timeout(10000) })
  if (!profile.ok) return null
  const data = await profile.json() as Record<string, unknown>
  if (typeof data.sub !== 'string' || typeof data.email !== 'string') return null
  return { sub: data.sub, email: data.email, emailVerified: data.email_verified === true, name: typeof data.name === 'string' ? data.name : '' }
}

export function redirectTo(path: string) {
  return NextResponse.redirect(new URL(path, runtimeSettings().origin), { status: 303, headers: { 'Cache-Control': 'private, no-store' } })
}
