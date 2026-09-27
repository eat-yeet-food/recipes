import { SignInPage } from '@eat-yeet/l6-ui-shell/account/account-pages'
import { accountMetadata, first, type AccountSearch } from '../metadata'

export const generateMetadata = accountMetadata('Sign in')

export default async function Page({ searchParams }: { searchParams: AccountSearch }) {
  const params = await searchParams
  return <SignInPage returnTo={first(params.returnTo)} error={first(params.error)} />
}
