import { appRecipe, APP_API_HEADERS, clampCount } from '../../../../../../../next/app-api'
import { runtimeSettings } from '../../../../../../../next/cms'
export const dynamic = 'force-dynamic'
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const result = await appRecipe(slug, clampCount(new URL(request.url).searchParams.get('count')), runtimeSettings().origin)
  return result
    ? Response.json(result, { headers: APP_API_HEADERS })
    : Response.json({ error: 'Not found' }, { status: 404, headers: APP_API_HEADERS })
}
