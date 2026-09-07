import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, within } from 'storybook/test'
import { NumberField } from './number-field'

function Example({ integer = false }: { integer?: boolean }) {
  const [value, setValue] = useState(1)
  return <div className="max-w-80 bg-brand p-5">
    <NumberField label={integer ? 'Quantity' : 'Weight'} value={value} onValueChange={setValue} integer={integer} min={integer ? 1 : 0} suffix={integer ? undefined : 'g'} />
    <p role="status">Accepted value: {value}</p>
  </div>
}

const meta = { title: 'Controls/Number field', component: Example, parameters: { docs: { description: { component: 'Text editing with a numeric or decimal mobile keypad. Empty and partial entries remain editable; valid values update live without moving the caret or reformatting the text. Decimal commas are accepted. Invalid entries stay visible on blur and are reported to the owner; Enter finishes editing. The shared Input supplies a 16px font and 44px minimum target.' } } } } satisfies Meta<typeof Example>
export default meta
type Story = StoryObj<typeof meta>
export const Decimal: Story = {}
export const Quantity: Story = { args: { integer: true } }
export const ClearAndReplace: Story = { args: { integer: true }, play: async ({ canvasElement }) => {
  const screen = within(canvasElement)
  const input = screen.getByRole('textbox', { name: 'Quantity' })
  await userEvent.clear(input)
  await expect(input).toHaveValue('')
  await expect(screen.getByRole('status')).toHaveTextContent('Accepted value: 1')
  await userEvent.type(input, '12')
  await expect(input).toHaveValue('12')
  await expect(screen.getByRole('status')).toHaveTextContent('Accepted value: 12')
} }
export const DecimalCommaAndPrecision: Story = { play: async ({ canvasElement }) => {
  const screen = within(canvasElement)
  const input = screen.getByRole('textbox', { name: 'Weight' })
  await userEvent.clear(input)
  await userEvent.type(input, '0,')
  await expect(input).toHaveValue('0,')
  await userEvent.type(input, '025')
  await expect(input).toHaveValue('0,025')
  await expect(screen.getByRole('status')).toHaveTextContent('Accepted value: 0.025')
  await userEvent.keyboard('{Enter}')
  await expect(input).not.toHaveFocus()
  await expect(input).toHaveValue('0.025')
} }
export const InvalidQuantity: Story = { args: { integer: true }, play: async ({ canvasElement }) => {
  const screen = within(canvasElement)
  const input = screen.getByRole('textbox', { name: 'Quantity' })
  await userEvent.clear(input)
  await userEvent.type(input, '1.5')
  await userEvent.tab()
  await expect(input).toHaveValue('1.5')
  await expect(input).toHaveAttribute('aria-invalid', 'true')
  await expect(screen.getByText('Enter a whole number.')).toBeInTheDocument()
  await expect(screen.getByRole('status')).toHaveTextContent('Accepted value: 1')
} }
