import { AccountSettingsPage } from '@eat-yeet/l6-ui-shell/account/account-settings'
import { accountMetadata } from '../metadata'

export const generateMetadata = accountMetadata('Account settings')

export default function Page() {
  return <AccountSettingsPage />
}
