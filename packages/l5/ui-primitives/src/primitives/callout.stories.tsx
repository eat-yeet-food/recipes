import type { Meta, StoryObj } from '@storybook/react-vite'
import { Callout } from './callout'
const meta = { title: 'Patterns/Callout', component: Callout, parameters: { layout: 'padded', docs: { description: { component: 'A boxed message with three tones. **aside** (tint) for informational asides such as "Want to keep it?" or "Saved in this browser"; tint appears nowhere else except History\'s current row. **danger** for errors (renders `role="alert"`). **notice** is the transient plum pill. Controls never sit on tint.' } } },
  args: { children: 'Saving keeps every change in History.' } } satisfies Meta<typeof Callout>
export default meta
type Story = StoryObj<typeof meta>
export const Aside: Story = {}
export const Danger: Story = { args: { tone: 'danger', children: 'Your rating could not be saved. Please try again.' } }
export const Notice: Story = { args: { tone: 'notice', children: 'Restored version 3.' } }
