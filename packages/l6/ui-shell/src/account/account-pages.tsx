'use client'
import { useEffect, useState, type ReactNode } from 'react'
import { Button } from '@eat-yeet/l5-ui-primitives/primitives/button'
import { Link, useNavigate } from '@eat-yeet/l5-ui-primitives/primitives/navigation'
import { markSignedIn, safeReturnTo, useAccount, type AccountProviders } from './account'

/** Standalone account page: a narrow white column. */
export function AccountPanel({ title, description, children }: { title: string; description?: ReactNode; children: ReactNode }) {
  return <div className="mx-auto w-full max-w-[440px] px-4 py-12 max-[360px]:py-8">
    <section aria-labelledby="account-title" className="text-ink">
      <h1 id="account-title" className="font-display text-[36px] font-extrabold leading-tight">{title}</h1>
      {description ? <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p> : null}
      <div className="mt-6">{children}</div>
    </section>
  </div>
}

function Alert({ children }: { children: ReactNode }) {
  return <div role="alert" className="rounded-field bg-danger-soft px-4 py-3 text-sm text-danger">{children}</div>
}

/** Sign-in and sign-up are one Google step; the first sign-in creates the account. */
export function SignInPage({ returnTo: rawReturnTo, error }: { returnTo?: string | null; error?: string | null }) {
  const { client, member, refresh } = useAccount()
  const navigate = useNavigate()
  const returnTo = safeReturnTo(rawReturnTo)
  const [providers, setProviders] = useState<AccountProviders | null>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let active = true
    refresh().then((session) => { if (!active) return; if (session) setProviders(session.providers); else setFailed(true) })
    return () => { active = false }
  }, [refresh])

  if (member) return <AccountPanel title="You’re signed in" description={<>Signed in as <strong className="text-ink">{member.email}</strong>.</>}>
    <Button className="w-full" onClick={() => navigate({ to: returnTo, replace: true })}>Continue</Button>
  </AccountPanel>

  return <AccountPanel title="Sign in" description="Rate and review recipes, adjust them with the recipe calculator, and keep your saved dough formulas on every device.">
    <div className="grid gap-5">
      {error === 'google' ? <Alert>Google sign-in didn’t complete. Please try again.</Alert> : null}
      {failed || providers?.google === false ? <Alert>Sign-in is unavailable right now. Please try again later.</Alert> : null}
      {providers?.google ? <Button asChild className="w-full"><a href={client.googleURL(returnTo)}>Continue with Google</a></Button> : null}
      <p className="text-xs leading-relaxed text-muted-foreground">New here? Continuing creates your account. By signing in you agree to the <Link to="/terms" className="underline decoration-1 underline-offset-4">Terms of Use</Link> and <Link to="/privacy" className="underline decoration-1 underline-offset-4">Privacy Policy</Link>.</p>
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
