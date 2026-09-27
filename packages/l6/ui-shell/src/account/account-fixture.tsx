import type { AccountClient, AccountMember, AccountProviders, AccountSession } from './account'

export const fixtureMember: AccountMember = {
  id: '1', email: 'jordan@example.com', displayName: 'Jordan', displayNameConfirmed: true, hasPassword: true, google: false,
}

/**
 * In-memory account transport for Storybook. It follows the production
 * contract: one known password, confirmation before sign-in, and generic
 * responses for registration and password reset.
 */
export function memoryAccountClient({ member = null, providers = { google: true, email: true }, delay = 0, fail = false }: {
  member?: AccountMember | null; providers?: AccountProviders; delay?: number; fail?: boolean
} = {}): AccountClient {
  let current = member
  const workbenches = new Map<string, unknown>()
  const wait = async () => {
    if (delay) await new Promise((resolve) => setTimeout(resolve, delay))
    if (fail) throw new Error('Something went wrong. Please try again.')
  }
  const session = (): AccountSession => ({ member: current, providers })
  return {
    session: async () => { await wait(); return session() },
    signIn: async (email, password) => {
      await wait()
      if (email !== fixtureMember.email || password !== 'correct-horse') throw new Error('That email and password don’t match.')
      current = fixtureMember
      return session()
    },
    register: async () => { await wait() },
    verify: async (token) => { await wait(); if (token !== 'valid') throw new Error('This confirmation link is invalid or was already used.') },
    forgot: async () => { await wait() },
    reset: async (token) => { await wait(); if (token !== 'valid') throw new Error('This reset link is invalid or has expired. Request a new one.') },
    updateDisplayName: async (displayName) => { await wait(); current = { ...current!, displayName, displayNameConfirmed: true }; return session() },
    signOut: async () => { await wait(); current = null },
    googleURL: () => '#google',
    changePassword: async (currentPassword, next) => {
      await wait()
      if (current?.hasPassword && currentPassword !== 'correct-horse') throw new Error('Your current password is incorrect.')
      if (next.length < 10) throw new Error('Use a password of at least 10 characters.')
      current = { ...current!, hasPassword: true }
      return session()
    },
    signOutEverywhere: async () => { await wait(); current = null },
    deleteAccount: async (email) => { await wait(); if (email !== current?.email) throw new Error('Type your email address exactly to confirm.'); current = null },
    readWorkbench: async (scope) => { await wait(); return structuredClone(workbenches.get(scope) ?? null) },
    writeWorkbench: async (scope, store) => { await wait(); workbenches.set(scope, structuredClone(store)) },
  }
}
