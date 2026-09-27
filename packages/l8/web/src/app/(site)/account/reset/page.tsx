import { ResetPasswordPage } from '@eat-yeet/l6-ui-shell/account/account-pages'
import { accountMetadata, first, type AccountSearch } from '../metadata'

export const generateMetadata = accountMetadata('Choose a new password')

export default async function Page({ searchParams }: { searchParams: AccountSearch }) {
  const params = await searchParams
  return <ResetPasswordPage token={first(params.token)} />
}
