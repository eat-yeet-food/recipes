import type { Preview } from '@storybook/react-vite'

import '../packages/l8/web/src/styles/global.css'
import '../packages/l8/web/src/styles/site-overrides.css'
import '../packages/l8/web/src/styles/storybook.css'

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
