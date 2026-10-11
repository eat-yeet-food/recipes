import { useId, useState } from 'react'
import { expect, userEvent, within, waitFor } from 'storybook/test'
import type { Meta, StoryObj } from '@storybook/react-vite'

import { recipeWorkbenchRegistry } from '@app/recipe-workbenches'
import { AccountProvider } from '@eat-yeet/l6-ui-shell/account/account'
import { fixtureMember, memoryAccountClient } from '@eat-yeet/l6-ui-shell/account/account-fixture'
import { RecipeAdjustmentSummary, RecipeWorkbenchChoicesSource } from '@eat-yeet/l7-recipes/recipes/recipe-workbench'
import { recipe, state } from './dough-workbench-fixture'

const plugin = recipeWorkbenchRegistry.get('sourdough')!

const SAVED_FORMULAS = [
  { id: 'everyday', name: 'Everyday sourdough', formula: { ...state.formula, hydrationPercent: 82 } },
  { id: 'country', name: 'High-hydration country loaf for the weekend bake sale', formula: { ...state.formula, hydrationPercent: 86 } },
]

/** The recipe page's summary and calculator, sharing one member account as they do in the app. */
function RecipeSummaryPreview({ saved = true }: { saved?: boolean }) {
  const scope = `storybook-${useId()}`
  const [applied, setApplied] = useState<unknown>(null)
  const [open, setOpen] = useState(false)
  const config = { defaultInputMode: 'target', defaultSelection: state, recommendedFormulas: {}, doughIngredientSectionId: 'dough', initialWaterPercent: 97 }
  const [account] = useState(() => memoryAccountClient({ member: fixtureMember, workbenches: saved ? { [`${scope}:recipe-workbench:v1`]: { presets: SAVED_FORMULAS, defaults: { [recipe.slug]: 'everyday' } } } : {} }))
  const current = applied ?? state
  const workbench = { plugin, config, state: current, hasSharedConfiguration: applied !== null }
  return <AccountProvider client={account} initialSession={{ member: fixtureMember, providers: { google: true } }}><div className="max-w-[var(--layout-recipe-copy)] bg-white p-4 text-ink">
    <RecipeWorkbenchChoicesSource recipe={recipe} workbench={workbench} onApply={setApplied} storageScope={scope}>
      {(choices) => <RecipeAdjustmentSummary summary={plugin.summary(recipe, config, current)!} onOpen={() => setOpen(true)} choices={choices} />}
    </RecipeWorkbenchChoicesSource>
    <plugin.Drawer recipe={recipe} config={config} state={current} onApply={setApplied} hasSharedConfiguration={applied !== null} storageScope={scope} open={open} onOpenChange={setOpen} />
  </div></AccountProvider>
}

const meta = {
  title: 'Recipes/Saved formula choice',
  component: RecipeSummaryPreview,
  parameters: { layout: 'padded', docs: { description: { component: 'A member with saved formulas chooses one beside the recipe summary. The last choice is stored in the account and loads on the next visit to the plain recipe URL; an unsaved adjustment reads as Custom until it is saved from the prompt that follows Apply. Members without saved formulas, and signed-out readers, see the summary unchanged.' } } },
} satisfies Meta<typeof RecipeSummaryPreview>

export default meta
type Story = StoryObj<typeof meta>

export const RememberedChoice: Story = { play: async ({ canvasElement }) => {
  const canvas = within(canvasElement)
  const screen = within(canvasElement.ownerDocument.body)
  // The remembered formula loads once the member's account store arrives.
  const choice = await canvas.findByRole('combobox', { name: 'Saved formula' })
  await waitFor(() => expect(choice).toHaveValue('saved:everyday'))
  const summary = canvas.getByRole('button', { name: 'Adjust recipe' }).parentElement!
  await expect(summary).toHaveTextContent('82% hydration')
  const width = summary.getBoundingClientRect().width
  await userEvent.selectOptions(choice, 'saved:country')
  await expect(summary).toHaveTextContent('86% hydration')
  await expect(summary.getBoundingClientRect().width).toBe(width)
  await userEvent.selectOptions(choice, 'original')
  await expect(summary).toHaveTextContent('77% hydration')
  // An unsaved adjustment reads as Custom until it is saved from the prompt.
  await userEvent.click(canvas.getByRole('button', { name: 'Adjust recipe' }))
  const hydration = await screen.findByRole('textbox', { name: 'Hydration' })
  await userEvent.clear(hydration)
  await userEvent.type(hydration, '70')
  await userEvent.click(screen.getByRole('button', { name: 'Apply to recipe' }))
  await expect(canvas.getByRole('combobox', { name: 'Saved formula', hidden: true })).toHaveValue('custom')
  await userEvent.type(await screen.findByRole('textbox', { name: 'Formula name' }), 'Stiff dough')
  await userEvent.click(screen.getByRole('button', { name: 'Save formula' }))
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  await expect(canvas.getByRole('option', { name: 'Stiff dough' })).toBeInTheDocument()
  await expect(canvas.queryByRole('option', { name: 'Custom' })).not.toBeInTheDocument()
} }

export const WithoutSavedFormulas: Story = { args: { saved: false }, play: async ({ canvasElement }) => {
  const canvas = within(canvasElement)
  const adjust = await canvas.findByRole('button', { name: 'Adjust recipe' })
  await expect(canvas.queryByRole('combobox', { name: 'Saved formula' })).not.toBeInTheDocument()
  await expect(adjust.parentElement).toHaveTextContent('Your recipe')
} }
