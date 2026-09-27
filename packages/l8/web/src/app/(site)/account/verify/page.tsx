import { VerifyEmailPage } from '@eat-yeet/l6-ui-shell/account/account-pages'
import { accountMetadata, first, type AccountSearch } from '../metadata'

export const generateMetadata = accountMetadata('Confirm your email')

export default async function Page({ searchParams }: { searchParams: AccountSearch }) {
  const params = await searchParams
  return <VerifyEmailPage token={first(params.token)} />
}
