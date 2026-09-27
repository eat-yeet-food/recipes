import { useMemo } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import { AccountProvider } from '@eat-yeet/l6-ui-shell/account/account'
import { fixtureMember, memoryAccountClient } from '@eat-yeet/l6-ui-shell/account/account-fixture'
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
      replies: ownRating ? [] : [{ id: 'reply-0', name: 'Jordan', body: 'Mine too, after a 48 hour cold ferment.', own: true }],
    }] : [],
  }
}

function RatingExample({ count = 0, ownRating = null, fail = false, unavailable = false, slow = false, signedIn = true }: {
  count?: number; ownRating?: number | null; fail?: boolean; unavailable?: boolean; slow?: boolean; signedIn?: boolean
}) {
  const account = useMemo(() => memoryAccountClient({ member: signedIn ? fixtureMember : null }), [signedIn])
  const client = useMemo<RatingClient>(() => {
    let value = summary(count, ownRating)
    const save = async (input: { score: number; reviewText: string } | null) => {
      if (slow) await new Promise((resolve) => setTimeout(resolve, 3000))
      if (fail) throw new Error('Your rating could not be saved. Please try again.')
      const previous = value.ownRating ?? 0
      const nextCount = value.count + (input ? value.ownRating ? 0 : 1 : value.ownRating ? -1 : 0)
      const total = (value.average ?? 0) * value.count - previous + (input?.score ?? 0)
      const ownReview = input?.reviewText.trim() ?? ''
      value = {
        ...value,
        count: nextCount,
        average: nextCount ? total / nextCount : null,
        eatPercentage: nextCount ? input && input.score >= 4 ? 100 : 0 : null,
        starDistribution: [1, 2, 3, 4, 5].map((star) => star === input?.score ? 1 : 0),
        ownRating: input?.score ?? null,
        ownReview,
        reviews: ownReview ? [{ id: '1', name: fixtureMember.displayName, score: input!.score, reviewText: ownReview, own: true, replies: [] }] : [],
      }
      return value
    }
    return {
      read: async () => { if (unavailable) throw new Error('Offline'); return value },
      save: (input) => save(input),
      remove: () => save(null),
      reply: async (input) => (value = {
        ...value,
        reviews: value.reviews.map((review) => review.id === input.reviewId
          ? { ...review, replies: [...review.replies, { id: `reply-${review.replies.length + 1}`, name: fixtureMember.displayName, body: input.body, own: true }] }
          : review),
      }),
      removeReply: async (replyId) => (value = {
        ...value,
        reviews: value.reviews.map((review) => ({ ...review, replies: review.replies.filter((reply) => reply.id !== replyId) })),
      }),
    }
  }, [count, ownRating, fail, unavailable, slow])
  return <AccountProvider client={account} initialSession={{ member: signedIn ? fixtureMember : null, providers: { google: true } }}>
    <div className="max-w-[var(--layout-recipe-copy)] bg-white p-6 text-ink"><RecipeRating title="New York Style Pizza" client={client} /></div>
  </AccountProvider>
}
const meta = { title: 'Recipes/Ratings', component: RatingExample,
  parameters: { docs: { description: { component: 'Shared recipe rating form on the workbench yellow surface, with ink fields, ink selected stars and an ink submit action. Ratings, reviews and replies belong to the signed-in member, who can edit or delete them; signed-out readers see the aggregate and a sign-in action. Aggregate stars remain orange on the white reading surface.' } } },
} satisfies Meta<typeof RatingExample>
export default meta
type Story = StoryObj<typeof meta>
export const Empty: Story = {}
export const Rated: Story = { args: { count: 33 } }
export const PreviouslyRated: Story = { args: { count: 33, ownRating: 4 } }
export const SignedOut: Story = { args: { count: 33, signedIn: false }, play: async ({ canvasElement }) => {
  const canvas = within(canvasElement)
  await expect(await canvas.findByRole('link', { name: 'Sign in to rate' })).toHaveAttribute('href', '/account/sign-in')
  await expect(await canvas.findByRole('link', { name: 'Sign in to reply' })).toBeVisible()
  await expect(canvas.queryByRole('radio', { name: '5 stars' })).toBeNull()
} }
export const SubmitWithKeyboard: Story = { play: async ({ canvasElement }) => {
  const canvas = within(canvasElement)
  const radio = await canvas.findByRole('radio', { name: '1 star' })
  await waitFor(() => expect(radio).toBeEnabled())
  radio.focus()
  await userEvent.keyboard(' {ArrowRight}{ArrowRight}{ArrowRight}{ArrowRight}')
  await waitFor(() => expect(canvas.getByRole('radio', { name: '5 stars' })).toBeChecked())
  await expect(canvas.getByText('Posting as Jordan.')).toBeVisible()
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
export const DeleteRating: Story = { args: { count: 1, ownRating: 4 }, play: async ({ canvasElement }) => {
  const canvas = within(canvasElement)
  await waitFor(() => expect(canvas.getByRole('radio', { name: '4 stars' })).toBeChecked())
  await userEvent.click(canvas.getByRole('button', { name: 'Delete my rating' }))
  await expect(await canvas.findByRole('status')).toHaveTextContent('Your rating was deleted.')
  await expect(canvas.getByRole('heading', { name: 'Rate this recipe' })).toBeVisible()
  await expect(canvas.getByText('No reviews yet. Be the first!')).toBeVisible()
} }
export const ReplyAndDelete: Story = { args: { count: 33 }, play: async ({ canvasElement }) => {
  const canvas = within(canvasElement)
  await userEvent.click(await canvas.findByRole('button', { name: 'Reply again' }))
  await userEvent.type(canvas.getByRole('textbox', { name: 'Reply' }), 'Thanks for the tip!')
  await userEvent.click(canvas.getByRole('button', { name: 'Post Reply' }))
  await expect(await canvas.findByText('Thanks for the tip!')).toBeVisible()
  const deletes = canvas.getAllByRole('button', { name: 'Delete your reply to Community cook' })
  await userEvent.click(deletes[deletes.length - 1]!)
  await waitFor(() => expect(canvas.queryByText('Thanks for the tip!')).toBeNull())
} }
export const SaveFailure: Story = { args: { fail: true }, play: async ({ canvasElement }) => {
  const canvas = within(canvasElement)
  await userEvent.click(await canvas.findByRole('radio', { name: '3 stars' }))
  await userEvent.click(canvas.getByRole('button', { name: 'Submit Rating' }))
  await expect(await canvas.findByRole('alert')).toHaveTextContent('could not be saved')
  await expect(canvas.getByRole('radio', { name: '3 stars' })).toBeChecked()
} }
export const Unavailable: Story = { args: { unavailable: true }, play: async ({ canvasElement }) => {
  await expect(await within(canvasElement).findByRole('alert')).toHaveTextContent('Ratings are unavailable')
} }
