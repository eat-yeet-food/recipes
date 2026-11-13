import { json, preflight, protectedResourceMetadata } from '../../../../next/mcp/oauth'

export const dynamic = 'force-dynamic'
// Served at the root and at the resource's path suffix (RFC 9728 §3.1).
export const GET = () => json(protectedResourceMetadata())
export const OPTIONS = preflight
