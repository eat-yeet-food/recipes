import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { keychain } from './credentials.mjs'

/** Use the owner's normal browser and Cloudflare's application-scoped session cache. */
export async function ownerAccessSession(origin, { execute = promisify(execFile) } = {}) {
  if (!['https://staging.eatyeet.com', 'https://eatyeet.com'].includes(origin)) throw new Error('Unconfigured Access origin')
  if (process.env.EATYEET_ACCESS_TOKEN) return process.env.EATYEET_ACCESS_TOKEN
  const local = resolve('.local/remote/bin/cloudflared')
  const binary = existsSync(local) ? local : 'cloudflared'
  console.log('Checking owner Access session; Cloudflare will use your normal browser if sign-in is needed.')
  try {
    const version = await execute(binary, ['--version'])
    if (!version.stdout.startsWith('cloudflared version 2026.9.1 ')) throw new Error('Incorrect cloudflared version')
    // Capture both streams: login prints the JWT on stdout. Never include the
    // child error object or captured output in logs or command arguments.
    const { stdout } = await execute(binary, ['access', 'login', '--no-verbose', origin], { timeout: 600000, maxBuffer: 1024 * 1024 })
    const token = stdout.trim()
    if (!/^eyJ[^\s]+\.[^\s]+\.[^\s]+$/.test(token)) throw new Error('Missing token')
    return token
  } catch {
    throw new Error('Owner Access sign-in did not complete. Install cloudflared 2026.9.1 and complete sign-in in your normal browser, then retry verification.')
  }
}

/**
 * Release verification session. Uses the enrolled staging deploy service token
 * when present (no browser), otherwise falls back to the owner login. The
 * resulting JWT reaches public staging pages only; owner checks still need
 * ownerAccessSession.
 */
export async function deployAccessSession(origin, { read = readServiceToken, request = fetch, fallback = ownerAccessSession } = {}) {
  if (origin !== 'https://staging.eatyeet.com') throw new Error('Deploy service tokens are staging-only')
  if (process.env.EATYEET_ACCESS_TOKEN) return process.env.EATYEET_ACCESS_TOKEN
  const token = read()
  if (!token) return fallback(origin)
  let response
  try {
    response = await request(new URL('/.well-known/eatyeet-release', origin), { redirect: 'manual', signal: AbortSignal.timeout(15000),
      headers: { 'CF-Access-Client-Id': token.ACCESS_CLIENT_ID, 'CF-Access-Client-Secret': token.ACCESS_CLIENT_SECRET, 'Cache-Control': 'no-cache' } })
  } catch { throw new Error('Staging deploy service token exchange failed to reach Access') }
  const cookies = response.headers.getSetCookie?.() ?? [response.headers.get('set-cookie') ?? '']
  const jwt = cookies.map((cookie) => /^CF_Authorization=([^;\s]+)/.exec(cookie)?.[1]).find(Boolean)
  if (!jwt || !/^eyJ[^\s.]+\.[^\s.]+\.[^\s.]+$/.test(jwt)) throw new Error(`Staging deploy service token was not accepted by Access (HTTP ${response.status}); run pnpm remote:credentials access-token --env staging`)
  return jwt
}

function readServiceToken() {
  const stored = keychain('get', 'staging')
  return stored.ACCESS_CLIENT_ID && stored.ACCESS_CLIENT_SECRET ? stored : undefined
}
