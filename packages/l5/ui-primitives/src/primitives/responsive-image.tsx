'use client'
import { preload } from 'react-dom'
import {
  createContext,
  useContext,
  type ImgHTMLAttributes,
  type ReactNode,
} from 'react'
export interface ImageVariant {
  url: string
  width: number
  height?: number
  format: string
  bytes?: number
}
export interface ImageManifest {
  url: string
  width: number
  height: number
  variants: ImageVariant[]
  alt: string
  focalPoint?: [number, number]
}
export type MediaMap = Record<string, ImageManifest>
const MediaContext = createContext<MediaMap>({})
export function MediaProvider({
  media,
  children,
}: {
  media: MediaMap
  children: ReactNode
}) {
  return <MediaContext.Provider value={media}>{children}</MediaContext.Provider>
}
export function ResponsiveImage({
  src,
  alt = '',
  sizes = '(max-width: 768px) 100vw, 760px',
  loading = 'lazy',
  ...props
}: ImgHTMLAttributes<HTMLImageElement>) {
  const media = useContext(MediaContext)
  const manifest =
    typeof src === 'string'
      ? media[(src.startsWith('/') ? '' : '/images/') + src.split('?')[0]]
      : undefined
  if (!manifest)
    return (
      <img {...props} src={src} alt={alt} sizes={sizes} loading={loading} />
    )
  const srcSet = (format: string) =>
    manifest.variants
      .filter((v) => v.format === format)
      .map((v) => `${v.url} ${v.width}w`)
      .join(', ')
  if (props.fetchPriority === 'high') {
    preload(manifest.url, { as: 'image', type: 'image/avif', imageSrcSet: srcSet('avif'), imageSizes: sizes, fetchPriority: 'high' })
  }
  return (
    <picture className="contents">
      <source type="image/avif" srcSet={srcSet('avif')} sizes={sizes} />
      <img
        {...props}
        style={{
          ...(manifest.focalPoint
            ? {
                objectPosition: `${manifest.focalPoint[0] * 100}% ${manifest.focalPoint[1] * 100}%`,
              }
            : {}),
          ...props.style,
        }}
        src={manifest.url}
        srcSet={srcSet('webp')}
        sizes={sizes}
        alt={alt}
        width={manifest.width}
        height={manifest.height}
        loading={loading}
        decoding="async"
      />
    </picture>
  )
}
