import { storedContent } from '@eat-yeet/l4-content-model/storage'
import type { Payload } from 'payload'
import type { RecipeService } from '@eat-yeet/l3-api-contract/recipes'
import type { ArticleService } from '@eat-yeet/l3-api-contract/articles'
import type { RecipeContent } from '@eat-yeet/l4-content-model/recipes'
import type { ArticleContent } from '@eat-yeet/l4-content-model/articles'

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
  const recipes: RecipeService<RecipeContent> = {
    listRecipes: async (request) => ({
      recipes: (await list('recipes', request?.limit)).map(
        ({ blocks, learning, workbench, mediaReferences, ...r }) => ({
          ...r,
          methodOptions: r.methodOptions?.map(({ blocks, ...m }: any) => m),
        }),
      ),
    }),
    getRecipe: async ({ slug }) => ({ recipe: await detail('recipes', slug) }),
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
