import type { Meta, StoryObj } from '@storybook/react-vite'
import { HomeHero } from '@eat-yeet/l7-home/home/home'
import { APP_CONFIG } from '@/lib/app-config'

const meta = {
  title: 'Features/Home/Brand Hero',
  component: HomeHero,
  args: { copy: APP_CONFIG.copy },
  parameters: {
    layout: 'fullscreen',
    docs: { description: { component: 'The plum hero. Desktop: split photo and copy on one continuous `gradient-hero`, with the orange blob anchored to the section’s right edge so wide screens never show a cut. The headline’s sticker word (app copy `headlineSticker`, default the last word) uses the pink logo sticker. Phone (under md): a full-bleed photo with the plum headline card overlapping it. One eager, high-priority image serves both; no caption. Copy comes from the active app config.' } },
  },
} satisfies Meta<typeof HomeHero>
export default meta
type Story = StoryObj<typeof meta>
const at = (width: number) => [(Story: () => React.ReactNode) => <div style={{ width, maxWidth: '100%' }}><Story /></div>]
export const Desktop: Story = {}
export const Tablet: Story = { parameters: { viewport: { defaultViewport: 'tablet' } }, decorators: at(900) }
