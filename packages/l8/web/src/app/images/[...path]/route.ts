import { publicMedia } from '../../../next/cms'
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const name = (await params).path.join('/'),
    media = await publicMedia(),
    m = media['/images/' + name]
  return m
    ? new Response(null, {
        status: 307,
        headers: { Location: m.url, 'Cache-Control': 'no-cache' },
      })
    : new Response(null, {
        status: 404,
        headers: { 'Cache-Control': 'no-store' },
      })
}
