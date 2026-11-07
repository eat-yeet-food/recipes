import type { Meta, StoryObj } from '@storybook/react-vite'
import { Eyebrow, PageTitle, SectionTitle } from './typography'

const usage = `Three owned text patterns replace hand-styled headings:

- **Eyebrow:** small uppercase label above a title or group. Sizes \`default\` (12px) and \`small\` (11px), one tracking (\`tracking-eyebrow\`). Tone follows the surface: \`ink\` on white, \`brand\` on plum, \`muted\` for quiet meta, \`on-dark\` for light labels on plum.
- **PageTitle:** every page's h1. \`standard\` is Geller bold at \`text-page\`; \`display\` is Bowlby at \`text-display\`, only for brand bands (NOTEBOOK).
- **SectionTitle:** h2 at \`text-section\` (or \`title\`). \`rule="trailing"\` continues a thin rule to the right (ratings, Notebook library, Learn groups); \`rule="top"\` sits under a top border (recipe body sections).

Geller weights: page and section titles bold; card and dialog titles extrabold.`

const meta = { title: 'Patterns/Typography', component: PageTitle, parameters: { layout: 'padded', docs: { description: { component: usage } } } } satisfies Meta<typeof PageTitle>
export default meta
type Story = StoryObj<typeof meta>
export const Eyebrows: Story = { render: () => <div className="grid gap-4"><Eyebrow>Top Eats</Eyebrow><Eyebrow size="small">Guide</Eyebrow><Eyebrow tone="muted">Category</Eyebrow><div className="rounded-field bg-ink p-4"><Eyebrow tone="brand">Eat / Yeet</Eyebrow></div></div> }
export const PageTitles: Story = { render: () => <div className="grid gap-6"><PageTitle>Search Recipes</PageTitle><PageTitle size="display">NOTEBOOK</PageTitle></div> }
export const SectionTitles: Story = { render: () => <div className="grid max-w-2xl gap-8"><SectionTitle size="title" rule="trailing">Ratings &amp; Reviews</SectionTitle><SectionTitle rule="top">Ingredients</SectionTitle></div> }
