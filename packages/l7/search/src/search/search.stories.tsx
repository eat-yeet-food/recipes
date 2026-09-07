import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { emptySearch, type SearchState } from '@eat-yeet/l2-recipe-domain/search'
import { SearchPage } from './search'

function SearchExample({ initialState = emptySearch() }: { initialState?: SearchState }) {
  const [state, setState] = useState(initialState)
  return <SearchPage recipes={[]} state={state} onChange={setState} />
}

const meta = {
  title: 'Search/Page',
  component: SearchExample,
  subcomponents: { SearchPage },
  parameters: {
    layout: 'fullscreen',
    docs: { description: { component: 'The mobile title and Filters disclosure share a row with space between. The title can wrap at narrow widths; the button retains its touch target. Expanded filters appear below the row. Desktop uses the sidebar.' } },
  },
} satisfies Meta<typeof SearchExample>

export default meta
type Story = StoryObj<typeof meta>

export const Empty: Story = {}
export const ActiveFilters: Story = { args: { initialState: { ...emptySearch(), q: 'pizza', category: ['savory'] } } }
