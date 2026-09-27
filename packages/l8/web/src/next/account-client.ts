'use client'
import type { AccountClient, AccountSession } from '@eat-yeet/l6-ui-shell/account/account'

export const ACCOUNT_API = '/api/public/account'

/** Same-origin JSON request to the account API; errors carry the server's message. */
export async function accountRequest<T>(path: string, method = 'GET', body?: unknown, fallback = 'Something went wrong. Please try again.'): Promise<T> {
  const response = await fetch(`${ACCOUNT_API}${path}`, {
    method, cache: 'no-store', credentials: 'same-origin',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const data = await response.json().catch(() => { throw new Error(fallback) })
  if (!response.ok) throw Object.assign(new Error(data?.error || fallback), { status: response.status })
  return data as T
}

export const accountClient: AccountClient = {
  session: () => accountRequest<AccountSession>('/session'),
  signIn: (email, password) => accountRequest<AccountSession>('/login', 'POST', { email, password }),
  register: async (input) => { await accountRequest('/register', 'POST', input) },
  verify: async (token) => { await accountRequest('/verify', 'POST', { token }) },
  forgot: async (email) => { await accountRequest('/forgot', 'POST', { email }) },
  reset: async (token, password) => { await accountRequest('/reset', 'POST', { token, password }) },
  updateDisplayName: (displayName) => accountRequest<AccountSession>('/session', 'PATCH', { displayName }),
  signOut: async () => { await accountRequest('/session', 'DELETE') },
  googleURL: (returnTo) => `${ACCOUNT_API}/google?returnTo=${encodeURIComponent(returnTo)}`,
  changePassword: (currentPassword, password) => accountRequest<AccountSession>('/password', 'POST', { currentPassword, password }),
  signOutEverywhere: async () => { await accountRequest('/sessions', 'DELETE') },
  deleteAccount: async (email) => { await accountRequest('/delete', 'POST', { email }) },
  readWorkbench: async (scope) => (await accountRequest<{ store: unknown }>(`/workbench/${encodeURIComponent(scope)}`, 'GET', undefined,
    'Saved formulas could not be loaded from your account.')).store,
  writeWorkbench: async (scope, store) => { await accountRequest(`/workbench/${encodeURIComponent(scope)}`, 'PUT', { store },
    'Your formulas could not be saved to your account. Please try again.') },
}
