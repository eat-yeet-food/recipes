import { createElement } from 'react'
import { NavigationProvider } from '@eat-yeet/l5-ui-primitives/primitives/navigation'
import type { Preview } from '@storybook/react-vite'

import '../src/styles/global.css'
import '../src/styles/site-overrides.css'
import '../src/styles/storybook.css'

const preview: Preview = {
  tags: ['autodocs'],
  decorators: [(Story)=>createElement(NavigationProvider,{navigate:()=>{},children:createElement(Story)})],
  beforeEach: () => { delete document.documentElement.dataset.storyReady },
  afterEach: (context) => { document.documentElement.dataset.storyReady = context.id },
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    layout: 'fullscreen',
  },
}

export default preview
