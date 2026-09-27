import type { Metadata } from 'next'
import { LegalPage } from '@eat-yeet/l6-ui-shell/shell/legal'
import { siteData } from '../../../next/cms'

const CONTACT = 'phoganuci@gmail.com'
export async function generateMetadata(): Promise<Metadata> {
  return { title: `Privacy Policy | ${(await siteData()).siteName}` }
}

export default function Page() {
  return <LegalPage title="Privacy Policy" updated="September 27, 2026"
    intro={<p>Eat / Yeet is a personal recipe site. This policy explains what we collect when you use it, why, and the choices you have. Reading recipes requires no account and we don’t track you across the web.</p>}
    sections={[
      { heading: 'What we collect', body: <>
        <p><strong>If you only read recipes:</strong> nothing that identifies you. Our hosting provider processes technical request data (such as IP address and browser type) to deliver pages and protect the site. We don’t use analytics, advertising or tracking cookies.</p>
        <p><strong>If you create an account:</strong></p>
        <ul>
          <li>Your email address, and a securely hashed password if you set one (we never see or store your actual password).</li>
          <li>If you sign in with Google: your Google account identifier, email address and name. We don’t receive your Google password or contacts.</li>
          <li>The public name you choose.</li>
          <li>What you create: ratings, reviews, replies and saved dough formulas.</li>
          <li>Security records: when your sessions were created or ended, failed sign-in counts, and when we last sent you an account email.</li>
        </ul>
        <p><strong>In your browser:</strong> one essential sign-in cookie, used only by our account service, and local storage for preferences and formulas you save while signed out. These are needed for the features you use, so we don’t ask for cookie consent.</p>
      </> },
      { heading: 'How we use it', body: <ul>
        <li>To run your account: signing you in, confirming your email, resetting your password and keeping your account secure.</li>
        <li>To show your public name next to your ratings, reviews and replies. Your email is never shown publicly.</li>
        <li>To save your formulas so they’re available on your devices.</li>
        <li>To prevent abuse, such as limiting repeated sign-in attempts.</li>
      </ul> },
      { heading: 'What we never do', body: <p>We don’t sell or rent your personal information, share it for advertising, or send marketing email. We only email you about your account (confirmation and password resets).</p> },
      { heading: 'Who processes data for us', body: <>
        <p>We rely on a few service providers, who process data on our behalf only to provide their service:</p>
        <ul>
          <li><strong>Cloudflare</strong> hosts the site, database and images.</li>
          <li><strong>Google</strong> handles sign-in if you choose “Continue with Google.”</li>
          <li><strong>Resend</strong> delivers account emails.</li>
        </ul>
        <p>We may disclose information if required by law or to protect the safety of our users or the site.</p>
      </> },
      { heading: 'How long we keep it', body: <p>We keep your account data until you delete your account. Sign-in sessions expire after 30 days. When you delete your account, we delete your profile, ratings, reviews, replies and saved formulas right away; copies may remain in encrypted backups for up to 30 days before they’re overwritten.</p> },
      { heading: 'Your choices and rights', body: <>
        <ul>
          <li>Change your public name or password, or sign out everywhere, in <a href="/account/settings">Account settings</a>.</li>
          <li>Edit or delete any rating, review or reply you’ve written.</li>
          <li>Delete your account and its data at any time from Account settings.</li>
        </ul>
        <p>Depending on where you live (for example, in California, the EU or the UK), you may have rights to access, correct, export or delete your personal data, or to object to how it’s used. To make a request, email <a href={`mailto:${CONTACT}`}>{CONTACT}</a>. We’ll respond within 30 days and won’t treat you differently for exercising your rights. EU and UK residents may also complain to their data protection authority.</p>
        <p>We process account data because it’s necessary to provide the service you asked for, and security data because we have a legitimate interest in keeping the site safe.</p>
      </> },
      { heading: 'Security', body: <p>Passwords are hashed, connections are encrypted, and accounts lock temporarily after repeated failed sign-ins. No system is perfectly secure; if we learn of a breach affecting your data, we’ll notify you as required by law.</p> },
      { heading: 'Where data is stored', body: <p>We and our providers may process data in the United States and other countries. Where required, our providers use standard safeguards for international transfers.</p> },
      { heading: 'Children', body: <p>Accounts are for people 13 and older (16 in the EU and UK). We don’t knowingly collect personal information from younger children. If you believe a child has created an account, email us and we’ll delete it.</p> },
      { heading: 'Changes', body: <p>If we change this policy, we’ll update the date above. For significant changes, we’ll let account holders know by email or on the site.</p> },
      { heading: 'Contact', body: <p>Questions or requests: <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.</p> },
    ]} />
}
