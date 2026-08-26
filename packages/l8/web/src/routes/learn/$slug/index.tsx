import { createFileRoute, notFound } from '@tanstack/react-router'

import { articleImageUrl } from '@eat-yeet/l1-article-model/articles'
import { ArticleDetailPage } from '@eat-yeet/l7-learn/learn/learn'
import { ssrPrefetch } from '@eat-yeet/l3-api-query/prefetch'
import type { ArticleContent as Article } from '@eat-yeet/l4-content-model/articles'
import { APP_CONFIG } from '@/lib/app-config'
import { articleApi, articleQueries } from '@/lib/api'
import { buildSeoMeta } from '@/lib/seo'

const APP_COPY = APP_CONFIG.copy

export const Route = createFileRoute('/learn/$slug/')({
  loader: async ({ context, params }) => {
    await ssrPrefetch(context.queryClient.prefetchQuery(articleQueries.list()))
    const { article } = await context.queryClient.ensureQueryData(articleQueries.detail(params.slug))
    if (!article) throw notFound()
    return article
  },
  head: ({ loaderData, params }) => {
    const article = loaderData as Article | undefined
    const photo = article ? articleImageUrl(article) : ''
    return buildSeoMeta({
      title: article ? `${article.title} | ${APP_COPY.pages.articleTitleSuffix}` : APP_COPY.pages.articleFallbackTitle,
      description:
        article?.description || `Read the learning guide for ${params.slug.replace(/-/g, ' ')}.`,
      canonicalPath: `/learn/${params.slug}`,
      ogType: 'article',
      ogImage: photo || undefined,
    }, APP_CONFIG)
  },
  component: ArticleRoute,
})

function ArticleRoute() {
  const article = Route.useLoaderData()
  const { data } = articleApi.useList()

  return (
    <ArticleDetailPage
      article={article}
      articles={data?.articles ?? []}
    />
  )
}
