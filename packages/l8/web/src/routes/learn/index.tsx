import { createFileRoute } from '@tanstack/react-router'

import { LearnIndexPage } from '@eat-yeet/l7-learn/learn/learn'
import { ssrPrefetch } from '@eat-yeet/l3-api-query/prefetch'
import { APP_CONFIG } from '@/lib/app-config'
import { articleApi, articleQueries } from '@/lib/api'
import { buildSeoMeta } from '@/lib/seo'

const APP_COPY = APP_CONFIG.copy

export const Route = createFileRoute('/learn/')({
  loader: async ({ context }) => {
    await ssrPrefetch(context.queryClient.prefetchQuery(articleQueries.list()))
  },
  head: () =>
    buildSeoMeta({
      title: APP_COPY.pages.learnTitle,
      description: APP_COPY.pages.learnDescription,
      canonicalPath: '/learn',
    }, APP_CONFIG),
  component: LearnRoute,
})

function LearnRoute() {
  const { data } = articleApi.useList()

  return <LearnIndexPage articles={data?.articles ?? []} copy={APP_COPY} />
}
