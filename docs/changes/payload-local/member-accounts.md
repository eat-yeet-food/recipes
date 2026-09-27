# Member accounts — September 27, 2026

Readers sign in with Google; the first sign-in creates the account. Accounts replace the anonymous name/email rating form: ratings, reviews and replies belong to a member, who can edit or delete them. Adjust recipe (the dough workbench) and saved dough formulas are member features. The yeet project's sign-in button, initials menu and first-sign-in name prompt informed the UX.

- **Members** are a separate Payload collection with `endpoints: false` and no admin access. The Google callback (OAuth with PKCE, no new dependency, Google-verified emails only) issues revocable `member-sessions` tokens in an HttpOnly cookie scoped to `/api/public/account`, so anonymous HTML caching is unaffected. A Worker rate-limit binding bounds sign-in starts.
- **Email/password was removed** after the first release. The owner chose not to run an email service: Payload cannot send email without one, and Cloudflare's sending requires the Workers Paid plan. The auth columns that release created stay declared and unused so schema changes remain additive.
- **Account settings** covers public name, signing out everywhere and account deletion (removes the member's reviews, replies, saved formulas and sessions).
- **Adjust recipe** sends signed-out readers to sign-in and back. Shared `?config=` links still render for everyone. Saved formulas are stored only in the account.
- **Legal:** Privacy Policy and Terms of Use pages, linked from the footer and the sign-in page. Contact: eat.yeet.food@gmail.com.
- **Retired data:** the old anonymous `recipe-ratings` tables remain declared and fully denied; nothing reads them.
- **Design:** underline fields became the standard page-form surface; filled fields remain for the workbench, dialogs and nested yellow/ink panels. Learn category headings lost their icon badges. Account menu items are full-width rows.
- **Tests:** browser suites sign in as a local test member (`test/member-session.mjs`) created through the same Google upsert path.

## Verification

Recorded in the commit that introduced the Google-only design. Not run: `pnpm test:lighthouse`, and review of `pnpm parity` differences (nav now includes Sign in; baselines were not updated). Real Google consent is verified manually on production.
