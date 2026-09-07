import { useId, useRef, useState } from 'react'
import { Button } from '@eat-yeet/l5-ui-primitives/primitives/button'
import { expect, userEvent, within, waitFor } from 'storybook/test'
import type { Meta, StoryObj } from '@storybook/react-vite'

import type { RecipeContent } from '@eat-yeet/l4-content-model/recipes'
import { recipeWorkbenchRegistry } from '@app/recipe-workbenches'

const plugin = recipeWorkbenchRegistry.get('sourdough')!

const recipe = {
  slug: 'storybook-sourdough',
  title: 'Country Sourdough',
  description: 'A configurable naturally leavened loaf.',
  category: 'savory',
  defaultMethod: 'dutch-oven',
  methodOptions: [{ id: 'dutch-oven', label: 'Dutch Oven', description: '', prepMinutes: 60, cookMinutes: 40, totalMinutes: 1800, yieldAmount: 2, yieldUnit: 'loaves', blocks: [] }],
  blocks: [],
  courses: [], cuisines: [], methods: [], restrictions: [], occasions: [], ingredientTypes: [],
  order: null, prepMinutes: 60, cookMinutes: 40, totalMinutes: 1800,
  yieldAmount: 2, yieldUnit: 'loaves', image: '', imageHash: '', created: '', searchText: '',
} as RecipeContent

const state = {
  version: 1,
  methodId: 'dutch-oven',
  batch: { count: 2, pieceWeightGrams: 907.5, pieceLabel: 'loaf' },
  formula: {
    family: 'sourdough', hydrationPercent: 77.04, saltPercent: 1.97,
    oilPercent: 0, sugarPercent: 0, maltPercent: 0, yeastPercent: 0, levainPercent: 17.26,
    flour: [
      { id: 'bread', name: 'High-protein organic stone-milled bread flour', percent: 70 },
      { id: 'whole-wheat', name: 'Whole wheat flour', percent: 20 },
      { id: 'rye', name: 'Dark rye flour', percent: 10 },
    ],
    starter: {
      hydrationPercent: 77,
      flour: [
        { id: 'bread', name: 'Bread flour', percent: 50 },
        { id: 'whole-wheat', name: 'Whole wheat flour', percent: 25 },
        { id: 'rye', name: 'Dark rye flour', percent: 25 },
      ],
    },
  },
} as const

function WorkbenchPreview({ target = false, pizza = false }: { target?: boolean; pizza?: boolean }) {
  const scope = `storybook-${useId()}`
  const [open, setOpen] = useState(true)
  const [applied, setApplied] = useState(false)
  const selected = state
  const [saved, setSaved] = useState<unknown>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const changeOpen = (next: boolean) => { setOpen(next); if (!next) requestAnimationFrame(() => trigger.current?.focus()) }
  const config = { defaultInputMode: target ? 'target' : 'weights', defaultSelection: selected, recommendedFormulas: {}, doughIngredientSectionId: 'dough', initialWaterPercent: 97 }
  const Drawer = (pizza ? recipeWorkbenchRegistry.get('pizza')! : plugin).Drawer
  const initial = pizza ? { ...selected, formula: { ...selected.formula, family: 'pizza', levainPercent: 0, yeastPercent: 0.3 } } : selected
  return <div className="p-6"><Button ref={trigger} onClick={() => setOpen(true)}>Open workbench</Button><p role="status">{applied ? "Recipe updated" : "Preview your batch"}</p><Drawer recipe={recipe} config={{ ...config, defaultSelection: initial }} state={saved ?? initial} onApply={(next) => { setSaved(next); setApplied(true) }} hasSharedConfiguration={false} storageScope={scope} open={open} onOpenChange={changeOpen} /></div>
}

const meta = {
  title: 'Recipes/Dough workbench',
  component: WorkbenchPreview,
  parameters: { layout: 'fullscreen', docs: { description: { component: 'Saved formulas use the same ink panel as the dough summary, with a single picker and a named create/update form. Names are required, limited to 80 characters, and unique within a dough family regardless of case or spacing. Exact formula copies are rejected. Errors remain next to the form; saving failures never report success.' } } },
} satisfies Meta<typeof WorkbenchPreview>

export default meta
type Story = StoryObj<typeof meta>

export const SourdoughWeights: Story = {}
export const IncompleteFlourBlend: Story = {
  args: { target: true },
  play: async ({ canvasElement }) => {
    const screen = within(canvasElement.ownerDocument.body)
  await waitFor(() => expect(getComputedStyle(screen.getByRole('dialog')).pointerEvents).toBe('auto'))
    const field = await screen.findByRole('spinbutton', { name: /High-protein.*percentage/ })
    await userEvent.clear(field)
    await userEvent.type(field, '60')
    await expect(screen.getByRole('alert')).toHaveTextContent('100')
    await expect(screen.getByRole('button', { name: 'Apply to recipe' })).toBeDisabled()
  },
}

export const TargetBatch: Story = { args: { target: true } }
export const Pizza: Story = { args: { pizza: true, target: true } }
export const ApplyAndClose: Story = { play: async ({ canvasElement }) => { const screen = within(canvasElement.ownerDocument.body); await waitFor(() => expect(getComputedStyle(screen.getByRole('dialog')).pointerEvents).toBe('auto')); await userEvent.click(await screen.findByRole('button', { name: 'Apply to recipe' })); await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument()); await expect(screen.getByRole('status')).toHaveTextContent('Recipe updated') } }

export const SavedFormula: Story = { play: async ({ canvasElement }) => {
  const screen = within(canvasElement.ownerDocument.body)
  await waitFor(() => expect(getComputedStyle(screen.getByRole('dialog')).pointerEvents).toBe('auto'))
  await userEvent.type(await screen.findByRole('textbox', { name: 'Formula preset name' }), 'Weekend batch')
  await userEvent.click(screen.getAllByRole('button', { name: 'Save new' })[0])
  await expect(screen.getByRole('button', { name: 'Load Weekend batch' })).toBeInTheDocument()
} }

export const DuplicateFormulaName: Story = { play: async ({ canvasElement }) => {
  const screen = within(canvasElement.ownerDocument.body)
  await waitFor(() => expect(getComputedStyle(screen.getByRole('dialog')).pointerEvents).toBe('auto'))
  const panel = within(screen.getByRole('region', { name: 'Saved formulas' }))
  const name = panel.getByRole('textbox', { name: 'Formula preset name' })
  await userEvent.click(panel.getByRole('button', { name: 'Save new' }))
  await expect(name).toHaveAttribute('aria-invalid', 'true')
  await expect(panel.getByRole('alert')).toHaveTextContent('Enter a name')
  await userEvent.type(name, 'Weekend batch')
  await userEvent.click(panel.getByRole('button', { name: 'Save new' }))
  await userEvent.click(panel.getByRole('button', { name: 'New formula' }))
  await userEvent.type(name, '  WEEKEND   batch  ')
  await userEvent.click(panel.getByRole('button', { name: 'Save new' }))
  await expect(panel.getByRole('alert')).toHaveTextContent('A formula with this name already exists')
  await expect(panel.getAllByRole('option')).toHaveLength(1)
} }

export const DuplicateFormulaValues: Story = { play: async ({ canvasElement }) => {
  const screen = within(canvasElement.ownerDocument.body)
  await waitFor(() => expect(getComputedStyle(screen.getByRole('dialog')).pointerEvents).toBe('auto'))
  const panel = within(screen.getByRole('region', { name: 'Saved formulas' }))
  const name = panel.getByRole('textbox', { name: 'Formula preset name' })
  await userEvent.type(name, 'Weekend batch')
  await userEvent.click(panel.getByRole('button', { name: 'Save new' }))
  await userEvent.click(panel.getByRole('button', { name: 'New formula' }))
  await userEvent.type(name, 'Another batch')
  await userEvent.click(panel.getByRole('button', { name: 'Save new' }))
  await expect(panel.getByRole('alert')).toHaveTextContent('This formula is already saved')
  await expect(panel.getAllByRole('option')).toHaveLength(1)
} }

export const RenameSavedFormula: Story = { play: async ({ canvasElement }) => {
  const screen = within(canvasElement.ownerDocument.body)
  await waitFor(() => expect(getComputedStyle(screen.getByRole('dialog')).pointerEvents).toBe('auto'))
  const panel = within(screen.getByRole('region', { name: 'Saved formulas' }))
  const name = panel.getByRole('textbox', { name: 'Formula preset name' })
  await userEvent.type(name, 'Weekend batch')
  await userEvent.click(panel.getByRole('button', { name: 'Save new' }))
  await userEvent.clear(name)
  await userEvent.type(name, 'Sunday bread')
  await userEvent.click(panel.getByRole('button', { name: 'Update formula' }))
  await expect(panel.getAllByRole('option')).toHaveLength(1)
  await expect(panel.getByRole('option', { name: 'Sunday bread' })).toBeInTheDocument()
  await expect(panel.getByRole('status')).toHaveTextContent('Formula updated.')
} }
