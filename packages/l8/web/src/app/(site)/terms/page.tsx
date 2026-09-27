import type { Metadata } from 'next'
import { LegalPage } from '@eat-yeet/l6-ui-shell/shell/legal'
import { siteData } from '../../../next/cms'

const CONTACT = 'eat.yeet.food@gmail.com'
export async function generateMetadata(): Promise<Metadata> {
  return { title: `Terms of Use | ${(await siteData()).siteName}` }
}

export default function Page() {
  return <LegalPage title="Terms of Use" updated="September 27, 2026"
    intro={<p>These terms apply to your use of Eat / Yeet. By using the site or creating an account, you agree to them. If you don’t agree, please don’t use the site.</p>}
    sections={[
      { heading: 'Accounts', body: <ul>
        <li>You must be at least 13 years old (16 in the EU and UK) to create an account.</li>
        <li>You sign in with your Google account and are responsible for activity on your Eat / Yeet account.</li>
        <li>One person per account. Don’t impersonate anyone or pick a public name that misleads or offends.</li>
        <li>You can delete your account at any time from Account settings.</li>
      </ul> },
      { heading: 'Ratings, reviews and replies', body: <>
        <p>You own what you post. By posting, you give Eat / Yeet a non-exclusive, worldwide, royalty-free license to display, store and format it on the site for as long as it’s posted. The license ends when you delete the content or your account, apart from routine backups that expire.</p>
        <p>Please keep contributions honest and about the recipe. Don’t post anything that is:</p>
        <ul>
          <li>unlawful, hateful, harassing, threatening or sexually explicit;</li>
          <li>someone else’s copyrighted work or private information;</li>
          <li>spam, advertising, fake reviews or reviews of recipes you haven’t tried in good faith;</li>
          <li>intended to disrupt, probe or attack the site.</li>
        </ul>
        <p>We may remove content or suspend accounts that break these rules, at our discretion. We aren’t obliged to monitor content, and reviews reflect the views of their authors, not ours.</p>
      </> },
      { heading: 'Recipes and site content', body: <p>Recipes, articles, photos and design on Eat / Yeet belong to us or our licensors. You’re welcome to cook from them and share links. Please don’t republish them in bulk or copy them into other sites or products without permission.</p> },
      { heading: 'Cooking safely', body: <p>Recipes, calculators and formulas are provided for general home-cooking information. Results depend on your ingredients, equipment and technique. Use your judgment about food safety, allergies, hot ovens and sharp tools. Nothing here is professional, medical or nutritional advice.</p> },
      { heading: 'Copyright complaints', body: <p>If you believe content on the site infringes your copyright, email <a href={`mailto:${CONTACT}`}>{CONTACT}</a> with the work, where it appears, your contact details, and a statement that you have a good-faith belief the use isn’t authorized. We’ll review it and remove infringing material.</p> },
      { heading: 'Disclaimers', body: <p>The site is provided “as is” and “as available,” without warranties of any kind, to the extent permitted by law. We don’t guarantee it will always be available, error-free or that saved data will never be lost.</p> },
      { heading: 'Limitation of liability', body: <p>To the extent permitted by law, Eat / Yeet and its operator are not liable for indirect, incidental or consequential damages arising from your use of the site. Our total liability for any claim is limited to US$50. Some jurisdictions don’t allow these limits, so they may not apply to you.</p> },
      { heading: 'Changes and ending', body: <p>We may update these terms; the date above will change and significant updates will be announced on the site. We may change or discontinue features, or the site, at any time. You may stop using the site whenever you like.</p> },
      { heading: 'Governing law', body: <p>These terms are governed by the laws of the State of California, USA, without regard to conflict-of-law rules, except where your local consumer protection law gives you rights that can’t be waived.</p> },
      { heading: 'Contact', body: <p>Questions about these terms: <a href={`mailto:${CONTACT}`}>{CONTACT}</a>. See also our <a href="/privacy">Privacy Policy</a>.</p> },
    ]} />
}
