import { readFileSync } from 'node:fs'
import { connect } from './check.mjs'
const file = process.argv[2]
const t = Date.now(), log = (m) => console.log(`${((Date.now() - t) / 1000).toFixed(1)}s ${m}`)
const { client, call } = await connect()
try { const image = await call('upload_image', { base64: readFileSync(file).toString('base64'), alt: 'probe' }); log('upload ok ' + image.width + 'x' + image.height) }
catch (e) { log('upload FAILED ' + String(e.message).slice(0, 100)) }
await client.close()
