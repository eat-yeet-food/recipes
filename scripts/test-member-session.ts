// Test-only: create (or reuse) a local member through the Google upsert path and
// print a fresh session token. Browser suites use it to open member features.
import { openLocalCMS } from './cms-local'
import { createSession, upsertGoogleMember } from '@eat-yeet/l4-content-cms/members'

if (process.env.DEPLOY_ENV && process.env.DEPLOY_ENV !== 'local') throw new Error('Test sessions are local-only')
const cms = await openLocalCMS()
try {
  const member = await upsertGoogleMember(cms.payload, { sub: 'local-browser-test', email: 'browser-test@local.example', emailVerified: true, name: 'Test Cook' })
  if (!member) throw new Error('Test member could not be created')
  await cms.payload.update({ collection: 'members', id: Number(member.id), overrideAccess: true, data: { displayNameConfirmed: true } })
  // Each browser run starts without saved formulas.
  await cms.payload.delete({ collection: 'member-workbenches', overrideAccess: true, where: { member: { equals: Number(member.id) } } })
  process.stdout.write((await createSession(cms.payload, member.id)).token)
} finally {
  await cms.close()
}
