'use client'
import { useEffect, useId, useState, type FormEvent, type ReactNode } from 'react'
import { Button } from '@eat-yeet/l5-ui-primitives/primitives/button'
import { Input } from '@eat-yeet/l5-ui-primitives/primitives/input'
import { Link, useNavigate } from '@eat-yeet/l5-ui-primitives/primitives/navigation'
import { useAccount } from './account'
import { SignInLink } from './account-nav'

const message = (cause: unknown, fallback: string) => cause instanceof Error && cause.message ? cause.message : fallback

/** White settings page: one heading, then labeled rows separated by rules. */
function SettingsLayout({ description, children }: { description?: ReactNode; children: ReactNode }) {
  return <div className="mx-auto w-full max-w-[880px] px-4 py-12 text-ink md:px-6">
    <h1 className="font-display text-[36px] font-extrabold leading-tight">Account settings</h1>
    {description ? <p className="mt-2 text-sm text-muted-foreground">{description}</p> : null}
    <div className="mt-8">{children}</div>
  </div>
}

/** Heading and explanation on the left, controls on the right; stacked on narrow screens. */
function Section({ title, description, children }: { title: string; description?: ReactNode; children: ReactNode }) {
  const id = useId()
  return <section aria-labelledby={id} className="grid gap-4 border-t border-border py-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] md:gap-10">
    <div>
      <h2 id={id} className="text-lg font-semibold">{title}</h2>
      {description ? <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{description}</p> : null}
    </div>
    <div className="min-w-0">{children}</div>
  </section>
}

function Field({ label, ...props }: { label: string } & React.ComponentProps<typeof Input>) {
  const id = useId()
  return <div><label htmlFor={id} className="block text-sm font-medium">{label}</label><Input id={id} surface="underline" {...props} /></div>
}

/** Feedback line: an alert for errors, a polite status for success. */
function Result({ error, success }: { error: string; success: string }) {
  if (error) return <div role="alert" className="rounded-field bg-danger-soft px-4 py-3 text-sm text-danger">{error}</div>
  return <p role="status" className="text-sm empty:hidden">{success}</p>
}

function useAction() {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  async function run(action: () => Promise<string>, fallback: string) {
    setSaving(true); setError(''); setSuccess('')
    try { setSuccess(await action()) }
    catch (cause) { setError(message(cause, fallback)) }
    finally { setSaving(false) }
  }
  return { saving, error, success, run, reset: () => { setError(''); setSuccess('') } }
}

/** Signed-in account management: public name, password, sessions and deletion. */
export function AccountSettingsPage() {
  const { status, member, client, accept, refresh, providers } = useAccount()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [current, setCurrent] = useState('')
  const [password, setPassword] = useState('')
  const [confirmEmail, setConfirmEmail] = useState('')
  const nameAction = useAction(), passwordAction = useAction(), sessionAction = useAction(), deleteAction = useAction()

  useEffect(() => { if (status === 'unknown') void refresh() }, [status, refresh])
  useEffect(() => { if (member) setName(member.displayName) }, [member?.displayName])

  if (status === 'unknown') return <SettingsLayout><p role="status" className="text-sm">Loading your account...</p></SettingsLayout>
  if (!member) return <SettingsLayout description="Sign in to manage your account.">
    <Button asChild><SignInLink>Sign in</SignInLink></Button>
  </SettingsLayout>

  const saveName = (event: FormEvent) => { event.preventDefault(); void nameAction.run(async () => {
    if (!name.trim() || name.trim().length > 80) throw new Error('Enter a name of 80 characters or fewer.')
    accept(await client.updateDisplayName(name.trim()))
    return 'Public name saved.'
  }, 'Your name could not be saved. Please try again.') }

  const savePassword = (event: FormEvent) => { event.preventDefault(); void passwordAction.run(async () => {
    if (member.hasPassword && !current) throw new Error('Enter your current password.')
    if (password.length < 10) throw new Error('Use a new password of at least 10 characters.')
    const added = !member.hasPassword
    accept(await client.changePassword(member.hasPassword ? current : null, password))
    setCurrent(''); setPassword('')
    return added ? 'Password added. You can now sign in with your email too.' : 'Password changed. Other devices were signed out.'
  }, 'Your password could not be changed. Please try again.') }

  return <SettingsLayout description={<>Signed in as <strong className="text-ink">{member.email}</strong>{member.google ? ' with Google' : ''}.</>}>
    <div>
      <Section title="Public name" description="Shown on your reviews and replies.">
        <form noValidate className="grid gap-4" onSubmit={saveName}>
          <Field label="Public name" autoComplete="nickname" maxLength={80} value={name} disabled={nameAction.saving}
            onChange={(event) => { setName(event.target.value); nameAction.reset() }} />
          <Result error={nameAction.error} success={nameAction.success} />
          <Button type="submit" className="justify-self-start" disabled={nameAction.saving || name.trim() === member.displayName}>{nameAction.saving ? 'Saving...' : 'Save name'}</Button>
        </form>
      </Section>

      <Section title={member.hasPassword ? 'Change password' : 'Add a password'}
        description={member.hasPassword ? 'Changing your password signs out your other devices.' : 'Add a password to sign in with your email as well as Google.'}>
        <form noValidate className="grid gap-4" onSubmit={savePassword}>
          {/* Lets password managers associate the new password with this account. */}
          <input type="email" name="username" autoComplete="username" value={member.email} readOnly hidden />
          {member.hasPassword ? <Field label="Current password" type="password" autoComplete="current-password" maxLength={200} value={current}
            disabled={passwordAction.saving} onChange={(event) => { setCurrent(event.target.value); passwordAction.reset() }} /> : null}
          <Field label="New password" type="password" autoComplete="new-password" maxLength={200} value={password}
            disabled={passwordAction.saving} onChange={(event) => { setPassword(event.target.value); passwordAction.reset() }} />
          <p className="-mt-2 text-xs text-muted-foreground">At least 10 characters.</p>
          <Result error={passwordAction.error} success={passwordAction.success} />
          <Button type="submit" className="justify-self-start" disabled={passwordAction.saving}>{passwordAction.saving ? 'Saving...' : member.hasPassword ? 'Change password' : 'Add password'}</Button>
          {member.hasPassword && providers?.email ? <p className="text-xs text-muted-foreground">Forgot it? <Link to="/account/forgot" className="underline decoration-1 underline-offset-4">Email a reset link</Link>.</p> : null}
        </form>
      </Section>

      <Section title="Sign out everywhere" description="Ends every session, including this one.">
        <div className="grid gap-4">
          <Result error={sessionAction.error} success="" />
          <Button variant="utility" className="justify-self-start" disabled={sessionAction.saving} onClick={() => void sessionAction.run(async () => {
            await client.signOutEverywhere()
            accept({ member: null, providers: providers ?? { google: false, email: false } })
            navigate({ to: '/', replace: true })
            return ''
          }, 'You could not be signed out. Please try again.')}>{sessionAction.saving ? 'Signing out...' : 'Sign out everywhere'}</Button>
        </div>
      </Section>

      <Section title="Delete account" description="Permanently deletes your account, ratings, reviews, replies and saved formulas, including replies other cooks left on your reviews. This cannot be undone.">
        <form noValidate className="grid gap-4" onSubmit={(event) => { event.preventDefault(); void deleteAction.run(async () => {
          await client.deleteAccount(confirmEmail.trim())
          accept({ member: null, providers: providers ?? { google: false, email: false } })
          navigate({ to: '/', replace: true })
          return ''
        }, 'Your account could not be deleted. Please try again.') }}>
          <Field label={`Type ${member.email} to confirm`} type="email" autoComplete="off" value={confirmEmail} disabled={deleteAction.saving}
            onChange={(event) => { setConfirmEmail(event.target.value); deleteAction.reset() }} />
          <Result error={deleteAction.error} success="" />
          <Button type="submit" variant="danger" className="justify-self-start" disabled={deleteAction.saving || confirmEmail.trim().toLowerCase() !== member.email}>
            {deleteAction.saving ? 'Deleting...' : 'Delete my account'}
          </Button>
        </form>
      </Section>
    </div>
  </SettingsLayout>
}
