#!/usr/bin/env node
// Generates packages/l3/app-api/src/schema.ts from openapi.yaml (the app API's single source).
// `--check` fails when the committed file is stale instead of writing it.
import { readFileSync, writeFileSync } from 'node:fs'
import openapiTS, { astToString } from 'openapi-typescript'

const spec = new URL('../packages/l3/app-api/openapi.yaml', import.meta.url)
const target = new URL('../packages/l3/app-api/src/schema.ts', import.meta.url)
const header = '// Generated from openapi.yaml by `pnpm app-api:gen`. Do not edit.\n'
const output = header + astToString(await openapiTS(spec))
if (process.argv.includes('--check')) {
  if (readFileSync(target, 'utf8') !== output) {
    console.error('packages/l3/app-api/src/schema.ts is stale: run `pnpm app-api:gen`.')
    process.exit(1)
  }
  console.log('app API schema is up to date')
} else {
  writeFileSync(target, output)
  console.log('wrote packages/l3/app-api/src/schema.ts')
}
