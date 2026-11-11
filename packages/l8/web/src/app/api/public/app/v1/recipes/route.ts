import { appRecipeIndex, APP_API_HEADERS } from '../../../../../../next/app-api'
import { runtimeSettings } from '../../../../../../next/cms'
export const dynamic = 'force-dynamic'
export async function GET() {
  return Response.json(await appRecipeIndex(runtimeSettings().origin), { headers: APP_API_HEADERS })
}
