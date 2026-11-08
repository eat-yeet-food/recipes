'use client'
import { useEffect, useId, useState, type FormEvent, type ReactNode } from 'react'
import { Button } from '@eat-yeet/l5-ui-primitives/primitives/button'
import { Input } from '@eat-yeet/l5-ui-primitives/primitives/input'
import { Callout } from '@eat-yeet/l5-ui-primitives/primitives/callout'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@eat-yeet/l5-ui-primitives/primitives/dialog'
import { PageTitle } from '@eat-yeet/l5-ui-primitives/primitives/typography'
import { useNavigate } from '@eat-yeet/l5-ui-primitives/primitives/navigation'
import { useAccount } from './account'
import { SignInLink } from './account-nav'

const message = (cause: unknown, fallback: string) => cause instanceof Error && cause.message ? cause.message : fallback

/** White settings page: one heading, then labeled rows separated by rules. */
function SettingsLayout({ description, children }: { description?: ReactNode; children: ReactNode }) {
  return <div className="mx-auto w-full max-w-[880px] px-4 py-12 text-ink md:px-6">
    <PageTitle>Account settings</PageTitle>
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
  if (error) return <Callout tone="danger">{error}</Callout>
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

/** Signed-in account management: public name, sessions and deletion. */
export function AccountSettingsPage() {
  const { status, member, client, accept, refresh, providers } = useAccount()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [confirming, setConfirming] = useState(false)
  const nameAction = useAction(), sessionAction = useAction(), deleteAction = useAction()

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

  return <SettingsLayout description={<>Signed in as <strong className="text-ink">{member.email}</strong> with Google.</>}>
    <div>
      <Section title="Public name" description="Shown on your reviews and replies.">
        <form noValidate className="grid gap-4" onSubmit={saveName}>
          <Field label="Public name" autoComplete="nickname" maxLength={80} value={name} disabled={nameAction.saving}
            onChange={(event) => { setName(event.target.value); nameAction.reset() }} />
          <Result error={nameAction.error} success={nameAction.success} />
          <Button type="submit" className="justify-self-start" disabled={nameAction.saving || name.trim() === member.displayName}>{nameAction.saving ? 'Saving...' : 'Save name'}</Button>
        </form>
      </Section>

      <Section title="Sign out everywhere" description="Ends every session, including this one.">
        <div className="grid gap-4">
          <Result error={sessionAction.error} success="" />
          <Button variant="utility" className="justify-self-start" disabled={sessionAction.saving} onClick={() => void sessionAction.run(async () => {
            await client.signOutEverywhere()
            accept({ member: null, providers: providers ?? { google: false } })
            navigate({ to: '/', replace: true })
            return ''
          }, 'You could not be signed out. Please try again.')}>{sessionAction.saving ? 'Signing out...' : 'Sign out everywhere'}</Button>
        </div>
      </Section>

      <Section title="Delete account" description="Permanently deletes your account, ratings, reviews, replies and remixes.">
        <Button variant="danger" className="justify-self-start" onClick={() => { deleteAction.reset(); setConfirming(true) }}>Delete my account</Button>
      </Section>
      <Dialog open={confirming} onOpenChange={(open) => { if (!deleteAction.saving) setConfirming(open) }}>
        <DialogContent stripe className="p-6 text-ink sm:max-w-md">
          <DialogTitle className="font-display text-2xl font-extrabold leading-tight">Delete your account?</DialogTitle>
          <DialogDescription className="text-sm leading-relaxed text-ink">This permanently deletes your account, ratings, reviews, replies and remixes with their history, including replies other cooks left on your reviews. This can’t be undone.</DialogDescription>
          <Result error={deleteAction.error} success="" />
          <div className="flex flex-wrap justify-end gap-3">
            <DialogClose asChild><Button variant="utility" disabled={deleteAction.saving}>Cancel</Button></DialogClose>
            <Button variant="danger" disabled={deleteAction.saving} onClick={() => void deleteAction.run(async () => {
              // The server still requires the account email, so a forged request cannot delete by accident.
              await client.deleteAccount(member.email)
              accept({ member: null, providers: providers ?? { google: false } })
              setConfirming(false)
              navigate({ to: '/', replace: true })
              return ''
            }, 'Your account could not be deleted. Please try again.')}>{deleteAction.saving ? 'Deleting…' : 'Delete account'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  </SettingsLayout>
}
