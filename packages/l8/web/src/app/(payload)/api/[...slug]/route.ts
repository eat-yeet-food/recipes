import {
  REST_GET,
  REST_POST,
  REST_DELETE,
  REST_PATCH,
  REST_PUT,
  REST_OPTIONS,
} from '@payloadcms/next/routes'
import { cmsConfig, runtimeSettings } from '../../../../next/cms'
export const dynamic = 'force-dynamic'
const factories = {
  GET: REST_GET,
  POST: REST_POST,
  DELETE: REST_DELETE,
  PATCH: REST_PATCH,
  PUT: REST_PUT,
  OPTIONS: REST_OPTIONS,
}
async function handle(request: Request, context: any) {
  const { slug = [] } = await context.params
  const authAction =
    slug.length === 2 &&
    slug[0] === 'owners' &&
    ['login', 'logout', 'refresh-token'].includes(slug[1])
  if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method) && !authAction)
    return Response.json(
      { error: 'Read-only CMS. Use the local owner or content commands.' },
      { status: 403, headers: { 'Cache-Control': 'no-store' } },
    )
  const origin = request.headers.get('origin')
  if (origin && origin !== runtimeSettings().origin)
    return Response.json({ error: 'Origin denied' }, { status: 403 })
  const factory = factories[request.method as keyof typeof factories]
  const response = await factory(cmsConfig())(request as any, context)
  response.headers.set('Cache-Control', 'private, no-store')
  return response
}
export {
  handle as GET,
  handle as POST,
  handle as DELETE,
  handle as PATCH,
  handle as PUT,
  handle as OPTIONS,
}
