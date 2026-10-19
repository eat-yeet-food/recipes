import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import { Button } from '@eat-yeet/l5-ui-primitives/primitives/button'
import type { KitchenRevision } from './kitchen-client'
import { ChangeStrip, CountStepper, HistorySheet, KitchenNotice, NameDialog, SaveStatus, type KitchenNoticeValue } from './kitchen-ui'

const meta = {
  title: 'Kitchen/Controls',
  parameters: { docs: { description: { component: 'Owned Test Kitchen controls. Formulas save automatically, so the Saved label, the changes strip, History with Restore, the Name dialog (Save, Duplicate, Rename) and Undo notices replace any Save / Save as choice.' } } },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const SaveStates: Story = {
  render: () => <div className="grid gap-3 p-6">
    <SaveStatus state={{ kind: 'saved', at: Date.now() }} />
    <SaveStatus state={{ kind: 'saving' }} />
    <SaveStatus state={{ kind: 'local' }} />
    <SaveStatus state={{ kind: 'invalid' }} />
    <SaveStatus state={{ kind: 'error', message: 'Couldn’t save. Your edits are kept here.', retry: () => {} }} />
  </div>,
}

export const ChangesFromTheRecipe: Story = {
  render: () => <div className="grid gap-8 p-6">
    <ChangeStrip changes={[
      { label: 'Batch', from: '3 × 16-inch', to: '4 × 14-inch' },
      { label: 'Hydration', from: '65%', to: '68%' },
      { label: 'Flour', from: '100% Kirkland Organic All-Purpose Flour', to: '80% Kirkland Organic All-Purpose Flour, 20% Caputo Pizzeria 00 flour with a long name' },
    ]} onReset={() => {}} />
    <ChangeStrip changes={[]} />
  </div>,
  play: async ({ canvasElement }) => {
    const screen = within(canvasElement)
    await expect(screen.getAllByRole('region', { name: 'Changed from the recipe' })[0]).toHaveTextContent('Hydrationwas 65%now 68%')
    await expect(screen.getByText('Nothing yet. This matches the recipe.')).toBeVisible()
  },
}

function NameDialogExample({ taken = 'Friday pies' }: { taken?: string }) {
  const [open, setOpen] = useState(true)
  const [saved, setSaved] = useState('')
  return <div className="p-6">
    <Button onClick={() => setOpen(true)}>Duplicate</Button>
    <p role="status">{saved && `Saved ${saved}`}</p>
    <NameDialog open={open} onOpenChange={setOpen} title="Duplicate Friday pies" description="The copy opens next. Friday pies stays exactly as it is."
      initialName="Friday pies copy" submitLabel="Create copy"
      onSubmit={async (name) => name.toLowerCase() === taken.toLowerCase() ? 'You already have a formula with this name. Choose a different name.' : (setSaved(name), setOpen(false), null)} />
  </div>
}

export const NameDialogDuplicate: Story = {
  render: () => <NameDialogExample />,
  play: async ({ canvasElement }) => {
    const screen = within(canvasElement.ownerDocument.body)
    const field = await screen.findByRole('textbox', { name: 'Name' })
    await waitFor(() => expect(field).toHaveFocus())
    await userEvent.clear(field)
    await userEvent.tab()
    await expect(screen.getByRole('alert')).toHaveTextContent('Enter a name')
    await expect(screen.getByRole('button', { name: 'Create copy' })).toBeDisabled()
    await userEvent.type(field, 'FRIDAY pies')
    await userEvent.click(screen.getByRole('button', { name: 'Create copy' }))
    await expect(await screen.findByRole('alert')).toHaveTextContent('already have a formula')
    await userEvent.clear(field)
    await userEvent.type(field, 'Friday pies, 70%')
    await userEvent.keyboard('{Enter}')
    await expect(await screen.findByText('Saved Friday pies, 70%')).toBeVisible()
  },
}

const state = (hydration: number) => ({ hydration })
const at = (minutes: number) => new Date(Date.now() - minutes * 60000).toISOString()
const revisions: KitchenRevision[] = [
  { id: '4', name: 'Friday pies', state: state(68), notes: '', createdAt: at(5), updatedAt: at(4) },
  { id: '3', name: 'Friday pies', state: state(66), notes: '', createdAt: at(60 * 24 * 7), updatedAt: at(60 * 24 * 7) },
  { id: '2', name: 'Friday pies', state: state(66), notes: 'Best leopard spotting so far.', createdAt: at(60 * 24 * 14), updatedAt: at(60 * 24 * 14) },
  { id: '1', name: 'Pizza night', state: state(65), notes: '', createdAt: at(60 * 24 * 28), updatedAt: at(60 * 24 * 28) },
]

function HistoryExample() {
  const [open, setOpen] = useState(true)
  const [restored, setRestored] = useState('')
  return <div className="p-6">
    <Button onClick={() => setOpen(true)}>History</Button>
    <p role="status">{restored && `Restored version ${restored}`}</p>
    <HistorySheet open={open} onOpenChange={setOpen} title="Friday pies" revisions={revisions} complete restoring={null}
      onRestore={(revision) => { setRestored(revision.id); setOpen(false) }}
      describe={(revision, previous) => {
        if (!previous) return 'Earliest kept version'
        const parts = []
        if (previous.name !== revision.name) parts.push(`Name ${previous.name} → ${revision.name}`)
        const a = (previous.state as { hydration: number }).hydration, b = (revision.state as { hydration: number }).hydration
        if (a !== b) parts.push(`Hydration ${a}% → ${b}%`)
        if (previous.notes !== revision.notes) parts.push('Notes edited')
        return parts.join(' · ') || 'No value changes'
      }} />
  </div>
}

export const History: Story = {
  render: () => <HistoryExample />,
  play: async ({ canvasElement }) => {
    const screen = within(canvasElement.ownerDocument.body)
    await screen.findByRole('dialog', { name: 'History' })
    // The sheet slides in; wait for it to settle before asserting visibility.
    await waitFor(() => expect(screen.getByText('Current')).toBeVisible())
    await waitFor(() => expect(screen.getByText('Created')).toBeVisible())
    await userEvent.click(screen.getAllByRole('button', { name: /^Restore the version/ })[0])
    await expect(await within(canvasElement).findByRole('status')).toHaveTextContent('Restored version 3')
  },
}

function StepperExample() {
  const [count, setCount] = useState(4)
  return <div className="grid justify-items-start gap-3 p-6">
    <CountStepper label="How many pizzas today" unit="pizzas" value={count} max={6} onChange={setCount} />
    <p>Making {count} pizzas today</p>
  </div>
}

export const TodayStepper: Story = {
  render: () => <StepperExample />,
  play: async ({ canvasElement }) => {
    const screen = within(canvasElement)
    await userEvent.click(screen.getByRole('button', { name: 'More pizzas' }))
    await userEvent.click(screen.getByRole('button', { name: 'More pizzas' }))
    await expect(screen.getByText('Making 6 pizzas today')).toBeVisible()
    await expect(screen.getByRole('button', { name: 'More pizzas' })).toBeDisabled()
  },
}

function NoticeExample({ tone }: { tone?: 'error' }) {
  const [notice, setNotice] = useState<KitchenNoticeValue | null>(tone ? { tone, message: 'The formula could not be deleted. Please try again.' } : { message: 'Deleted Kids’ 10-inch. It stays in Recently deleted for 30 days.', action: { label: 'Undo', run: () => {} } })
  return <div className="min-h-40 p-6"><KitchenNotice notice={notice} onDismiss={() => setNotice(null)} /></div>
}

export const UndoNotice: Story = { render: () => <NoticeExample /> }
export const ErrorNotice: Story = { render: () => <NoticeExample tone="error" /> }
