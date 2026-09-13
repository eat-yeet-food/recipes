import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

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
