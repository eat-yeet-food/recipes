import { mcpSettings } from '../../../next/cms'

export const dynamic = 'force-dynamic'

/** OpenAI's domain check for the ChatGPT app: the exact token, as plain text (enrolled with remote:credentials account). */
export function GET() {
  const token = mcpSettings().openaiChallenge
  return new Response(token || 'Not configured', { status: token ? 200 : 404,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } })
}
