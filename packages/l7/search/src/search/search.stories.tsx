import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { emptySearch, type SearchState } from '@eat-yeet/l2-recipe-domain/search'
import { FacetGroup, SearchPage } from './search'

const courseFacet = {
  key: 'courses',
  label: 'Course',
  values: [
    { value: 'breakfast-and-brunch', count: 5 },
    { value: 'mains', count: 5 },
    { value: 'desserts', count: 4 },
    { value: 'sides', count: 2 },
    { value: 'condiments-and-sauces', count: 1 },
    { value: 'make-ahead-breakfast-and-brunch', count: 2 },
  ],
}

function FilterGroupExample({ initiallySelected = [] }: { initiallySelected?: string[] }) {
  const [selected, setSelected] = useState(initiallySelected)
  return (
    <div className="max-w-[260px] p-4">
      <FacetGroup
        facet={courseFacet}
        selected={selected}
        onToggle={(value) => setSelected((current) => current.includes(value)
          ? current.filter((item) => item !== value)
          : [...current, value])}
      />
    </div>
  )
}

function SearchExample({ initialState = emptySearch() }: { initialState?: SearchState }) {
  const [state, setState] = useState(initialState)
  return <SearchPage recipes={[]} state={state} onChange={setState} />
}

const meta = {
  title: 'Search/Page',
  component: SearchExample,
  subcomponents: { SearchPage, FacetGroup },
  parameters: {
    layout: 'fullscreen',
    docs: { description: { component: 'The mobile title and Filters disclosure share a row with space between. The title can wrap at narrow widths; the button retains its touch target. Expanded filters appear below the row. Desktop uses the sidebar. Both use compact filter groups: 14px labels without counts, 16px checkboxes, 24px minimum clickable rows, and 8px row gaps. The matching recipe total appears above the results.' } },
  },
} satisfies Meta<typeof SearchExample>

export default meta
type Story = StoryObj<typeof meta>

export const Empty: Story = {}
export const ActiveFilters: Story = { args: { initialState: { ...emptySearch(), q: 'pizza', category: ['savory'] } } }
export const CompactFilterGroup: Story = { render: () => <FilterGroupExample /> }
export const SelectedFilterGroup: Story = { render: () => <FilterGroupExample initiallySelected={['mains', 'desserts']} /> }
