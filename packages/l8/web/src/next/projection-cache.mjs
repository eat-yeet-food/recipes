/** Completed public JSON only: never retain request objects or in-flight I/O. */
export class ProjectionCache {
  constructor(maxBytes = 4 * 1024 * 1024, maxEntries = 128) {
    this.maxBytes = maxBytes
    this.maxEntries = maxEntries
    this.entries = new Map()
    this.bytes = 0
  }

  async read(namespace, key, load) {
    const address = JSON.stringify([namespace, key])
    const hit = this.entries.get(address)
    if (hit) {
      this.entries.delete(address)
      this.entries.set(address, hit)
      return JSON.parse(hit.json)
    }
    const value = await load()
    // Missing documents and thrown errors must be retried, never cached.
    if (value == null) return value
    const json = JSON.stringify(value)
    const bytes = 2 * (json.length + address.length)
    if (bytes > this.maxBytes) return value
    // Another request may have finished the same read in the meantime.
    const previous = this.entries.get(address)
    if (previous) this.bytes -= previous.bytes
    this.entries.delete(address)
    while (this.entries.size && (this.bytes + bytes > this.maxBytes || this.entries.size >= this.maxEntries)) {
      const oldest = this.entries.keys().next().value
      this.bytes -= this.entries.get(oldest).bytes
      this.entries.delete(oldest)
    }
    this.entries.set(address, { json, bytes })
    this.bytes += bytes
    return value
  }
}
