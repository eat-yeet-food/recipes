'use client'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export type AccountMember = {
  id: string
  email: string
  displayName: string
  displayNameConfirmed: boolean
}
export type AccountProviders = { google: boolean }
export type AccountSession = { member: AccountMember | null; providers: AccountProviders }

/** Transport supplied by the page; Storybook supplies an in-memory fixture. */
export type AccountClient = {
  session: () => Promise<AccountSession>
  updateDisplayName: (displayName: string) => Promise<AccountSession>
  signOut: () => Promise<void>
  googleURL: (returnTo: string) => string
  /** The signed-in member's saved workbench store for a storage scope, or null. */
  signOutEverywhere: () => Promise<void>
  deleteAccount: (email: string) => Promise<void>
  readWorkbench: (scope: string) => Promise<unknown>
  writeWorkbench: (scope: string, store: unknown) => Promise<void>
}

export type AccountStatus = 'unknown' | 'signed-out' | 'signed-in'
type AccountState = {
  status: AccountStatus
  member: AccountMember | null
  providers: AccountProviders | null
  client: AccountClient
  /** Read the session now, regardless of the local sign-in hint. */
  refresh: () => Promise<AccountSession | null>
  accept: (session: AccountSession) => void
  signOut: () => Promise<void>
}

// The session cookie is HttpOnly and scoped to the account API, so pages
// cannot see it. This hint avoids a session request for every anonymous view.
const HINT_KEY = 'eatyeet:account'
const readHint = () => { try { return localStorage.getItem(HINT_KEY) === '1' } catch { return false } }
const writeHint = (signedIn: boolean) => {
  try { signedIn ? localStorage.setItem(HINT_KEY, '1') : localStorage.removeItem(HINT_KEY) } catch {}
}
export const markSignedIn = () => writeHint(true)

const unavailable = () => Promise.reject(new Error('Accounts are unavailable here.'))
const noClient: AccountClient = {
  session: async () => ({ member: null, providers: { google: false } }),
  updateDisplayName: unavailable, signOut: async () => {}, googleURL: () => '#',
  readWorkbench: unavailable, writeWorkbench: unavailable,
  signOutEverywhere: unavailable, deleteAccount: unavailable,
}

const AccountContext = createContext<AccountState>({
  status: 'signed-out', member: null, providers: null, client: noClient,
  refresh: async () => null, accept: () => {}, signOut: async () => {},
})

/** `initialSession` skips the first read, for isolated stories and tests. */
export function AccountProvider({ client, initialSession, children }: { client: AccountClient; initialSession?: AccountSession; children: ReactNode }) {
  const [session, setSession] = useState<AccountSession | null>(initialSession ?? null)
  const [status, setStatus] = useState<AccountStatus>(initialSession ? initialSession.member ? 'signed-in' : 'signed-out' : 'unknown')

  const accept = useCallback((next: AccountSession) => {
    setSession(next)
    setStatus(next.member ? 'signed-in' : 'signed-out')
    writeHint(Boolean(next.member))
  }, [])
  const refresh = useCallback(async () => {
    try {
      const next = await client.session()
      accept(next)
      return next
    } catch {
      setStatus((current) => current === 'unknown' ? 'signed-out' : current)
      return null
    }
  }, [client, accept])
  const signOut = useCallback(async () => {
    await client.signOut()
    accept({ member: null, providers: session?.providers ?? { google: false } })
  }, [client, accept, session])

  useEffect(() => {
    if (initialSession) return
    if (readHint()) void refresh()
    else setStatus('signed-out')
  }, [refresh, initialSession])

  const value = useMemo<AccountState>(() => ({
    status, member: session?.member ?? null, providers: session?.providers ?? null, client, refresh, accept, signOut,
  }), [status, session, client, refresh, accept, signOut])
  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>
}

export const useAccount = () => useContext(AccountContext)

export const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]!.toUpperCase()).join('') || '?'

/** Only same-site relative paths may be used after sign-in. */
export function safeReturnTo(value: string | null | undefined) {
  return value && /^\/(?![/\\])[^\s\\]{0,500}$/.test(value) && !value.startsWith('/api/') ? value : '/'
}
