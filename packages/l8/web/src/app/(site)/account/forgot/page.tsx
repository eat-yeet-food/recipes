import { ForgotPasswordPage } from '@eat-yeet/l6-ui-shell/account/account-pages'
import { accountMetadata } from '../metadata'

export const generateMetadata = accountMetadata('Reset your password')

export default function Page() {
  return <ForgotPasswordPage />
}
