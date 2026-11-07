import type { Meta, StoryObj } from '@storybook/react-vite'
import type { ArticleContent } from '@eat-yeet/l4-content-model/articles'
import { fixtureArticles } from '@eat-yeet/l6-ui-catalog/catalog-fixtures'
import { ArticleDetailPage, LearnIndexPage } from './learn'

const article: ArticleContent = {
  ...fixtureArticles[0]!,
  blocks: [
    { type: 'markdown', html: '<p>Gluten forms when flour meets water and is worked. Mixing builds structure early; time and folds finish the job.</p><h2>Why it matters</h2><p>A well-developed dough traps gas and bakes tall.</p>' },
    { type: 'callout', tone: 'tip', title: 'Windowpane test', html: '<p>Stretch a small piece thin. If light passes through without tearing, the dough is ready.</p>' },
  ],
} as ArticleContent

const meta = { title: 'Features/Learn', component: LearnIndexPage, parameters: { layout: 'fullscreen', docs: { description: { component: 'Learn index (PageTitle, article groups under SectionTitle with a trailing rule, shared catalog cards) and the article page (Breadcrumbs, Eyebrow, PageTitle, content blocks; authored callouts render as aside Callouts).' } } },
  args: { articles: fixtureArticles, copy: { pages: { learnHeading: 'Learn', learnIntro: 'Techniques and references behind the recipes.' } } } } satisfies Meta<typeof LearnIndexPage>
export default meta
type Story = StoryObj<typeof meta>
export const Index: Story = {}
export const Article: Story = { render: () => <ArticleDetailPage article={article} articles={fixtureArticles} /> }
