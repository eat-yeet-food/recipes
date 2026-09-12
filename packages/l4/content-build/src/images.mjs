import sharp from 'sharp'
import { createHash } from 'node:crypto'
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  realpathSync,
} from 'node:fs'
import { resolve, relative, join } from 'node:path'
const widths = [160, 320, 640, 960, 1440, 1920]
const pipeline = `v2-sharp${sharp.versions.sharp}-vips${sharp.versions.vips}-avif50-webp80-jpeg82-srgb-oriented-focal`
export function safeImagePath(imagesDir, name) {
  const root = realpathSync(imagesDir)
  const path = realpathSync(resolve(root, name))
  if (
    relative(root, path).startsWith('..') ||
    !/\.(jpe?g|png|webp|avif)$/i.test(path)
  )
    throw new Error(`Invalid image path: ${name}`)
  return path
}
export async function prepareImage(path, cacheDir, focalPoint) {
  const source = readFileSync(path)
  if (source.length > 25 * 1024 * 1024)
    throw new Error(`Image over 25 MB: ${path}`)
  const hash = createHash('sha256')
    .update(source)
    .update(pipeline + (focalPoint ? JSON.stringify(focalPoint) : ''))
    .digest('hex')
  const dir = join(cacheDir, hash)
  const manifestPath = join(dir, 'manifest.json')
  if (existsSync(manifestPath)) {
    const cached = JSON.parse(readFileSync(manifestPath, 'utf8'))
    if (
      [...cached.variants, cached.social].every(
        (v) =>
          existsSync(join(dir, v.key.split('/').at(-1))) &&
          readFileSync(join(dir, v.key.split('/').at(-1))).length === v.bytes,
      )
    )
      return cached
  }
  const meta = await sharp(source, { limitInputPixels: 40000000 }).metadata()
  if (
    !['jpeg', 'png', 'webp', 'avif', 'heif'].includes(meta.format) ||
    (meta.pages ?? 1) > 1
  )
    throw new Error(`Unsupported image: ${path}`)
  const { info, data } = await sharp(source)
    .rotate()
    .toColourspace('srgb')
    .png()
    .toBuffer({ resolveWithObject: true })
  mkdirSync(dir, { recursive: true })
  const variants = []
  const sizes = [
    ...new Set([
      ...widths.filter((w) => w <= info.width),
      Math.min(info.width, 1920),
    ]),
  ].sort((a, b) => a - b)
  for (const width of sizes)
    for (const format of ['avif', 'webp']) {
      const filename = `${width}.${format}`
      const { data: bytes, info: out } = await sharp(data)
        .resize({ width, withoutEnlargement: true })
        [format]({ quality: format === 'avif' ? 50 : 80 })
        .toBuffer({ resolveWithObject: true })
      writeFileSync(join(dir, filename), bytes)
      variants.push({
        width: out.width,
        height: out.height,
        format,
        bytes: bytes.length,
        key: `${hash}/${filename}`,
        url: `/media/${hash}/${filename}`,
      })
    }
  const socialWidth = Math.min(
    1200,
    info.width,
    Math.floor((info.height * 1200) / 630),
  )
  const cropWidth = Math.min(
      info.width,
      Math.floor((info.height * 1200) / 630),
    ),
    cropHeight = Math.min(info.height, Math.round((cropWidth * 630) / 1200))
  const [x, y] = focalPoint ?? [0.5, 0.5]
  const left = Math.max(
      0,
      Math.min(
        info.width - cropWidth,
        Math.round(info.width * x - cropWidth / 2),
      ),
    ),
    top = Math.max(
      0,
      Math.min(
        info.height - cropHeight,
        Math.round(info.height * y - cropHeight / 2),
      ),
    )
  const { data: og, info: ogInfo } = await sharp(data)
    .extract({ left, top, width: cropWidth, height: cropHeight })
    .resize(socialWidth, Math.round((socialWidth * 630) / 1200), {
      fit: 'cover',
      position: 'centre',
    })
    .jpeg({ quality: 82 })
    .toBuffer({ resolveWithObject: true })
  writeFileSync(join(dir, 'social.jpg'), og)
  const social = {
    width: ogInfo.width,
    height: ogInfo.height,
    format: 'jpeg',
    bytes: og.length,
    key: `${hash}/social.jpg`,
    url: `/media/${hash}/social.jpg`,
  }
  const fallback =
    variants.filter((v) => v.format === 'webp').find((v) => v.width >= 960) ??
    variants.filter((v) => v.format === 'webp').at(-1)
  const manifest = {
    hash,
    width: info.width,
    height: info.height,
    variants,
    social,
    url: fallback.url,
    filename: `${hash}.webp`,
    pipeline,
    ...(focalPoint ? { focalPoint } : {}),
  }
  writeFileSync(manifestPath, JSON.stringify(manifest))
  return manifest
}
