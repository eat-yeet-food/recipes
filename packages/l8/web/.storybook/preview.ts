import type { Preview } from '@storybook/react-vite'

import '../src/styles/global.css'
import '../src/styles/site-overrides.css'
import '../src/styles/storybook.css'

const preview: Preview = {
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
