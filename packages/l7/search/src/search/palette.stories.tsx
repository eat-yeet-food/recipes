import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, within, waitFor } from 'storybook/test'
import { Button } from '@eat-yeet/l5-ui-primitives/primitives/button'
import { SearchPalette } from './palette'
import type { RecipeSummary } from '@eat-yeet/l1-recipe-model/recipes'
const recipes: RecipeSummary[] = [{
  slug: 'new-york-style-pizza', title: 'New York Style Pizza', description: 'Cold-fermented pizza dough', order: 1, category: 'savory', defaultMethod: '', methodOptions: [],
  courses: [], cuisines: [], methods: [], restrictions: [], occasions: [], ingredientTypes: [],
  prepMinutes: 30, cookMinutes: 15, totalMinutes: 45, yieldAmount: 3, yieldUnit: 'pizzas', image: 'charred-crust-pizza.jpg', imageHash: '', created: '', searchText: 'pizza dough',
}]
function PaletteExample() {
  const [open, setOpen] = useState(true)
  return <><Button onClick={() => setOpen(true)}>Search recipes</Button><SearchPalette recipes={recipes} open={open} onClose={() => setOpen(false)} /></>
}
const meta = { title: 'Search/Palette', component: PaletteExample, subcomponents: { SearchPalette }, parameters: { docs: { description: { component: 'The production command palette: flat search field, named dialog, keyboard navigation, empty results and Escape with focus restoration. Recipe routing is exercised in app tests.' } } } } satisfies Meta<typeof PaletteExample>
export default meta
export const Open: StoryObj<typeof meta> = {}
export const EmptyResults: StoryObj<typeof meta> = { play: async ({ canvasElement }) => {
  const body = within(canvasElement.ownerDocument.body)
  await waitFor(() => expect(getComputedStyle(body.getByRole('dialog')).pointerEvents).toBe('auto'))
  await userEvent.type(body.getByRole('combobox'), 'no matching recipe')
  await expect(body.getByText(/No recipes found for/)).toBeVisible()
} }

export const Results: StoryObj<typeof meta> = { play: async ({ canvasElement }) => {
  const body = within(canvasElement.ownerDocument.body)
  await waitFor(() => expect(getComputedStyle(body.getByRole('dialog')).pointerEvents).toBe('auto'))
  await userEvent.type(body.getByRole('combobox'), 'pizza')
  await expect(body.getByText('New York Style Pizza')).toBeVisible()
} }
export const KeyboardSelection: StoryObj<typeof meta> = { play: async ({ canvasElement }) => {
  const body = within(canvasElement.ownerDocument.body)
  await waitFor(() => expect(getComputedStyle(body.getByRole('dialog')).pointerEvents).toBe('auto'))
  await userEvent.type(body.getByRole('combobox'), 'pizza')
  await userEvent.keyboard('{ArrowDown}')
  await expect(body.getByRole('option', { name: /View all results/ })).toHaveAttribute('data-selected', 'true')
} }
