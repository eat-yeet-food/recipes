import { useMemo } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import { RecipeRating, type RatingClient, type RatingSummary } from './recipe-rating'

function summary(count: number, ownRating: number | null): RatingSummary {
  return {
    count,
    average: count ? 4.8 : null,
    eatPercentage: count ? 91 : null,
    starDistribution: count ? [0, 0, 1, 4, Math.max(0, count - 5)] : [0, 0, 0, 0, 0],
    ownRating,
    ownReview: ownRating ? 'A keeper.' : '',
    reviews: count ? [{
      id: '1',
      name: ownRating ? 'Jordan' : 'Community cook',
      score: ownRating ?? 5,
      reviewText: ownRating ? 'A keeper.' : 'Crisp edges and a chewy center.',
      own: Boolean(ownRating),
      replies: [],
    }] : [],
  }
}

function RatingExample({ count = 0, ownRating = null, fail = false, unavailable = false, slow = false }: {
  count?: number; ownRating?: number | null; fail?: boolean; unavailable?: boolean; slow?: boolean
}) {
  const client = useMemo<RatingClient>(() => {
    let value = summary(count, ownRating)
    return {
      read: async () => { if (unavailable) throw new Error('Offline'); return value },
      save: async (input) => {
        if (slow) await new Promise((resolve) => setTimeout(resolve, 3000))
        if (fail) throw new Error('Your rating could not be saved. Please try again.')
        const previous = value.ownRating ?? 0
        const nextCount = value.count + (value.ownRating ? 0 : 1)
        const total = (value.average ?? 0) * value.count - previous + input.score
        const ownReview = input.reviewText.trim()
        value = {
          ...value,
          count: nextCount,
          average: total / nextCount,
          eatPercentage: input.score >= 4 ? 100 : 0,
          starDistribution: [1, 2, 3, 4, 5].map((star) => star === input.score ? 1 : 0),
          ownRating: input.score,
          ownReview,
          reviews: ownReview ? [{ id: '1', name: input.name, score: input.score, reviewText: ownReview, own: true, replies: [] }] : [],
        }
        return value
      },
      reply: async (input) => ({
        ...value,
        reviews: value.reviews.map((review) => review.id === input.reviewId
          ? { ...review, replies: [...review.replies, { id: 'reply-1', name: input.name, body: input.body, own: true }] }
          : review),
      }),
    }
  }, [count, ownRating, fail, unavailable, slow])
  return <div className="max-w-[var(--layout-recipe-copy)] bg-white p-6 text-ink"><RecipeRating title="New York Style Pizza" client={client} /></div>
}
const meta = { title: 'Recipes/Ratings', component: RatingExample,
  parameters: { docs: { description: { component: 'Yeet-style rating and review section with local reviewer details, aggregate scoring, and threaded replies.' } } },
} satisfies Meta<typeof RatingExample>
export default meta
type Story = StoryObj<typeof meta>
export const Empty: Story = {}
export const Rated: Story = { args: { count: 33 } }
export const PreviouslyRated: Story = { args: { count: 33, ownRating: 4 } }
export const SubmitWithKeyboard: Story = { play: async ({ canvasElement }) => {
  const canvas = within(canvasElement)
  const radio = await canvas.findByRole('radio', { name: '1 star' })
  await waitFor(() => expect(radio).toBeEnabled())
  radio.focus()
  await userEvent.keyboard(' {ArrowRight}{ArrowRight}{ArrowRight}{ArrowRight}')
  await userEvent.type(canvas.getByRole('textbox', { name: 'Name' }), 'Jordan')
  await userEvent.type(canvas.getByRole('textbox', { name: 'Email' }), 'jordan@example.com')
  await waitFor(() => expect(canvas.getByRole('radio', { name: '5 stars' })).toBeChecked())
  await userEvent.click(canvas.getByRole('button', { name: 'Submit Rating' }))
  await expect(await canvas.findByText('5.0')).toBeVisible()
  await expect(await canvas.findByText('1 rating')).toBeVisible()
  await expect(await canvas.findByRole('status')).toHaveTextContent('Your 5-star rating is saved.')
  await waitFor(() => expect(canvas.getByRole('heading', { name: 'Update your rating' })).toBeVisible())
} }
export const Edit: Story = { args: { count: 1, ownRating: 4 }, play: async ({ canvasElement }) => {
  const radio = await within(canvasElement).findByRole('radio', { name: '4 stars' })
  await waitFor(() => expect(radio).toBeChecked())
} }
export const SaveFailure: Story = { args: { fail: true }, play: async ({ canvasElement }) => {
  const canvas = within(canvasElement)
  await userEvent.click(await canvas.findByRole('radio', { name: '3 stars' }))
  await userEvent.type(canvas.getByRole('textbox', { name: 'Name' }), 'Jordan')
  await userEvent.type(canvas.getByRole('textbox', { name: 'Email' }), 'jordan@example.com')
  await userEvent.click(canvas.getByRole('button', { name: 'Submit Rating' }))
  await expect(await canvas.findByRole('alert')).toHaveTextContent('could not be saved')
  await expect(canvas.getByRole('radio', { name: '3 stars' })).toBeChecked()
} }
export const Unavailable: Story = { args: { unavailable: true }, play: async ({ canvasElement }) => {
  await expect(await within(canvasElement).findByRole('alert')).toHaveTextContent('Ratings are unavailable')
} }
