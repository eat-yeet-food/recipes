import { storedContent } from '@eat-yeet/l4-content-model/storage'
import type { Payload } from 'payload'
import type { RecipeService } from '@eat-yeet/l3-api-contract/recipes'
import type { ArticleService } from '@eat-yeet/l3-api-contract/articles'
import type { RecipeContent } from '@eat-yeet/l4-content-model/recipes'
import type { ArticleContent } from '@eat-yeet/l4-content-model/articles'
import { publishedTrialRecipe, publishedTrialRecipes } from './trial'

export function contentServices(payload: Payload) {
  const list = async (collection: 'recipes' | 'articles', limit?: number) => {
    const { docs } = await payload.find({
      collection,
      overrideAccess: false,
      user: null,
      pagination: false,
      depth: 0,
      select: {
        title: true,
        slug: true,
        details: true,
        ...(collection === 'recipes'
          ? { methodOptions: { methodId: true, details: true } }
          : {}),
      } as any,
      where: { status: { equals: 'published' } },
    })
    const items = docs
      .map((d) => storedContent(d))
      .sort((a, b) =>
        a.order != null && b.order != null && a.order !== b.order
          ? a.order - b.order
          : a.order != null && b.order == null
            ? -1
            : b.order != null && a.order == null
              ? 1
              : String(b.created).localeCompare(String(a.created)) ||
                a.title.localeCompare(b.title),
      )
    return limit == null ? items : items.slice(0, limit)
  }
  const detail = async (collection: 'recipes' | 'articles', slug: string) => {
    const { docs } = await payload.find({
      collection,
      overrideAccess: false,
      user: null,
      depth: 0,
      limit: 1,
      where: {
        and: [{ slug: { equals: slug } }, { status: { equals: 'published' } }],
      },
    })
    return docs[0] ? storedContent(docs[0]) : null
  }
  const withTrials = async (items: any[], limit?: number) => {
    const slugs = new Set(items.map((item) => item.slug))
    const all = [...items, ...(await publishedTrialRecipes(payload)).map((trial) => trial.content).filter((trial) => !slugs.has(trial.slug))]
    return limit == null ? all : all.slice(0, limit)
  }
  const recipes: RecipeService<RecipeContent> = {
    // Trial recipes (written through the MCP connector) follow the Git recipes; Git wins a slug.
    listRecipes: async (request) => ({
      recipes: (await withTrials(await list('recipes'), request?.limit)).map(
        ({ blocks, learning, workbench, mediaReferences, ...r }) => ({
          ...r,
          // Summaries name the calculator without its configuration.
          ...(workbench ? { workbench: { id: workbench.id, config: {} } } : {}),
          methodOptions: r.methodOptions?.map(({ blocks, ...m }: any) => m),
        }),
      ),
    }),
    getRecipe: async ({ slug }) => ({ recipe: (await detail('recipes', slug)) ?? (await publishedTrialRecipe(payload, slug))?.content ?? null }),
  }
  const articles: ArticleService<ArticleContent> = {
    listArticles: async (request) => ({
      articles: (await list('articles', request?.limit)).map(
        ({ blocks, ...a }) => a,
      ),
    }),
    getArticle: async ({ slug }) => ({
      article: await detail('articles', slug),
    }),
  }
  return { recipes, articles }
}
