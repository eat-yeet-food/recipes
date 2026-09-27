import { SignInCompletePage } from '@eat-yeet/l6-ui-shell/account/account-pages'
import { accountMetadata, first, type AccountSearch } from '../metadata'

export const generateMetadata = accountMetadata('Signing in')

export default async function Page({ searchParams }: { searchParams: AccountSearch }) {
  const params = await searchParams
  return <SignInCompletePage returnTo={first(params.returnTo)} />
}
