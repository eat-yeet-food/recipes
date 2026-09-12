import { publicMedia } from '../../../next/cms'
export const dynamic = 'force-dynamic'

/** Legacy source names resolve only to eligible derivatives, never originals. */
export async function GET(_request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const name = '/images/' + (await params).path.join('/')
  const manifest = (await publicMedia())[name]
  if (!manifest) return new Response(null, { status: 404, headers: { 'Cache-Control': 'no-store' } })
  return new Response(null, { status: 302, headers: { Location: manifest.url, 'Cache-Control': 'no-store' } })
}
