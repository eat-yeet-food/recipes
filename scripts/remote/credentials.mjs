import { spawnSync } from 'node:child_process'
import { randomBytes, scryptSync, createCipheriv, createDecipheriv } from 'node:crypto'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

export async function hiddenInput(label) {
  if (!process.stdin.isTTY) throw new Error('An interactive terminal is required for secret enrollment')
  process.stdout.write(label + ': ')
  process.stdin.setRawMode(true)
  process.stdin.resume()
  return new Promise((resolve, reject) => {
    let value = ''
    const done = () => {
      process.stdin.off('data', read)
      process.stdin.setRawMode(false)
      process.stdin.pause()
      process.stdout.write('\n')
    }
    const read = (chunk) => {
      for (const char of chunk.toString()) {
        if (char === '\u0003') { done(); reject(new Error('Cancelled')); return }
        if (char === '\r' || char === '\n') { done(); resolve(value); return }
        if (char === '\u007f') value = value.slice(0, -1)
        else if (char >= ' ') value += char
      }
    }
    process.stdin.on('data', read)
  })
}
export function keychain(action, account, value) {
  if (!['staging', 'production', 'bootstrap', 'wrangler'].includes(account)) throw new Error('Invalid credential scope')
  const moduleCache = resolve('.local/remote/swift-module-cache')
  mkdirSync(moduleCache, { recursive: true, mode: 0o700 })
  const result = spawnSync('swift', ['-module-cache-path', moduleCache, 'scripts/remote/keychain.swift', action, account], {
    input: value ? JSON.stringify(value) : undefined,
    encoding: 'utf8', maxBuffer: 1024 * 1024,
  })
  if (result.status !== 0) throw new Error(`Keychain ${action} failed for ${account}; run remote:credentials in an interactive terminal`)
  return action === 'get' ? JSON.parse(result.stdout) : undefined
}
export function seal(value, passphrase) {
  if (passphrase.length < 16) throw new Error('Recovery passphrase must contain at least 16 characters')
  const salt = randomBytes(32), iv = randomBytes(12)
  const key = scryptSync(passphrase, salt, 32)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value)), cipher.final()])
  return { version: 1, salt: salt.toString('base64'), iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), ciphertext: ciphertext.toString('base64') }
}
export function unseal(envelope, passphrase) {
  if (envelope.version !== 1) throw new Error('Unsupported recovery format')
  const decode = (key) => Buffer.from(envelope[key], 'base64')
  const decipher = createDecipheriv('aes-256-gcm', scryptSync(passphrase, decode('salt'), 32), decode('iv'))
  decipher.setAuthTag(decode('tag'))
  return JSON.parse(Buffer.concat([decipher.update(decode('ciphertext')), decipher.final()]).toString())
}
export async function credentialsCommand(environment, action, path) {
  if (action === 'export') {
    const password = await hiddenInput('Separate recovery passphrase (16+ characters)')
    if (password !== await hiddenInput('Repeat recovery passphrase')) throw new Error('Passphrases differ')
    const enrolled = { ...keychain('get', environment), RECOVERY_EXPORTED_AT: new Date().toISOString() }
    writeFileSync(path, JSON.stringify(seal(enrolled, password)), { mode: 0o600, flag: 'wx' })
    keychain('set', environment, enrolled)
    console.log('Encrypted recovery export written. Store it separately from this computer.')
  } else if (action === 'import') {
    keychain('set', environment, unseal(JSON.parse(readFileSync(path, 'utf8')), await hiddenInput('Recovery passphrase')))
  } else if (action === 'enroll') {
    const credentials = {}
    for (const name of ['CLOUDFLARE_API_TOKEN', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'PULUMI_CONFIG_PASSPHRASE']) {
      credentials[name] = await hiddenInput(name)
      if (!credentials[name]) throw new Error(`${name} is required`)
    }
    credentials.PAYLOAD_SECRET = randomBytes(48).toString('hex')
    credentials.RELEASE_VERIFY_SECRET = randomBytes(48).toString('hex')
    if (credentials.PULUMI_CONFIG_PASSPHRASE.length < 16) throw new Error('State encryption passphrase must contain at least 16 characters')
    keychain('create', environment, credentials)
    console.log(`Credentials enrolled for ${environment}. Export a recovery copy before bootstrap.`)
  } else throw new Error('Use credentials enroll, export <file>, or import <file>')
}
