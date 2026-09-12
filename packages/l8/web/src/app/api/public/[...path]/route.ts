import { services } from '../../../../next/cms'
export const dynamic = 'force-dynamic'
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const [collection, slug, ...rest] = (await params).path,
    api = await services()
  if (rest.length || !['recipes', 'articles'].includes(collection))
    return Response.json({ error: 'Not found' }, { status: 404 })
  const result =
    collection === 'recipes'
      ? slug
        ? await api.recipes.getRecipe({ slug })
        : await api.recipes.listRecipes()
      : slug
        ? await api.articles.getArticle({ slug })
        : await api.articles.listArticles()
  return Response.json(result, {
    status: slug && Object.values(result)[0] === null ? 404 : 200,
    headers: { 'Cache-Control': 'no-store' },
  })
}
