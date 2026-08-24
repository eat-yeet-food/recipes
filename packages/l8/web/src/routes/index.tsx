import { createFileRoute } from '@tanstack/react-router'

import { HomePage } from '@eat-yeet/l7-home/home/home'
import { ssrPrefetch } from '@eat-yeet/l3-api-query/prefetch'
import { APP_CONFIG } from '@/lib/app-config'
import { buildSeoMeta } from '@/lib/seo'
import { recipeApi, recipeQueries } from '@/lib/api'

const APP_COPY = APP_CONFIG.copy

export const Route = createFileRoute('/')({
  loader: async ({ context }) => {
    await ssrPrefetch(context.queryClient.prefetchQuery(recipeQueries.latest(6)))
  },
  head: () => {
    const seo = buildSeoMeta({
      title: APP_COPY.pages.homeTitle,
      description: APP_COPY.description,
      canonicalPath: '/',
    }, APP_CONFIG)
    return {
      ...seo,
      links: [...seo.links, { rel: 'preload', href: APP_COPY.hero.image, as: 'image' }],
    }
  },
  component: HomeRoute,
})

function HomeRoute() {
  const { data } = recipeApi.useLatest(6)
  return (
    <HomePage copy={APP_COPY} categories={APP_CONFIG.categories} latestRecipes={data?.recipes ?? []} />
  )
}
