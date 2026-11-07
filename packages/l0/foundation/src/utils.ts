import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

/**
 * tailwind-merge must know the theme's custom tokens (global.css @theme).
 * Unknown `text-*` names are read as colors, so `text-page text-ink` would
 * silently drop the size. Keep these lists in step with global.css.
 */
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ['micro', 'caption', 'body-sm', 'title-sm', 'title', 'section', 'page', 'display', 'hero', 'wordmark'],
      tracking: ['eyebrow', 'label', 'title'],
      radius: ['control', 'field', 'filter', 'surface', 'choice', 'choice-item'],
      shadow: ['card', 'raised', 'glow', 'overlay', 'peel'],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
