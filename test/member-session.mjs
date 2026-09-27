/** Signs a Playwright browser context in as a local test member. */
import { execFileSync } from 'node:child_process'

let token
export async function signIn(context, origin) {
  token ??= execFileSync('pnpm', ['-s', 'exec', 'tsx', 'scripts/test-member-session.ts'], {
    cwd: new URL('../', import.meta.url), encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'],
  }).trim().split('\n').at(-1)
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) throw new Error('Test member session was not created')
  await context.addCookies([{ name: 'eatyeet-member', value: token, url: `${origin}/api/public/account/`, httpOnly: true, sameSite: 'Lax' }])
  // The shell reads the session only after this browser has signed in before.
  await context.addInitScript(() => { try { localStorage.setItem('eatyeet:account', '1') } catch {} })
}
