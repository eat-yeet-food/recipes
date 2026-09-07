import type { Meta, StoryObj } from '@storybook/react-vite'
import { HomeHero } from '@eat-yeet/l7-home/home/home'
import { APP_CONFIG } from '@/lib/app-config'

const meta = {
  title: 'Home/Brand Hero',
  component: HomeHero,
  args: { copy: APP_CONFIG.copy },
  parameters: {
    layout: 'fullscreen',
    docs: { description: { component: 'App-configured production hero: featured food, expressive heading, one clear action. The photo caption identifies the recipe; decorative shapes carry no meaning.' } },
  },
} satisfies Meta<typeof HomeHero>
export default meta
export const Approved: StoryObj<typeof meta> = {}
