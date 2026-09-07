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
  const initial = pizza ? { ...selected, batch: { ...selected.batch, pieceLabel: 'ball' }, formula: { ...selected.formula, family: 'pizza', levainPercent: 0, yeastPercent: 0.3 } } : selected
  return <div className="p-6"><Button ref={trigger} onClick={() => setOpen(true)}>Open workbench</Button><p role="status">{applied ? "Recipe updated" : "Preview your batch"}</p><Drawer recipe={recipe} config={{ ...config, defaultSelection: initial }} state={saved ?? initial} onApply={(next) => { setSaved(next); setApplied(true) }} hasSharedConfiguration={false} storageScope={scope} open={open} onOpenChange={changeOpen} /></div>
}

const meta = {
  title: 'Recipes/Dough workbench',
  component: WorkbenchPreview,
  parameters: { layout: 'fullscreen', docs: { description: { component: 'Saved formulas start collapsed behind a compact disclosure with a saved count. Opening it reveals the same ink panel as the dough summary, with a single picker and a named create/update form. Names are required, limited to 80 characters, and unique within a dough family regardless of case or spacing. Exact formula copies are rejected. Errors remain next to the form; saving failures never report success.' } } },
} satisfies Meta<typeof WorkbenchPreview>

export default meta
type Story = StoryObj<typeof meta>

export const SourdoughWeights: Story = {}
export const IncompleteFlourBlend: Story = {
  args: { target: true },
  play: async ({ canvasElement }) => {
    const screen = within(canvasElement.ownerDocument.body)
  await waitFor(() => expect(getComputedStyle(screen.getByRole('dialog')).pointerEvents).toBe('auto'))
    const field = await screen.findByRole('textbox', { name: /High-protein.*percentage/ })
    await userEvent.clear(field)
    await userEvent.type(field, '60')
    await expect(screen.getByRole('alert')).toHaveTextContent('100')
    await expect(screen.getByRole('button', { name: 'Apply to recipe' })).toBeDisabled()
  },
}

export const TargetBatch: Story = { args: { target: true } }
export const Pizza: Story = { args: { pizza: true, target: true } }
export const RoundedBatchAndPercentages: Story = { args: { target: true }, play: async ({ canvasElement }) => {
  const screen = within(canvasElement.ownerDocument.body)
  await waitFor(() => expect(getComputedStyle(screen.getByRole('dialog')).pointerEvents).toBe('auto'))
  await expect(screen.getByRole('textbox', { name: 'loaf weight' })).toHaveValue('908')
  await expect(screen.getByRole('textbox', { name: 'Total dough weight' })).toHaveValue('1815')
  await expect(screen.getByRole('textbox', { name: 'Hydration' })).toHaveValue('77')
  await expect(screen.getByRole('textbox', { name: 'Salt' })).toHaveValue('2')
} }

async function editEveryNumber(canvasElement: HTMLElement) {
  const screen = within(canvasElement.ownerDocument.body)
  await waitFor(() => expect(getComputedStyle(screen.getByRole('dialog')).pointerEvents).toBe('auto'))
  await userEvent.click(screen.getByRole('button', { name: 'Build this levain' }))
  const fields = Array.from(screen.getByRole('dialog').querySelectorAll<HTMLInputElement>('input'))
    .filter((field) => field.inputMode === 'numeric' || field.inputMode === 'decimal')
  for (const field of fields) {
    const original = field.value
    await userEvent.clear(field)
    await expect(field).toHaveValue('')
    await expect(screen.getByRole('button', { name: 'Apply to recipe' })).toBeDisabled()
    await userEvent.type(field, original)
    await expect(field).toHaveValue(original)
    await userEvent.tab()
  }
  const name = screen.getAllByRole('textbox', { name: 'Flour 1 name' })[0]
  await userEvent.clear(name)
  await userEvent.type(name, 'Bread flour')
  await expect(name).toHaveFocus()
  await expect(name).toHaveValue('Bread flour')
}
export const EditableTargetFields: Story = { args: { target: true }, play: async ({ canvasElement }) => editEveryNumber(canvasElement) }
export const EditableWeightFields: Story = { play: async ({ canvasElement }) => editEveryNumber(canvasElement) }
export const EditQuantityAndTotal: Story = { args: { pizza: true, target: true }, play: async ({ canvasElement }) => {
  const screen = within(canvasElement.ownerDocument.body)
  await waitFor(() => expect(getComputedStyle(screen.getByRole('dialog')).pointerEvents).toBe('auto'))
  const count = screen.getByRole('textbox', { name: 'balls' })
  await userEvent.clear(count)
  await expect(count).toHaveValue('')
  await expect(screen.getByRole('button', { name: 'Apply to recipe' })).toBeDisabled()
  await userEvent.type(count, '4')
  const total = screen.getByRole('textbox', { name: 'Total dough weight' })
  await userEvent.clear(total)
  await userEvent.type(total, '2000')
  await expect(screen.getByRole('textbox', { name: 'ball weight' })).toHaveValue('500')
  await expect(screen.getByRole('button', { name: 'Apply to recipe' })).toBeEnabled()
} }
export const ApplyAndClose: Story = { play: async ({ canvasElement }) => { const screen = within(canvasElement.ownerDocument.body); await waitFor(() => expect(getComputedStyle(screen.getByRole('dialog')).pointerEvents).toBe('auto')); await userEvent.click(await screen.findByRole('button', { name: 'Apply to recipe' })); await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument()); await expect(screen.getByRole('status')).toHaveTextContent('Recipe updated') } }

export const SavedFormula: Story = { play: async ({ canvasElement }) => {
  const screen = within(canvasElement.ownerDocument.body)
  await waitFor(() => expect(getComputedStyle(screen.getByRole('dialog')).pointerEvents).toBe('auto'))
  await expect(screen.queryByRole('textbox', { name: 'Formula preset name' })).not.toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: /Saved formulas/ }))
  await userEvent.type(await screen.findByRole('textbox', { name: 'Formula preset name' }), 'Weekend batch')
  await userEvent.click(screen.getAllByRole('button', { name: 'Save new' })[0])
  await expect(screen.getByRole('button', { name: 'Load Weekend batch' })).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: /Saved formulas/ }))
  await expect(screen.queryByRole('textbox', { name: 'Formula preset name' })).not.toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: /Saved formulas/ }))
  await expect(screen.getByRole('textbox', { name: 'Formula preset name' })).toHaveValue('Weekend batch')
} }

export const DuplicateFormulaName: Story = { play: async ({ canvasElement }) => {
  const screen = within(canvasElement.ownerDocument.body)
  await waitFor(() => expect(getComputedStyle(screen.getByRole('dialog')).pointerEvents).toBe('auto'))
  await userEvent.click(screen.getByRole('button', { name: /Saved formulas/ }))
  const panel = within(screen.getByRole('region', { name: 'Saved formulas' }))
  const name = panel.getByRole('textbox', { name: 'Formula preset name' })
  await expect(panel.getByRole('button', { name: 'Save new' })).toBeDisabled()
  await expect(panel.getByText('Enter a name to save this formula.')).toBeInTheDocument()
  await userEvent.type(name, 'Weekend batch')
  await expect(panel.getByRole('button', { name: 'Save new' })).toBeEnabled()
  await userEvent.click(panel.getByRole('button', { name: 'Save new' }))
  await userEvent.click(panel.getByRole('button', { name: 'New formula' }))
  await userEvent.type(name, '  WEEKEND   batch  ')
  await expect(panel.getByRole('button', { name: 'Save new' })).toBeDisabled()
  await expect(panel.getByRole('alert')).toHaveTextContent('A formula with this name already exists')
  await expect(panel.getAllByRole('option')).toHaveLength(1)
} }

export const DuplicateFormulaValues: Story = { play: async ({ canvasElement }) => {
  const screen = within(canvasElement.ownerDocument.body)
  await waitFor(() => expect(getComputedStyle(screen.getByRole('dialog')).pointerEvents).toBe('auto'))
  await userEvent.click(screen.getByRole('button', { name: /Saved formulas/ }))
  const panel = within(screen.getByRole('region', { name: 'Saved formulas' }))
  const name = panel.getByRole('textbox', { name: 'Formula preset name' })
  await userEvent.type(name, 'Weekend batch')
  await userEvent.click(panel.getByRole('button', { name: 'Save new' }))
  await userEvent.click(panel.getByRole('button', { name: 'New formula' }))
  await userEvent.type(name, 'Another batch')
  await expect(panel.getByRole('button', { name: 'Save new' })).toBeDisabled()
  await expect(panel.getByRole('alert')).toHaveTextContent('This formula is already saved')
  await expect(panel.getAllByRole('option')).toHaveLength(1)
} }

export const RenameSavedFormula: Story = { play: async ({ canvasElement }) => {
  const screen = within(canvasElement.ownerDocument.body)
  await waitFor(() => expect(getComputedStyle(screen.getByRole('dialog')).pointerEvents).toBe('auto'))
  await userEvent.click(screen.getByRole('button', { name: /Saved formulas/ }))
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

export const DeleteWithoutLoading: Story = { play: async ({ canvasElement }) => {
  const screen = within(canvasElement.ownerDocument.body)
  await waitFor(() => expect(getComputedStyle(screen.getByRole('dialog')).pointerEvents).toBe('auto'))
  await userEvent.click(screen.getByRole('button', { name: /Saved formulas/ }))
  const panel = within(screen.getByRole('region', { name: 'Saved formulas' }))
  const name = panel.getByRole('textbox', { name: 'Formula preset name' })
  await userEvent.type(name, 'Weekend batch')
  await userEvent.click(panel.getByRole('button', { name: 'Save new' }))
  await userEvent.click(panel.getByRole('button', { name: 'New formula' }))
  await userEvent.click(panel.getByRole('button', { name: 'Delete Weekend batch' }))
  await expect(panel.queryByRole('option')).not.toBeInTheDocument()
  await expect(panel.getByRole('status')).toHaveTextContent('Deleted “Weekend batch”.')
  await expect(name).toHaveFocus()
} }

export const SourdoughProcessAndSavedStarter: Story = { args: { target: true }, play: async ({ canvasElement }) => {
  const screen = within(canvasElement.ownerDocument.body)
  await waitFor(() => expect(getComputedStyle(screen.getByRole('dialog')).pointerEvents).toBe('auto'))
  await userEvent.click(screen.getByRole('button', { name: /Saved formulas/ }))
  await expect(screen.getByRole('textbox', { name: 'Formula preset name' })).toHaveAttribute('placeholder', 'e.g. Everyday sourdough')
  await expect(screen.queryByRole('textbox', { name: 'Starter profile name' })).not.toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'By hand' }))
  const fold = screen.getByRole('textbox', { name: 'Fold 2 at' })
  await userEvent.clear(fold)
  await userEvent.type(fold, '60')
  await userEvent.tab()
  await expect(screen.getByRole('button', { name: 'Apply to recipe' })).toBeDisabled()
  await userEvent.clear(fold)
  await userEvent.type(fold, '95')
  await userEvent.tab()
  await expect(screen.getByRole('button', { name: 'Apply to recipe' })).toBeEnabled()
  await userEvent.type(screen.getByRole('textbox', { name: 'Formula preset name' }), 'Hand mixed loaf')
  await userEvent.click(screen.getByRole('button', { name: 'Save new' }))
  await userEvent.click(screen.getByRole('button', { name: 'Spiral mixer' }))
  await userEvent.click(screen.getByRole('button', { name: 'Load Hand mixed loaf' }))
  await expect(screen.getByRole('button', { name: 'By hand' })).toHaveAttribute('aria-pressed', 'true')
  await expect(screen.getByRole('textbox', { name: 'Fold 2 at' })).toHaveValue('95')
} }

export const PluginProcessProjection: Story = { play: async () => {
  const initial = JSON.parse(JSON.stringify(state))
  const config = { defaultInputMode: 'target', defaultSelection: initial, recommendedFormulas: {}, processSections: { autolyse: 'autolyse', bulk: 'bulk', levain: 'levain' } }
  const block = { type: 'recipe' as const, equipment: [{ id: 'tools', title: '', items: ['Spiral mixer', 'Bowl'], itemIds: ['mixer', 'bowl'] }], ingredients: [], steps: [
    { id: 'autolyse', title: 'Autolyse', items: ['Original autolyse'], itemIds: ['old-autolyse'] },
    { id: 'bulk', title: 'Bulk', items: ['Original fold schedule'], itemIds: ['old-bulk'] },
    { id: 'levain', title: 'Levain', items: ['Original build', 'Rest until ripe.'], itemIds: ['build', 'rest'] },
    { id: 'bake', title: 'Bake', items: ['Bake as authored.'], itemIds: ['bake-step'] },
  ], notes: [], tips: [] }
  const source: RecipeContent = { ...recipe, workbench: { id: 'sourdough', config }, methodOptions: recipe.methodOptions.map((method) => ({ ...method, blocks: [block] })), blocks: [block] }
  const legacy = plugin.decodeState(initial, config, source) as typeof initial
  await expect(legacy.formula.process.folds.map((fold: { atMinutes: number }) => fold.atMinutes)).toEqual([60, 90, 120])
  legacy.formula.process.mixingMethod = 'hand'
  legacy.formula.process.bulkMinutes = 320
  legacy.formula.process.folds[1].atMinutes = 95
  const shared = plugin.decodeState(JSON.parse(JSON.stringify(legacy)), config, source)
  await expect(shared).not.toBeNull()
  const resolved = plugin.resolveRecipe(source, config, shared)
  const result = resolved.blocks.find((item) => item.type === 'recipe')!
  if (result.type !== 'recipe') throw new Error('Missing recipe block')
  const instructions = result.steps.flatMap((section) => section.items).join(' ')
  await expect(instructions).toContain('[95 min elapsed]')
  await expect(instructions).toContain('by hand')
  await expect(instructions).not.toContain('Original fold schedule')
  await expect(instructions).not.toContain('Spiral mixer')
  await expect(result.steps.find((section) => section.id === 'bake')?.items).toEqual(['Bake as authored.'])
  await expect(result.equipment[0].items).toEqual(['Bowl'])
  await expect(resolved.totalMinutes).toBe((recipe.totalMinutes ?? 0) + 30)
  legacy.formula.process.folds[1].atMinutes = 60
  await expect(plugin.decodeState(legacy, config, source)).toBeNull()
} }
