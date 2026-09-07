import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, within } from 'storybook/test'
import { NumberField, type NumberFieldPrecision } from './number-field'

function Example({ integer = false, initialValue = 1, decimalPlaces = 1 }: { integer?: boolean; initialValue?: number; decimalPlaces?: NumberFieldPrecision }) {
  const [value, setValue] = useState(initialValue)
  return <div className="max-w-80 bg-brand p-5">
    <NumberField label={integer ? 'Quantity' : 'Weight'} value={value} onValueChange={setValue} integer={integer} min={integer ? 1 : 0} suffix={integer ? undefined : 'g'} decimalPlaces={decimalPlaces} />
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
export const DecimalCommaAndPrecision: Story = { args: { decimalPlaces: 1 }, play: async ({ canvasElement }) => {
  const screen = within(canvasElement)
  const input = screen.getByRole('textbox', { name: 'Weight' })
  await userEvent.clear(input)
  await userEvent.type(input, '0,')
  await expect(input).toHaveValue('0,')
  await userEvent.type(input, '25')
  await expect(input).toHaveValue('0,25')
  await expect(screen.getByRole('status')).toHaveTextContent('Accepted value: 0.25')
  await userEvent.keyboard('{Enter}')
  await expect(input).not.toHaveFocus()
  await expect(input).toHaveValue('0.3')
} }
export const RoundedDoughWeight: Story = { args: { initialValue: 908.8242755752875, decimalPlaces: 0 }, play: async ({ canvasElement }) => {
  const screen = within(canvasElement)
  const input = screen.getByRole('textbox', { name: 'Weight' })
  await expect(input).toHaveValue('909')
  await userEvent.click(input)
  await userEvent.tab()
  await expect(screen.getByRole('status')).toHaveTextContent('Accepted value: 908.8242755752875')
  await userEvent.clear(input)
  await userEvent.type(input, '907.625')
  await expect(input).toHaveValue('907.625')
  await userEvent.tab()
  await expect(input).toHaveValue('908')
  await expect(screen.getByRole('status')).toHaveTextContent('Accepted value: 907.625')
} }
export const TinyAmount: Story = { args: { initialValue: 0.25, decimalPlaces: 1 } }
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
