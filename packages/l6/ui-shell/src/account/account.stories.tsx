import { useMemo, type ReactNode } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import { NavigationProvider } from '@eat-yeet/l5-ui-primitives/primitives/navigation'
import { AccountProvider, type AccountMember, type AccountProviders } from './account'
import { fixtureMember, memoryAccountClient } from './account-fixture'
import { AccountSettingsPage } from './account-settings'
import { ForgotPasswordPage, ResetPasswordPage, SignInPage, VerifyEmailPage } from './account-pages'
import { Nav } from '../shell/layout'

function Account({ member = null, providers = { google: true, email: true }, children }: {
  member?: AccountMember | null; providers?: AccountProviders; children: ReactNode
}) {
  const client = useMemo(() => memoryAccountClient({ member, providers }), [member, providers])
  // Stories stay on the page: navigation is recorded, never performed.
  return <NavigationProvider navigate={() => {}}>
    <AccountProvider client={client} initialSession={{ member, providers }}>{children}</AccountProvider>
  </NavigationProvider>
}
const nav = <Nav pathname="/recipes" siteName="Eat / Yeet" wordmark={{ first: 'Eat', second: 'Yeet' }} onOpenPalette={() => {}} />

const meta = {
  title: 'Shell/Account',
  component: SignInPage,
  parameters: { layout: 'fullscreen', docs: { description: { component: 'Member sign-in. The app bar shows Sign in or the member’s initials menu. Account pages use one yellow panel with ink fields, a full-width ink primary action and underlined text actions; Google uses the utility treatment. New Google members confirm a public name before it appears on reviews.' } } },
} satisfies Meta<typeof SignInPage>
export default meta
type Story = StoryObj<typeof meta>

// Below the md breakpoint the account control lives in the mobile menu.
const narrow = (element: HTMLElement) => element.ownerDocument.defaultView!.innerWidth < 768
async function openMobileMenu(canvasElement: HTMLElement) {
  if (narrow(canvasElement)) await userEvent.click(await within(canvasElement).findByRole('button', { name: 'Open menu' }))
}

export const NavSignedOut: Story = { render: () => <Account><div className="min-h-40 pt-20">{nav}</div></Account>,
  play: async ({ canvasElement }) => {
    await openMobileMenu(canvasElement)
    await expect(await within(canvasElement).findByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/account/sign-in')
  } }

export const NavSignedInMenu: Story = { render: () => <Account member={fixtureMember}><div className="min-h-80 pt-20">{nav}</div></Account>,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    if (narrow(canvasElement)) {
      await openMobileMenu(canvasElement)
      const menu = within(canvasElement.querySelector<HTMLElement>('#mobile-nav-menu')!)
      await expect(await menu.findByText('Jordan')).toBeVisible()
      await userEvent.click(menu.getByRole('button', { name: 'Sign out' }))
      await openMobileMenu(canvasElement)
      await expect(await canvas.findByRole('link', { name: 'Sign in' })).toBeVisible()
      return
    }
    const trigger = await canvas.findByRole('button', { name: 'Account: Jordan' })
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')
    await userEvent.click(trigger)
    await expect(trigger).toHaveAttribute('aria-expanded', 'true')
    await expect(canvas.getByText('jordan@example.com')).toBeVisible()
    await userEvent.keyboard('{Escape}')
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')
    await expect(trigger).toHaveFocus()
    await userEvent.click(trigger)
    await userEvent.click(canvas.getByRole('button', { name: 'Sign out' }))
    await expect(await canvas.findByRole('link', { name: 'Sign in' })).toBeVisible()
  } }

export const PublicNamePrompt: Story = {
  render: () => <Account member={{ ...fixtureMember, displayName: 'Jordan Q. Public', displayNameConfirmed: false, google: true, hasPassword: false }}><div className="min-h-80 pt-20">{nav}</div></Account>,
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body)
    const field = await body.findByRole('textbox', { name: 'Public name' })
    await expect(field).toHaveValue('Jordan Q. Public')
    await userEvent.clear(field)
    await userEvent.click(body.getByRole('button', { name: 'Save name' }))
    await expect(await body.findByRole('alert')).toHaveTextContent('80 characters or fewer')
    await userEvent.type(field, 'JQ')
    await userEvent.click(body.getByRole('button', { name: 'Save name' }))
    await waitFor(() => expect(body.queryByRole('dialog')).toBeNull())
  } }

export const SignIn: Story = { render: () => <Account><SignInPage returnTo="/recipes/new-york-style-pizza" /></Account>,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(await canvas.findByRole('link', { name: 'Continue with Google' })).toBeVisible()
    await userEvent.click(canvas.getByRole('button', { name: 'Sign in' }))
    await expect(canvas.getByText('Enter a valid email address.')).toBeVisible()
    await expect(canvas.getByRole('textbox', { name: 'Email' })).toHaveAttribute('aria-invalid', 'true')
    await userEvent.type(canvas.getByRole('textbox', { name: 'Email' }), 'jordan@example.com')
    await userEvent.type(canvas.getByLabelText('Password'), 'correct-horse')
    await userEvent.click(canvas.getByRole('button', { name: 'Sign in' }))
    await expect(await canvas.findByRole('heading', { name: 'You’re signed in' })).toBeVisible()
  } }

export const WrongPassword: Story = { render: () => <Account><SignInPage /></Account>,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.type(await canvas.findByRole('textbox', { name: 'Email' }), 'jordan@example.com')
    await userEvent.type(canvas.getByLabelText('Password'), 'wrong-password')
    await userEvent.click(canvas.getByRole('button', { name: 'Sign in' }))
    await expect(await canvas.findByRole('alert')).toHaveTextContent('don’t match')
    await expect(canvas.getByRole('textbox', { name: 'Email' })).toHaveValue('jordan@example.com')
  } }

export const CreateAccount: Story = { render: () => <Account><SignInPage mode="create" /></Account>,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.type(await canvas.findByRole('textbox', { name: 'Public name' }), 'Jordan')
    await userEvent.type(canvas.getByRole('textbox', { name: 'Email' }), 'new@example.com')
    await userEvent.type(canvas.getByLabelText('Password'), 'short')
    await userEvent.click(canvas.getByRole('button', { name: 'Create account' }))
    await expect(canvas.getAllByText('Use at least 10 characters.').at(-1)).toBeVisible()
    await userEvent.type(canvas.getByLabelText('Password'), '-but-now-long')
    await userEvent.click(canvas.getByRole('button', { name: 'Create account' }))
    await expect(await canvas.findByRole('heading', { name: 'Check your email' })).toBeVisible()
    await expect(canvas.getByText('new@example.com')).toBeVisible()
  } }

export const EmailUnavailable: Story = { render: () => <Account providers={{ google: true, email: false }}><SignInPage mode="create" /></Account>,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(await canvas.findByText(/Email sign-up isn’t available right now/)).toBeVisible()
    await expect(canvas.getByRole('button', { name: 'Create account' })).toBeDisabled()
  } }

export const GoogleFailed: Story = { render: () => <Account><SignInPage error="google" /></Account> }
export const ForgotPassword: Story = { render: () => <Account><ForgotPasswordPage /></Account>,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.type(await canvas.findByRole('textbox', { name: 'Email' }), 'jordan@example.com')
    await userEvent.click(canvas.getByRole('button', { name: 'Send reset link' }))
    await expect(await canvas.findByRole('heading', { name: 'Check your email' })).toBeVisible()
  } }
export const ResetPassword: Story = { render: () => <Account><ResetPasswordPage token="valid" /></Account>,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.type(await canvas.findByLabelText('New password'), 'a-new-long-password')
    await userEvent.click(canvas.getByRole('button', { name: 'Change password' }))
    await expect(await canvas.findByRole('heading', { name: 'Password updated' })).toBeVisible()
  } }
export const ResetExpired: Story = { render: () => <Account><ResetPasswordPage token="expired" /></Account>,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.type(await canvas.findByLabelText('New password'), 'a-new-long-password')
    await userEvent.click(canvas.getByRole('button', { name: 'Change password' }))
    await expect(await canvas.findByRole('alert')).toHaveTextContent('invalid or has expired')
    await expect(canvas.getByRole('link', { name: 'Request a new link' })).toBeVisible()
  } }
export const VerifyEmail: Story = { render: () => <Account><VerifyEmailPage token="valid" /></Account>,
  play: async ({ canvasElement }) => {
    await expect(await within(canvasElement).findByRole('heading', { name: 'Email confirmed' })).toBeVisible()
  } }
export const VerifyInvalid: Story = { render: () => <Account><VerifyEmailPage token="used" /></Account>,
  play: async ({ canvasElement }) => {
    await expect(await within(canvasElement).findByRole('alert')).toHaveTextContent('invalid or was already used')
  } }

export const Settings: Story = { render: () => <Account member={fixtureMember}><AccountSettingsPage /></Account>,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(await canvas.findByRole('heading', { name: 'Account settings' })).toBeVisible()
    await userEvent.type(canvas.getByLabelText('Current password'), 'wrong-password')
    await userEvent.type(canvas.getByLabelText('New password'), 'another-long-password')
    await userEvent.click(canvas.getByRole('button', { name: 'Change password' }))
    await expect(await canvas.findByRole('alert')).toHaveTextContent('current password is incorrect')
    await userEvent.clear(canvas.getByLabelText('Current password'))
    await userEvent.type(canvas.getByLabelText('Current password'), 'correct-horse')
    await userEvent.click(canvas.getByRole('button', { name: 'Change password' }))
    await expect(await canvas.findByText('Password changed. Other devices were signed out.')).toBeVisible()
    await expect(canvas.getByRole('button', { name: 'Delete my account' })).toBeDisabled()
  } }
export const SettingsGoogleOnly: Story = { render: () => <Account member={{ ...fixtureMember, google: true, hasPassword: false }}><AccountSettingsPage /></Account>,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(await canvas.findByRole('heading', { name: 'Add a password' })).toBeVisible()
    await expect(canvas.queryByLabelText('Current password')).toBeNull()
  } }
export const SettingsSignedOut: Story = { render: () => <Account><AccountSettingsPage /></Account> }
