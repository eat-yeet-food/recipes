import { createFileRoute } from '@tanstack/react-router'

import { StorybookHarness } from '../components/storybook-harness'
import { loadRecipe } from '../lib/recipes'
import { buildSeoMeta } from '../lib/seo'

export const Route = createFileRoute('/storybook')({
  loader: async () => {
    const recipe = await loadRecipe('artisan-new-york-pizza')
    if (!recipe) throw new Error('Missing storybook recipe fixture')
    return recipe
  },
  head: () =>
    buildSeoMeta({
      title: 'Storybook | Eat / Yeet',
      description: 'Internal component harness for the Eat / Yeet recipe archive.',
      canonicalPath: '/storybook',
      noindex: true,
    }),
  component: StorybookPage,
})

function StorybookPage() {
  const recipe = Route.useLoaderData()
  return <StorybookHarness recipe={recipe} />
}
