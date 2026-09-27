'use client'
import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Button } from '@eat-yeet/l5-ui-primitives/primitives/button'
import { Input } from '@eat-yeet/l5-ui-primitives/primitives/input'
import { Link, useNavigate } from '@eat-yeet/l5-ui-primitives/primitives/navigation'
import { markSignedIn, safeReturnTo, useAccount, type AccountProviders } from './account'

const message = (cause: unknown, fallback: string) => cause instanceof Error && cause.message ? cause.message : fallback

/** Standalone account page: a narrow white column with standard underline fields. */
export function AccountPanel({ title, description, children }: { title: string; description?: ReactNode; children: ReactNode }) {
  return <div className="mx-auto w-full max-w-[440px] px-4 py-12 max-[360px]:py-8">
    <section aria-labelledby="account-title" className="text-ink">
      <h1 id="account-title" className="font-display text-[36px] font-extrabold leading-tight">{title}</h1>
      {description ? <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p> : null}
      <div className="mt-6">{children}</div>
    </section>
  </div>
}

function Field({ label, error, hint, ...props }: { label: string; error?: string; hint?: string } & React.ComponentProps<typeof Input>) {
  const id = useId()
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined
  return <div>
    <label htmlFor={id} className="block text-sm font-medium">{label}</label>
    <Input id={id} surface="underline" aria-invalid={Boolean(error) || undefined} aria-describedby={describedBy} {...props} />
    {hint && !error ? <p id={`${id}-hint`} className="mt-2 text-xs text-muted-foreground">{hint}</p> : null}
    {error ? <p id={`${id}-error`} className="mt-2 rounded-field bg-danger-soft px-3 py-2 text-xs text-danger">{error}</p> : null}
  </div>
}

function Alert({ children }: { children: ReactNode }) {
  return <div role="alert" className="rounded-field bg-danger-soft px-4 py-3 text-sm text-danger">{children}</div>
}
function Notice({ children }: { children: ReactNode }) {
  return <div role="status" className="rounded-field bg-tint px-4 py-3 text-sm text-ink">{children}</div>
}

function useProviders() {
  const { refresh, providers } = useAccount()
  const [loaded, setLoaded] = useState<AccountProviders | null>(providers)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let active = true
    refresh().then((session) => { if (!active) return; if (session) setLoaded(session.providers); else setFailed(true) })
    return () => { active = false }
  }, [refresh])
  return { providers: loaded, failed }
}

export type SignInMode = 'sign-in' | 'create'

/** One page for signing in and creating an account; Google is offered first when configured. */
export function SignInPage({ mode: initialMode = 'sign-in', returnTo: rawReturnTo, error: initialError }: { mode?: SignInMode; returnTo?: string | null; error?: string | null }) {
  const { client, accept, member } = useAccount()
  const navigate = useNavigate()
  const { providers, failed } = useProviders()
  const returnTo = safeReturnTo(rawReturnTo)
  const [mode, setMode] = useState<SignInMode>(initialMode)
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [attempted, setAttempted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(initialError === 'google' ? 'Google sign-in didn’t complete. Please try again.' : '')
  const [created, setCreated] = useState('')
  const heading = useRef<HTMLHeadingElement>(null)

  const emailError = attempted && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ? 'Enter a valid email address.' : ''
  const passwordError = attempted && (mode === 'create' ? password.length < 10 : !password) ? mode === 'create' ? 'Use at least 10 characters.' : 'Enter your password.' : ''
  const nameError = attempted && mode === 'create' && (!displayName.trim() || displayName.trim().length > 80) ? 'Enter a name of 80 characters or fewer.' : ''

  async function submit(event: FormEvent) {
    event.preventDefault()
    setAttempted(true)
    setError('')
    const invalid = !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || (mode === 'create' ? password.length < 10 || !displayName.trim() || displayName.trim().length > 80 : !password)
    if (invalid || saving) return
    setSaving(true)
    try {
      if (mode === 'create') {
        await client.register({ displayName: displayName.trim(), email: email.trim(), password })
        setCreated(email.trim())
      } else {
        accept(await client.signIn(email.trim(), password))
        markSignedIn()
        navigate({ to: returnTo, replace: true })
      }
    } catch (cause) { setError(message(cause, 'Something went wrong. Please try again.')) }
    finally { setSaving(false) }
  }

  if (created) return <AccountPanel title="Check your email" description={<>We sent a confirmation link to <strong>{created}</strong>. Open it to finish creating your account.</>}>
    <p className="text-sm">No email? Check spam, or <Button variant="link" onClick={() => { setCreated(''); setMode('create') }}>try again</Button> in a minute.</p>
  </AccountPanel>

  if (member) return <AccountPanel title="You’re signed in" description={<>Signed in as <strong>{member.email}</strong>.</>}>
    <Button className="w-full" onClick={() => navigate({ to: returnTo, replace: true })}>Continue</Button>
  </AccountPanel>

  const switchMode = (next: SignInMode) => { setMode(next); setAttempted(false); setError(''); heading.current?.focus() }
  return <AccountPanel
    title={mode === 'create' ? 'Create your account' : 'Sign in'}
    description="Rate and review recipes, and keep your saved dough formulas on every device.">
    <div className="grid gap-5">
      {failed ? <Alert>Sign-in is unavailable. Please try again.</Alert> : null}
      {providers?.google ? <>
        <Button asChild variant="utility" className="w-full"><a href={client.googleURL(returnTo)}>Continue with Google</a></Button>
        {providers.email ? <div className="flex items-center gap-3 text-xs font-bold uppercase text-muted-foreground" aria-hidden="true"><span className="h-px flex-1 bg-border" />or<span className="h-px flex-1 bg-border" /></div> : null}
      </> : null}
      {providers && !providers.email && mode === 'create' ? <Notice>Email sign-up isn’t available right now.{providers.google ? ' Continue with Google instead.' : ''}</Notice> : null}
      <form noValidate className="grid gap-4" onSubmit={submit} aria-label={mode === 'create' ? 'Create account with email' : 'Sign in with email'}>
        {mode === 'create' ? <Field label="Public name" hint="Shown on your reviews." autoComplete="nickname" maxLength={80} value={displayName} disabled={saving} error={nameError}
          onChange={(event) => { setDisplayName(event.target.value); setError('') }} /> : null}
        <Field label="Email" type="email" inputMode="email" autoComplete="email" maxLength={320} value={email} disabled={saving} error={emailError}
          onChange={(event) => { setEmail(event.target.value); setError('') }} />
        <Field label="Password" type="password" autoComplete={mode === 'create' ? 'new-password' : 'current-password'} maxLength={200} value={password} disabled={saving}
          error={passwordError} hint={mode === 'create' ? 'At least 10 characters.' : undefined}
          onChange={(event) => { setPassword(event.target.value); setError('') }} />
        {error ? <Alert>{error}</Alert> : null}
        {mode === 'create' ? <p className="text-xs leading-relaxed">By creating an account you agree to the <Link to="/terms" className="underline decoration-1 underline-offset-4">Terms of Use</Link> and <Link to="/privacy" className="underline decoration-1 underline-offset-4">Privacy Policy</Link>.</p> : null}
        <Button type="submit" className="w-full" disabled={saving || (mode === 'create' && providers?.email === false)}>
          {saving ? mode === 'create' ? 'Creating account...' : 'Signing in...' : mode === 'create' ? 'Create account' : 'Sign in'}
        </Button>
      </form>
      <div className="grid gap-3 text-sm">
        {mode === 'sign-in' ? <>
          <Link to="/account/forgot" className="w-fit underline decoration-1 underline-offset-4 hover:decoration-2">Forgot your password?</Link>
          <p>New here? <Button variant="link" onClick={() => switchMode('create')}>Create an account</Button></p>
        </> : <p>Already have an account? <Button variant="link" onClick={() => switchMode('sign-in')}>Sign in</Button></p>}
      </div>
    </div>
  </AccountPanel>
}

export function ForgotPasswordPage() {
  const { client } = useAccount()
  const [email, setEmail] = useState('')
  const [attempted, setAttempted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [sent, setSent] = useState('')
  const [error, setError] = useState('')
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  if (sent) return <AccountPanel title="Check your email" description={<>If <strong>{sent}</strong> has a password, we sent a reset link. It expires in one hour.</>}>
    <Link to="/account/sign-in" className="text-sm underline decoration-1 underline-offset-4 hover:decoration-2">Back to sign in</Link>
  </AccountPanel>
  return <AccountPanel title="Reset your password" description="Enter your email and we’ll send you a link to choose a new password.">
    <form noValidate className="grid gap-4" onSubmit={async (event) => {
      event.preventDefault()
      setAttempted(true)
      if (!valid || saving) return
      setSaving(true)
      setError('')
      try { await client.forgot(email.trim()); setSent(email.trim()) }
      catch (cause) { setError(message(cause, 'The reset email could not be sent. Please try again.')) }
      finally { setSaving(false) }
    }}>
      <Field label="Email" type="email" inputMode="email" autoComplete="email" maxLength={320} value={email} disabled={saving}
        error={attempted && !valid ? 'Enter a valid email address.' : ''} onChange={(event) => { setEmail(event.target.value); setError('') }} />
      {error ? <Alert>{error}</Alert> : null}
      <Button type="submit" className="w-full" disabled={saving}>{saving ? 'Sending...' : 'Send reset link'}</Button>
      <Link to="/account/sign-in" className="w-fit text-sm underline decoration-1 underline-offset-4 hover:decoration-2">Back to sign in</Link>
    </form>
  </AccountPanel>
}

export function ResetPasswordPage({ token }: { token: string | null }) {
  const { client } = useAccount()
  const [password, setPassword] = useState('')
  const [attempted, setAttempted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState(token ? '' : 'This reset link is incomplete. Request a new one.')
  if (done) return <AccountPanel title="Password updated" description="Your password has changed and other devices were signed out.">
    <Button asChild className="w-full"><Link to="/account/sign-in">Sign in</Link></Button>
  </AccountPanel>
  return <AccountPanel title="Choose a new password">
    <form noValidate className="grid gap-4" onSubmit={async (event) => {
      event.preventDefault()
      setAttempted(true)
      if (!token || password.length < 10 || saving) return
      setSaving(true)
      setError('')
      try { await client.reset(token, password); setDone(true) }
      catch (cause) { setError(message(cause, 'Your password could not be changed. Please try again.')) }
      finally { setSaving(false) }
    }}>
      <Field label="New password" type="password" autoComplete="new-password" maxLength={200} value={password} disabled={saving || !token}
        hint="At least 10 characters." error={attempted && password.length < 10 ? 'Use at least 10 characters.' : ''}
        onChange={(event) => { setPassword(event.target.value); setError('') }} />
      {error ? <Alert>{error}</Alert> : null}
      <Button type="submit" className="w-full" disabled={saving || !token}>{saving ? 'Saving...' : 'Change password'}</Button>
      {!token || error ? <Link to="/account/forgot" className="w-fit text-sm underline decoration-1 underline-offset-4 hover:decoration-2">Request a new link</Link> : null}
    </form>
  </AccountPanel>
}

export function VerifyEmailPage({ token }: { token: string | null }) {
  const { client } = useAccount()
  const [state, setState] = useState<'working' | 'done' | 'failed'>(token ? 'working' : 'failed')
  const [error, setError] = useState(token ? '' : 'This confirmation link is incomplete.')
  const started = useRef(false)
  useEffect(() => {
    if (!token || started.current) return
    started.current = true
    client.verify(token).then(() => setState('done'))
      .catch((cause) => { setError(message(cause, 'This confirmation link is invalid or was already used.')); setState('failed') })
  }, [client, token])
  if (state === 'working') return <AccountPanel title="Confirming your email"><p role="status" className="text-sm">One moment...</p></AccountPanel>
  if (state === 'done') return <AccountPanel title="Email confirmed" description="Your account is ready.">
    <Button asChild className="w-full"><Link to="/account/sign-in">Sign in</Link></Button>
  </AccountPanel>
  return <AccountPanel title="Link didn’t work">
    <div className="grid gap-4">
      <Alert>{error}</Alert>
      <p className="text-sm">If you already confirmed, just <Link to="/account/sign-in" className="underline decoration-1 underline-offset-4 hover:decoration-2">sign in</Link>. Otherwise create your account again to get a new link.</p>
    </div>
  </AccountPanel>
}

/** Landing page after Google redirects back: record the session hint, then continue. */
export function SignInCompletePage({ returnTo }: { returnTo: string | null }) {
  const { refresh } = useAccount()
  const navigate = useNavigate()
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    markSignedIn()
    refresh().then((session) => {
      if (session?.member) navigate({ to: safeReturnTo(returnTo), replace: true })
      else setFailed(true)
    })
  }, [refresh, navigate, returnTo])
  return <AccountPanel title={failed ? 'Sign-in didn’t complete' : 'Signing you in'}>
    {failed ? <div className="grid gap-4"><Alert>Please try signing in again.</Alert><Button asChild className="w-full"><Link to="/account/sign-in">Sign in</Link></Button></div>
      : <p role="status" className="text-sm">One moment...</p>}
  </AccountPanel>
}
