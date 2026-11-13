import type { NextRequest } from 'next/server'
import { revokeMcpToken } from '@eat-yeet/l4-content-cms/mcp-auth'
import { cms } from '../../../../../next/cms'
import { json, preflight, readBody } from '../../../../../next/mcp/oauth'

export const dynamic = 'force-dynamic'
export const OPTIONS = preflight

/** RFC 7009: always 200, whether or not the token existed. */
export async function POST(request: NextRequest) {
  const body = await readBody(request)
  if (body?.token) await revokeMcpToken(await cms(), body.token)
  return json({})
}
