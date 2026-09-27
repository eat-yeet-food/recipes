import { useMemo, type ReactNode } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import { NavigationProvider } from '@eat-yeet/l5-ui-primitives/primitives/navigation'
import { AccountProvider, type AccountMember, type AccountProviders } from './account'
import { fixtureMember, memoryAccountClient } from './account-fixture'
import { AccountSettingsPage } from './account-settings'
import { SignInPage } from './account-pages'
import { Nav } from '../shell/layout'

function Account({ member = null, providers = { google: true }, children }: {
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
  render: () => <Account member={{ ...fixtureMember, displayName: 'Jordan Q. Public', displayNameConfirmed: false }}><div className="min-h-80 pt-20">{nav}</div></Account>,
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
    await expect(await canvas.findByRole('link', { name: 'Continue with Google' })).toHaveAttribute('href', '#google')
    await expect(canvas.getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute('href', '/privacy')
  } }
export const SignInUnavailable: Story = { render: () => <Account providers={{ google: false }}><SignInPage /></Account>,
  play: async ({ canvasElement }) => {
    await expect(await within(canvasElement).findByRole('alert')).toHaveTextContent('Sign-in is unavailable')
  } }
export const GoogleFailed: Story = { render: () => <Account><SignInPage error="google" /></Account>,
  play: async ({ canvasElement }) => {
    await expect(await within(canvasElement).findByRole('alert')).toHaveTextContent('didn’t complete')
  } }
export const AlreadySignedIn: Story = { render: () => <Account member={fixtureMember}><SignInPage /></Account> }

export const Settings: Story = { render: () => <Account member={fixtureMember}><AccountSettingsPage /></Account>,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(await canvas.findByRole('heading', { name: 'Account settings' })).toBeVisible()
    const name = canvas.getByRole('textbox', { name: 'Public name' })
    await waitFor(() => expect(canvas.getByRole('button', { name: 'Save name' })).toBeDisabled())
    await userEvent.clear(name)
    await userEvent.type(name, 'Jordan B.')
    await userEvent.click(canvas.getByRole('button', { name: 'Save name' }))
    await expect(await canvas.findByText('Public name saved.')).toBeVisible()
    await expect(canvas.getByRole('button', { name: 'Delete my account' })).toBeDisabled()
    await userEvent.type(canvas.getByRole('textbox', { name: /to confirm/ }), 'jordan@example.com')
    await expect(canvas.getByRole('button', { name: 'Delete my account' })).toBeEnabled()
  } }
export const SettingsSignedOut: Story = { render: () => <Account><AccountSettingsPage /></Account> }
