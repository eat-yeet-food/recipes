import { readFileSync } from 'node:fs'
import { resolve, basename } from 'node:path'
/** All required immutable objects exist before a Payload media reference is written. */
export async function syncMediaItem(
  payload,
  bucket,
  item,
  old,
  changed,
  cacheDir,
) {
  const { manifest } = item
  for (const variant of [...manifest.variants, manifest.social]) {
    const existing = await bucket.head(variant.key)
    if (existing?.size !== variant.bytes) {
      const bytes = readFileSync(
        resolve(cacheDir, manifest.hash, basename(variant.key)),
      )
      if (bytes.length !== variant.bytes)
        throw new Error(`Invalid derivative: ${variant.key}`)
      await bucket.put(variant.key, bytes, {
        httpMetadata: { contentType: `image/${variant.format}` },
      })
    }
  }
  if (!old) {
    const bytes = readFileSync(
      resolve(cacheDir, manifest.hash, basename(manifest.url)),
    )
    await payload.create({
      collection: 'media',
      overrideAccess: true,
      data: {
        sourceId: manifest.hash,
        public: item.public,
        alt: manifest.alt,
        manifest,
      },
      file: {
        data: bytes,
        mimetype: 'image/webp',
        name: manifest.filename,
        size: bytes.length,
      },
    })
  } else if (changed)
    await payload.update({
      collection: 'media',
      id: old.id,
      overrideAccess: true,
      data: { public: item.public, alt: manifest.alt, manifest },
    })
}
