import type { ReactNode } from 'react'

import type { Meta, StoryObj } from '@storybook/react-vite'
import type { PageBlock } from '@eat-yeet/l4-content-model/blocks'

import { ContentPageArticle } from './page-article'
import { createSharedPageBlockRegistry, PageBlocks } from './page-blocks'

const blocks: PageBlock[] = [
  {
    type: 'markdown',
    html: '<h2>Standard Text</h2>',
  },
  {
    type: 'markdown',
    html: '<p>Adjacent Markdown blocks continue the same prose flow, so authoring boundaries do not change spacing.</p><p>Markdown blocks render paragraphs, lists, and <strong>inline emphasis</strong> without shipping a browser markdown parser.</p><ul><li>First note</li><li>Second note</li></ul>',
  },
  {
    type: 'image',
    layout: { mode: 'grid', columns: 2, aspect: 'landscape' },
    images: [
      {
        src: '/images/hero-donuts.jpg',
        alt: 'Pink glazed donuts with colorful sprinkles',
        caption: 'Grid image block with a caption.',
      },
      {
        src: '/images/raised-donuts.jpg',
        alt: 'Raised donuts on a cooling rack',
        caption: 'Second image in the same block.',
      },
    ],
  },
  {
    type: 'section',
    layout: 'split',
    columns: [
      {
        blocks: [
          {
            type: 'markdown',
            html: '<h2>Split Column</h2><p>Section blocks can arrange existing blocks side by side on wider screens.</p>',
          },
        ],
      },
      {
        blocks: [
          {
            type: 'callout',
            tone: 'tip',
            title: 'Authoring intent',
            html: '<p>The model expresses layout intent without tying it to article type.</p>',
          },
        ],
      },
    ],
  },
  {
    type: 'steps',
    title: 'Procedure',
    items: [
      { title: 'Mix', html: '<p>Combine until cohesive.</p>' },
      { title: 'Rest', html: '<p>Let time hydrate the flour.</p>' },
    ],
  },
  {
    type: 'comparison',
    title: 'Comparison',
    columns: ['Planetary', 'Spiral'],
    rows: [
      { label: 'Heat', values: ['<p>Warms quickly.</p>', '<p>More efficient.</p>'] },
    ],
  },
  {
    type: 'footnotes',
    title: 'Sources',
    items: [
      {
        id: '1',
        html: 'Example research supporting an article claim',
        url: 'https://example.com/research',
      },
    ],
  },
  { type: 'youtube', id: 'abc_123-xyz', title: 'Recipe video' },
]

const registry = createSharedPageBlockRegistry()

function StorySection({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) {
  return (
    <section data-storybook-section="">
      <p data-storybook-eyebrow="">{eyebrow}</p>
      <h2>{title}</h2>
      {children}
    </section>
  )
}

function StoryCanvas({ children }: { children: ReactNode }) {
  return <div data-storybook="">{children}</div>
}

function BlockGallery() {
  return (
    <div className="yeet">
      <article className="yeet-card max-w-[760px] bg-white border-2 border-[var(--yeet-gray)] px-9 py-[34px] shadow-[18px_18px_0_var(--yeet-pink)]">
        <PageBlocks
          blocks={blocks}
          registry={registry}
          context={{}}
        />
      </article>
    </div>
  )
}

const meta = {
  title: 'Content Blocks/Page Blocks',
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const PageBlockGallery: Story = {
  render: () => (
    <StoryCanvas>
      <StorySection eyebrow="Content" title="Page Blocks">
        <BlockGallery />
      </StorySection>
    </StoryCanvas>
  ),
}

export const BlockPage: Story = {
  render: () => (
    <StoryCanvas>
      <StorySection eyebrow="Content" title="Canonical Block Page">
        <div data-storybook-content-frame="">
          <ContentPageArticle
            blocks={blocks}
            blockRegistry={registry}
            blockContext={{}}
            articleLabel="Example page content"
            header={(
              <div className="max-w-[690px]">
                <nav className="yeet-crumbs flex flex-wrap gap-1.5 mb-5 text-[var(--yeet-gray)] text-xs leading-[1.6] uppercase" aria-label="Breadcrumb">
                  <a href="/">Home</a>
                  <span>&gt;</span>
                  <span>Guides</span>
                </nav>
                <h1 className="m-0 max-w-[690px] text-[34px] leading-[1.25] tracking-[1.2px] font-bold">
                  Generic Content Article
                </h1>
                <p className="max-w-[690px] mt-4 mb-0 text-base leading-[1.625]">
                  A reusable article layout can render arbitrary registered page blocks.
                </p>
              </div>
            )}
            media={<img src="/images/hero-donuts.jpg" alt="Pink glazed donuts with colorful sprinkles" className="w-full max-h-[690px] object-cover" />}
          />
        </div>
      </StorySection>
    </StoryCanvas>
  ),
}
