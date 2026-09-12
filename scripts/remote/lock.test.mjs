import test from 'node:test'
import assert from 'node:assert/strict'
import { ReleaseLock, recoverLocalLock } from './lock.mjs'
import { seal, unseal } from './credentials.mjs'
import { environmentName } from './config.mjs'

class ConditionalStore {
  objects = new Map()
  sequence = 0
  async read(key) { return structuredClone(this.objects.get(key) ?? null) }
  async write(key, value, condition = {}) {
    const old = this.objects.get(key)
    if ((condition.IfNoneMatch === '*' && old) || (condition.IfMatch && condition.IfMatch !== old?.etag)) throw new Error('Precondition failed')
    const etag = String(++this.sequence)
    this.objects.set(key, { value: structuredClone(value), etag })
    return etag
  }
  async remove(key, etag) {
    if (this.objects.get(key)?.etag !== etag) throw new Error('Precondition failed')
    this.objects.delete(key)
  }
}
test('two machines cannot acquire the same release lock, including after heartbeat expiry', async () => {
  const store = new ConditionalStore()
  const old = new ReleaseLock(store, 'production', () => new Date(0))
  const other = new ReleaseLock(store, 'production')
  await old.acquire('old')
  await assert.rejects(other.acquire('new'), /Release locked/)
  await old.release()
  await other.acquire('new')
  await other.release()
})
test('overlapping phase and heartbeat updates retain conditional ownership', async () => {
  const store = new ConditionalStore(), lock = new ReleaseLock(store, 'staging')
  await lock.acquire('release')
  await Promise.all([lock.checkpoint('migrate'), lock.checkpoint(), lock.checkpoint('sync')])
  assert.equal((await store.read(lock.key)).value.phase, 'sync')
  await lock.release()
})
test('former owner cannot overwrite or delete a replacement lock', async () => {
  const store = new ConditionalStore(), lock = new ReleaseLock(store, 'staging')
  await lock.acquire('old')
  await store.write(lock.key, { token: 'new-owner' })
  await assert.rejects(lock.checkpoint('sync'), /ownership lost/)
  await assert.rejects(lock.release(), /ownership lost/)
  assert.equal((await store.read(lock.key)).value.token, 'new-owner')
})
test('recovery refuses a live writer and a mismatched release', async () => {
  const store = new ConditionalStore(), lock = new ReleaseLock(store, 'staging')
  await lock.acquire('alive')
  await assert.rejects(recoverLocalLock(store, 'staging', 'other'), /identity/)
  await assert.rejects(recoverLocalLock(store, 'staging', 'alive'), /still running/)
  await lock.release()
})
test('credential recovery authenticates ciphertext and requires a separate strong passphrase', () => {
  const value = { private: 'test-secret', account: 'staging' }, password = 'a separate recovery passphrase'
  const encrypted = seal(value, password)
  assert.ok(!JSON.stringify(encrypted).includes(value.private))
  assert.deepEqual(unseal(encrypted, password), value)
  assert.throws(() => unseal(encrypted, 'incorrect password'))
  encrypted.ciphertext = Buffer.from('tampered').toString('base64')
  assert.throws(() => unseal(encrypted, password))
  assert.throws(() => seal(value, 'short'))
})
test('remote environment never silently falls back to production or local', () => {
  for (const value of [undefined, '', 'prod', 'local', '../production']) assert.throws(() => environmentName(value))
  assert.equal(environmentName('staging'), 'staging')
})
