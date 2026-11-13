import type { NextRequest } from 'next/server'
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'
import { createMcpServer } from '../../../../next/mcp/server'
import { corsHeaders, mcpOwner, preflight, unauthorized } from '../../../../next/mcp/oauth'

export const dynamic = 'force-dynamic'
export const OPTIONS = preflight

/**
 * The owner's MCP endpoint (Streamable HTTP, stateless: each request gets a
 * fresh server, so nothing depends on which Worker isolate answers). Only a
 * bearer token issued to the site owner gets past the first line.
 */
async function handle(request: NextRequest) {
  const owner = await mcpOwner(request)
  if (!owner) return unauthorized()
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true })
  const server = createMcpServer(owner)
  await server.connect(transport)
  const response = await transport.handleRequest(request)
  const headers = new Headers(response.headers)
  for (const [name, value] of Object.entries(corsHeaders())) headers.set(name, value)
  return new Response(response.body, { status: response.status, headers })
}

export const POST = handle
export const GET = handle
export const DELETE = handle
