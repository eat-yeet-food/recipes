'use client'
import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { Button } from '@eat-yeet/l5-ui-primitives/primitives/button'
import { Input } from '@eat-yeet/l5-ui-primitives/primitives/input'
import { Link, useNavigate } from '@eat-yeet/l5-ui-primitives/primitives/navigation'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@eat-yeet/l5-ui-primitives/primitives/dialog'
import { cn } from '@eat-yeet/l0-foundation/utils'
import { initials, useAccount, type AccountMember } from './account'

// Menu rows: full-width 44px targets without the underlined text-action treatment.
const menuItem = '-mx-2 flex min-h-11 items-center rounded-control px-2 text-left font-action text-sm font-bold text-ink hover:bg-ink/5 focus-visible:outline-2 focus-visible:outline-ink focus-visible:-outline-offset-2'
const currentPath = () => typeof window === 'undefined' ? '/' : window.location.pathname + window.location.search

/** Navigates to sign-in, returning to the current page (including its query) afterwards. */
export function SignInLink({ className, children = 'Sign in', onNavigate }: { className?: string; children?: string; onNavigate?: () => void }) {
  const navigate = useNavigate()
  return <a
    href="/account/sign-in"
    className={className}
    onClick={(event) => {
      onNavigate?.()
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      event.preventDefault()
      navigate({ to: '/account/sign-in', search: { returnTo: currentPath() } })
    }}
  >{children}</a>
}

export function AccountAvatar({ name, className }: { name: string; className?: string }) {
  return <span aria-hidden="true" className={cn('flex size-9 shrink-0 items-center justify-center rounded-control bg-brand font-action text-sm font-bold text-ink', className)}>
    {initials(name)}
  </span>
}

/**
 * App-bar account control: a Sign in link when signed out, and an initials
 * disclosure with the member's name, email and Sign out when signed in.
 */
export function AccountNav({ linkClassName }: { linkClassName: string }) {
  const { member, signOut } = useAccount()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')
  const panelId = useId()
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent) {
        if (event.key !== 'Escape') return
        setOpen(false)
        trigger.current?.focus()
      } else if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', close)
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', close) }
  }, [open])

  // Most visitors are anonymous: render Sign in until a remembered session loads,
  // so the app bar never shifts for them.
  if (!member) return <SignInLink className={linkClassName} />
  return <div ref={root} className="relative">
    <Button ref={trigger} variant="ghost" size="icon" aria-label={`Account: ${member.displayName}`} aria-expanded={open} aria-controls={panelId}
      onClick={() => setOpen((current) => !current)}>
      <AccountAvatar name={member.displayName} />
    </Button>
    <div id={panelId} hidden={!open}
      className="absolute right-0 top-full z-[var(--z-nav)] mt-2 w-64 rounded-surface bg-white p-4 text-ink shadow-[0_8px_24px_color-mix(in_srgb,var(--color-ink)_16%,transparent)]">
      <p className="truncate font-action text-sm font-bold">{member.displayName}</p>
      <p className="truncate text-xs text-muted-foreground">{member.email}</p>
      <div className="mt-3 grid border-t border-border pt-2">
        <Link to="/account/settings" onClick={() => setOpen(false)} className={menuItem}>Account settings</Link>
        <button type="button" className={menuItem} onClick={async () => {
          setError('')
          try { await signOut(); setOpen(false) }
          catch { setError('You could not be signed out. Please try again.') }
        }}>Sign out</button>
        {error ? <p role="alert" className="mt-2 text-xs text-danger">{error}</p> : null}
      </div>
    </div>
    <DisplayNamePrompt member={member} />
  </div>
}

/** Mobile menu variant: Sign in, or Settings, Sign out and the member as plain stacked rows. */
export function AccountMenuRow({ className, onNavigate }: { className: string; onNavigate: () => void }) {
  const { member, signOut } = useAccount()
  if (!member) return <SignInLink className={className} onNavigate={onNavigate} />
  return <>
    <Link to="/account/settings" onClick={onNavigate} className={className}>Settings</Link>
    <button type="button" className={cn(className, 'w-full text-left')} onClick={() => { onNavigate(); void signOut().catch(() => {}) }}>Sign out</button>
    <span className={cn(className, 'gap-2 hover:bg-transparent')}><AccountAvatar name={member.displayName} className="size-8" /><span className="truncate">{member.displayName}</span></span>
  </>
}

/**
 * Google accounts start with the provider's name. Before it appears on any
 * public review, the member confirms or changes it once.
 */
export function DisplayNamePrompt({ member }: { member: AccountMember }) {
  const { client, accept } = useAccount()
  const [dismissed, setDismissed] = useState(false)
  const [name, setName] = useState(member.displayName)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const id = useId()
  const open = !member.displayNameConfirmed && !dismissed

  async function submit(event: FormEvent) {
    event.preventDefault()
    const value = name.trim()
    if (!value || value.length > 80) { setError('Enter a name of 80 characters or fewer.'); return }
    setSaving(true)
    setError('')
    try { accept(await client.updateDisplayName(value)) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Your name could not be saved. Please try again.') }
    finally { setSaving(false) }
  }

  return <Dialog open={open} onOpenChange={(next) => { if (!next) setDismissed(true) }}>
    <DialogContent className="bg-brand p-6 text-ink sm:max-w-md">
      <DialogTitle className="font-display text-2xl font-extrabold leading-tight">Choose your public name</DialogTitle>
      <DialogDescription className="text-sm text-ink">This name appears on your reviews and replies. Your email stays private.</DialogDescription>
      <form className="grid gap-4" onSubmit={submit} noValidate>
        <div>
          <label htmlFor={`${id}-name`} className="mb-2 block text-sm font-medium">Public name</label>
          <Input id={`${id}-name`} autoComplete="nickname" maxLength={80} value={name} disabled={saving}
            aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined}
            onChange={(event) => { setName(event.target.value); setError('') }} />
          {error ? <p id={`${id}-error`} role="alert" className="mt-2 rounded-field bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p> : null}
        </div>
        <Button type="submit" className="w-full" disabled={saving}>{saving ? 'Saving...' : 'Save name'}</Button>
      </form>
    </DialogContent>
  </Dialog>
}
