import { createFileRoute } from '@tanstack/react-router'

import { RecipeGrid } from '@eat-yeet/l6-ui-catalog/cards'
import { ssrPrefetch } from '@eat-yeet/l3-api-query/prefetch'
import { APP_CONFIG } from '@/lib/app-config'
import { buildSeoMeta } from '@/lib/seo'
import { recipeApi, recipeQueries } from '@/lib/api'

const APP_COPY = APP_CONFIG.copy

/**
 * The full listing. `/search` is the same set with filters attached, so this
 * page carries the canonical link and the crawlable grid while /search stays
 * the interactive view.
 */
export const Route = createFileRoute('/recipes/')({
  loader: async ({ context }) => {
    await ssrPrefetch(context.queryClient.prefetchQuery(recipeQueries.list()))
  },
  head: () =>
    buildSeoMeta({
      title: APP_COPY.pages.recipesTitle,
      description: APP_COPY.pages.recipesDescription,
      canonicalPath: '/recipes',
    }, APP_CONFIG),
  component: RecipesIndex,
})

function RecipesIndex() {
  const { data } = recipeApi.useList()

  return (
    <div className="mx-auto max-w-[var(--max-width)] px-6 pt-8 pb-20 md:px-8">
      {/* An h1, not SectionHeading's h2: this is a page heading, and the page
          had none. Same treatment the search page gives its own title. */}
      <div className="mb-8">
        <h1 className="font-display text-[clamp(28px,4vw,40px)] font-extrabold text-ink">
          {APP_COPY.pages.recipesHeading}
        </h1>
        <p className="mt-3 max-w-lg text-sm leading-relaxed text-ink/65">
          {APP_COPY.pages.recipesIntro}
        </p>
      </div>
      <RecipeGrid recipes={data?.recipes ?? []} />
    </div>
  )
}
