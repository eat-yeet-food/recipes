import { authorizationServerMetadata, json, preflight } from '../../../../next/mcp/oauth'

export const dynamic = 'force-dynamic'
export const GET = () => json(authorizationServerMetadata())
export const OPTIONS = preflight
