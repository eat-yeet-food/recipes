import type { NextRequest } from 'next/server'
import { deleteRecipeReply } from '@eat-yeet/l4-content-cms/ratings'
import { cms } from '../../../../../../../../next/cms'
import { currentMember, failure, reply, sameOrigin } from '../../../../../../../../next/account'

export const dynamic = 'force-dynamic'

export async function DELETE(request: NextRequest, route: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await route.params
  if (!/^[a-z0-9-]{1,160}$/.test(slug) || !/^\d{1,15}$/.test(id)) return failure('Reply not found.', 404)
  if (!sameOrigin(request)) return failure('Please use the form on this recipe page.', 403)
  const member = await currentMember(request)
  if (!member) return failure('Sign in to manage your replies.', 401)
  try {
    const result = await deleteRecipeReply(await cms(), slug, member.id, id)
    return result ? reply(result) : failure('Recipe not found.', 404)
  } catch (error) {
    console.error('Reply delete failed', error)
    return failure('Your reply could not be deleted. Please try again.', 503)
  }
}
