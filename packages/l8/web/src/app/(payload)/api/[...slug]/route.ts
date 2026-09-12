import { handleEndpoints } from 'payload'
import { formatAdminURL } from 'payload/shared'
import { cmsConfig, runtimeSettings } from '../../../../next/cms'
export const dynamic = 'force-dynamic'
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
  const config = await cmsConfig()
  // Use Payload's native dispatcher without adding Next's unused /api/og renderer.
  const response = await handleEndpoints({ config, request, path: formatAdminURL({
    apiRoute: config.routes.api, path: `/${slug.map(encodeURIComponent).join('/')}`,
  }) })
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
