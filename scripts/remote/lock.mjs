import { randomUUID } from 'node:crypto'
import { hostname } from 'node:os'

export class ReleaseLock {
  constructor(store, environment, now = () => new Date()) {
    this.store = store; this.key = `locks/${environment}.json`; this.now = now
    this.tail = Promise.resolve()
  }
  async acquire(releaseId) {
    this.value = { token: randomUUID(), releaseId, host: hostname(), pid: process.pid,
      acquiredAt: this.now().toISOString(), heartbeatAt: this.now().toISOString(), phase: 'acquired' }
    try { this.etag = await this.store.write(this.key, this.value, { IfNoneMatch: '*' }) }
    catch (error) {
      const current = await this.store.read(this.key)
      if (current) throw new Error(`Release locked by ${current.value.releaseId} on ${current.value.host} (PID ${current.value.pid}); use release status/recover. Expiry never unlocks it.`)
      throw error
    }
  }
  async assertOwner() {
    if (this.failure) throw this.failure
    const current = await this.store.read(this.key)
    if (!current || current.value.token !== this.value?.token) throw new Error('Release lock ownership lost')
  }
  checkpoint(phase) {
    const next = this.tail.then(async () => {
      await this.assertOwner()
      this.value = { ...this.value, phase: phase ?? this.value.phase, heartbeatAt: this.now().toISOString() }
      this.etag = await this.store.write(this.key, this.value, { IfMatch: this.etag })
    })
    this.tail = next.catch((error) => { this.failure = error })
    return next
  }
  startHeartbeat(onFailure) {
    this.timer = setInterval(() => this.checkpoint().catch(onFailure), 15000)
    this.timer.unref()
  }
  async stop() { clearInterval(this.timer); await this.tail }
  async release() {
    await this.stop()
    await this.assertOwner()
    await this.store.remove(this.key, this.etag)
  }
}

export async function recoverLocalLock(store, environment, expectedRelease, writerStopped = false) {
  const key = `locks/${environment}.json`, old = await store.read(key)
  if (!old || old.value.releaseId !== expectedRelease) throw new Error('Release identity does not match the lock')
  if (old.value.host !== hostname()) throw new Error('Recovery must run on the former writer’s host. Otherwise revoke its credentials and complete the documented manual recovery procedure.')
  try { process.kill(old.value.pid, 0); throw new Error('Former release process is still running') }
  catch (error) { if (error.code !== 'ESRCH') throw error }
  if (Date.now() - Date.parse(old.value.heartbeatAt) < 120000) throw new Error('Wait at least two minutes after the last heartbeat before recovering interrupted requests')
  if (!writerStopped) throw new Error('Verify all child writers have stopped and outstanding Cloudflare/Pulumi operations have settled, then pass --writer-stopped. Revoke the former writer’s credentials if its state is uncertain.')
  await store.write(`recovery/${environment}/${Date.now()}.json`, old.value, { IfNoneMatch: '*' })
  await store.remove(key, old.etag)
}
