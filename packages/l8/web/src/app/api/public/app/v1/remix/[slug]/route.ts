import { appRemixRecipe, APP_API_HEADERS } from '../../../../../../../next/app-api'
import { runtimeSettings } from '../../../../../../../next/cms'
export const dynamic = 'force-dynamic'
export async function GET(_request: Request, route: { params: Promise<{ slug: string }> }) {
  const { slug } = await route.params
  const remix = /^[a-z0-9-]{1,160}$/.test(slug) ? await appRemixRecipe(slug, runtimeSettings().origin) : null
  return remix ? Response.json(remix, { headers: APP_API_HEADERS }) : Response.json({ error: 'Recipe not found.' }, { status: 404, headers: APP_API_HEADERS })
}
