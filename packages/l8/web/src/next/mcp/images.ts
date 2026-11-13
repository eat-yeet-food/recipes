import 'server-only'
import { Buffer } from 'node:buffer'
import { createTrialMedia, findTrialMedia, type TrialMedia } from '@eat-yeet/l4-content-cms/trial'
import { cms, mcpSettings } from '../cms'

/**
 * Images for trial recipes. The Worker has no Sharp, so the Cloudflare Images
 * binding makes the same responsive set content sync makes (AVIF + WebP at the
 * standard widths, never upscaled, plus a 1200×630 social crop). Variants go to
 * R2 under `<hash>/…` before the media row exists, so a reference never points
 * at missing bytes. Recipes refer to an image as `trial/<hash>.webp`.
 */
const WIDTHS = [160, 320, 480, 640, 720, 800, 960, 1440, 1920]
const PIPELINE = 'trial-v1-cf-images-avif35-webp80-jpeg82'
const MAX_BYTES = 20 * 1024 * 1024
const ACCEPTED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/heic', 'image/heif'])

export type StockPhoto = {
  provider: 'pexels' | 'unsplash'; id: string; description: string; width: number; height: number
  photographer: string; photographerUrl: string; pageUrl: string; previewUrl: string
}
export type Credit = { provider: string; photographer: string; photographerUrl: string; pageUrl: string; license: string }
export const imageRef = (hash: string) => `trial/${hash}.webp`

export class ImageError extends Error {}

const hex = (buffer: ArrayBuffer) => [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('')

async function fetchBytes(url: string, headers: Record<string, string> = {}): Promise<Uint8Array<ArrayBuffer>> {
  const response = await fetch(url, { headers, redirect: 'follow', signal: AbortSignal.timeout(20000) })
  if (!response.ok) throw new ImageError(`Couldn’t download the image (HTTP ${response.status}).`)
  const length = Number(response.headers.get('content-length') ?? 0)
  if (length > MAX_BYTES) throw new ImageError('The image is over 20 MB.')
  const bytes = new Uint8Array(await response.arrayBuffer())
  if (bytes.byteLength > MAX_BYTES) throw new ImageError('The image is over 20 MB.')
  return bytes
}

/** Makes (or finds) the trial media for these bytes. */
export async function storeImage(bytes: Uint8Array<ArrayBuffer>, alt: string, origin: { importKey?: string; credit?: Credit } = {}): Promise<TrialMedia> {
  const { images, media: bucket } = mcpSettings()
  if (!images || !bucket) throw new ImageError('Image processing isn’t available here.')
  if (!alt.trim()) throw new ImageError('Describe the image (alt text) for people who can’t see it.')
  if (bytes.byteLength > MAX_BYTES) throw new ImageError('The image is over 20 MB.')
  const prefix = new TextEncoder().encode(PIPELINE + '\n'), keyed = new Uint8Array(prefix.byteLength + bytes.byteLength)
  keyed.set(prefix); keyed.set(bytes, prefix.byteLength)
  const hash = hex(await crypto.subtle.digest('SHA-256', keyed))
  const payload = await cms()
  const existing = await findTrialMedia(payload, { hash })
  if (existing) return existing
  const stream = () => new Blob([bytes]).stream()
  let info: { format: string; width?: number; height?: number }
  try { info = await images.info(stream()) } catch { throw new ImageError('That file isn’t an image the site can use (JPEG, PNG, WebP, AVIF or HEIC).') }
  if (!ACCEPTED.has(info.format) || !info.width || !info.height) throw new ImageError('Use a JPEG, PNG, WebP, AVIF or HEIC photo.')
  const { width, height } = info as { width: number; height: number }
  if (width < 640) throw new ImageError(`The image is only ${width}px wide; use one at least 640px wide.`)
  const render = async (transform: Record<string, unknown>, format: string, quality: number) => {
    const output = await images.input(stream()).transform(transform).output({ format, quality })
    return new Uint8Array(await output.response().arrayBuffer())
  }
  const sizes = [...new Set([...WIDTHS.filter((w) => w <= width), Math.min(width, 1920)])].sort((a, b) => a - b)
  const variants: any[] = []
  for (const w of sizes) {
    const h = Math.round((height * w) / width)
    for (const format of ['avif', 'webp'] as const) {
      const data = await render({ width: w }, `image/${format}`, format === 'avif' ? 35 : 80)
      const key = `${hash}/${w}.${format}`
      await bucket.put(key, data, { httpMetadata: { contentType: `image/${format}` } })
      variants.push({ width: w, height: h, format, bytes: data.byteLength, key, url: `/media/${key}` })
    }
  }
  const socialWidth = Math.min(1200, width, Math.floor((height * 1200) / 630))
  const socialHeight = Math.round((socialWidth * 630) / 1200)
  const og = await render({ width: socialWidth, height: socialHeight, fit: 'cover' }, 'image/jpeg', 82)
  await bucket.put(`${hash}/social.jpg`, og, { httpMetadata: { contentType: 'image/jpeg' } })
  const social = { width: socialWidth, height: socialHeight, format: 'jpeg', bytes: og.byteLength, key: `${hash}/social.jpg`, url: `/media/${hash}/social.jpg` }
  const webp = variants.filter((v) => v.format === 'webp')
  const fallback = webp.find((v) => v.width >= 960) ?? webp.at(-1)
  const manifest = { hash, width, height, variants, social, url: fallback.url, filename: `${hash}.webp`, pipeline: PIPELINE, names: [imageRef(hash)], alt: alt.trim() }
  return createTrialMedia(payload, { manifest, alt: alt.trim(), importKey: origin.importKey, credit: origin.credit })
}

export async function imageFromUrl(url: string, alt: string) {
  let parsed: URL
  try { parsed = new URL(url) } catch { throw new ImageError('Give a full https:// image URL.') }
  if (parsed.protocol !== 'https:') throw new ImageError('Give a full https:// image URL.')
  return storeImage(await fetchBytes(parsed.href), alt)
}

export function imageFromBase64(data: string, alt: string) {
  const start = data.startsWith('data:') ? data.indexOf(',') + 1 : 0
  if (data.length - start > (MAX_BYTES * 4) / 3 + 1024) throw new ImageError('The image is over 20 MB.')
  // Native decoding: the Worker's CPU budget is milliseconds, so no per-byte JavaScript.
  const decoded = Buffer.from(start ? data.slice(start) : data, 'base64')
  if (!decoded.byteLength) throw new ImageError('That isn’t valid base64 image data.')
  return storeImage(new Uint8Array(decoded.buffer, decoded.byteOffset, decoded.byteLength) as Uint8Array<ArrayBuffer>, alt)
}

// --- Stock photos -------------------------------------------------------------

const pexelsPhoto = (p: any): StockPhoto => ({
  provider: 'pexels', id: String(p.id), description: p.alt || '', width: p.width, height: p.height,
  photographer: p.photographer, photographerUrl: p.photographer_url, pageUrl: p.url, previewUrl: p.src?.large ?? p.src?.medium,
})
const unsplashPhoto = (p: any): StockPhoto => ({
  provider: 'unsplash', id: String(p.id), description: p.alt_description || p.description || '', width: p.width, height: p.height,
  photographer: p.user?.name ?? '', photographerUrl: `${p.user?.links?.html}?utm_source=eat_yeet&utm_medium=referral`,
  pageUrl: `${p.links?.html}?utm_source=eat_yeet&utm_medium=referral`, previewUrl: p.urls?.regular ?? p.urls?.small,
})

async function api(url: string, headers: Record<string, string>) {
  const response = await fetch(url, { headers: { Accept: 'application/json', ...headers }, signal: AbortSignal.timeout(15000) })
  if (response.status === 404) return null
  if (!response.ok) throw new ImageError(`The photo service answered HTTP ${response.status}.`)
  return response.json() as Promise<any>
}

export function stockProviders() {
  const { pexelsKey, unsplashKey } = mcpSettings()
  return [...(pexelsKey ? ['pexels' as const] : []), ...(unsplashKey ? ['unsplash' as const] : [])]
}

/** Landscape food photos first; Pexels, then Unsplash, or one provider if named. */
export async function searchStockPhotos(query: string, options: { provider?: 'pexels' | 'unsplash'; page?: number; perPage?: number } = {}) {
  const { pexelsKey, unsplashKey } = mcpSettings()
  const perPage = Math.min(Math.max(options.perPage ?? 10, 1), 30), page = Math.max(options.page ?? 1, 1)
  const providers = options.provider ? [options.provider] : stockProviders()
  if (!providers.length) throw new ImageError('No stock photo service is configured (PEXELS_API_KEY or UNSPLASH_ACCESS_KEY).')
  const photos: StockPhoto[] = [], errors: string[] = []
  for (const provider of providers) {
    try {
      if (provider === 'pexels' && pexelsKey) {
        const data = await api(`https://api.pexels.com/v1/search?${new URLSearchParams({ query, per_page: String(perPage), page: String(page), orientation: 'landscape' })}`, { Authorization: pexelsKey })
        photos.push(...(data?.photos ?? []).map(pexelsPhoto))
      } else if (provider === 'unsplash' && unsplashKey) {
        const data = await api(`https://api.unsplash.com/search/photos?${new URLSearchParams({ query, per_page: String(perPage), page: String(page), orientation: 'landscape', content_filter: 'high' })}`, { Authorization: `Client-ID ${unsplashKey}`, 'Accept-Version': 'v1' })
        photos.push(...(data?.results ?? []).map(unsplashPhoto))
      } else errors.push(`${provider} isn’t configured`)
    } catch (error) { errors.push(`${provider}: ${(error as Error).message}`) }
  }
  if (!photos.length && errors.length) throw new ImageError(errors.join('; '))
  return { photos, errors }
}

/**
 * Imports by provider + ID. The download URL comes from the provider's own API,
 * never from the caller, and repeat imports return the same image.
 */
export async function importStockPhoto(provider: 'pexels' | 'unsplash', id: string, alt: string) {
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(id)) throw new ImageError('That photo ID isn’t valid.')
  const importKey = `${provider}:${id}`
  const existing = await findTrialMedia(await cms(), { importKey })
  if (existing) return existing
  const { pexelsKey, unsplashKey } = mcpSettings()
  if (provider === 'pexels') {
    if (!pexelsKey) throw new ImageError('Pexels isn’t configured.')
    const photo = await api(`https://api.pexels.com/v1/photos/${id}`, { Authorization: pexelsKey })
    if (!photo) throw new ImageError('Pexels has no photo with that ID.')
    const p = pexelsPhoto(photo)
    // `large2x` is 1880px on the long side: plenty for the 1920 set without a 30 MB original.
    const bytes = await fetchBytes(photo.src?.original ? `${photo.src.original}?auto=compress&cs=tinysrgb&w=2400` : photo.src.large2x)
    return storeImage(bytes, alt || p.description, { importKey, credit: { provider: 'Pexels', photographer: p.photographer, photographerUrl: p.photographerUrl, pageUrl: p.pageUrl, license: 'Pexels License' } })
  }
  if (!unsplashKey) throw new ImageError('Unsplash isn’t configured.')
  const headers = { Authorization: `Client-ID ${unsplashKey}`, 'Accept-Version': 'v1' }
  const photo = await api(`https://api.unsplash.com/photos/${id}`, headers)
  if (!photo) throw new ImageError('Unsplash has no photo with that ID.')
  const p = unsplashPhoto(photo)
  // Unsplash asks apps to report each download through this endpoint.
  if (photo.links?.download_location) await api(photo.links.download_location, headers).catch(() => null)
  const bytes = await fetchBytes(`${photo.urls.raw}&w=2400&fm=jpg&q=85`)
  return storeImage(bytes, alt || p.description, { importKey, credit: { provider: 'Unsplash', photographer: p.photographer, photographerUrl: p.photographerUrl, pageUrl: p.pageUrl, license: 'Unsplash License' } })
}
