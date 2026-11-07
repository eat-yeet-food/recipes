import type { Meta, StoryObj } from '@storybook/react-vite'
import { ResponsiveImage } from './responsive-image'
const meta = { title: 'Primitives/Responsive Image', component: ResponsiveImage, parameters: { layout: 'padded', docs: { description: { component: 'The shared `<picture>`: generated derivatives, correct `sizes`, reserved dimensions. Exactly one image per page is eager/high priority (the LCP image). Never upscale; placeholders behind images use `muted`.' } } },
  args: { src: '/images/hero-donuts.jpg', alt: 'Pink-glazed donuts covered in rainbow sprinkles', sizes: '360px', width: '800', height: '1000', className: 'w-[360px] rounded-surface bg-muted' } } satisfies Meta<typeof ResponsiveImage>
export default meta
export const Default: StoryObj<typeof meta> = {}
