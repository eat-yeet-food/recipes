import type { AccountClient, AccountMember, AccountProviders, AccountSession } from './account'

export const fixtureMember: AccountMember = {
  id: '1', email: 'jordan@example.com', displayName: 'Jordan', displayNameConfirmed: true,
}

/**
 * In-memory account transport for Storybook. Signing in happens on Google,
 * so stories start signed in or signed out.
 */
export function memoryAccountClient({ member = null, providers = { google: true }, delay = 0, fail = false }: {
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
    updateDisplayName: async (displayName) => { await wait(); current = { ...current!, displayName, displayNameConfirmed: true }; return session() },
    signOut: async () => { await wait(); current = null },
    googleURL: () => '#google',
    signOutEverywhere: async () => { await wait(); current = null },
    deleteAccount: async (email) => { await wait(); if (email !== current?.email) throw new Error('Type your email address exactly to confirm.'); current = null },
    readWorkbench: async (scope) => { await wait(); return structuredClone(workbenches.get(scope) ?? null) },
    writeWorkbench: async (scope, store) => { await wait(); workbenches.set(scope, structuredClone(store)) },
  }
}
