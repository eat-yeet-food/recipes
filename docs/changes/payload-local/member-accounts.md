# Member accounts — September 27, 2026

Readers can create accounts with email/password or Google. Accounts replace the anonymous name/email rating form: ratings, reviews and replies now belong to a member, who can edit or delete them. Signed-in saved dough formulas sync to the account. The yeet project's sign-in button, initials menu and first-sign-in name prompt informed the UX; yeet itself uses hosted WorkOS pages, so the forms here are new.

- **Members** are a separate Payload auth collection with `endpoints: false` and no admin access. Account routes under `/api/public/account` call Payload's Local API auth operations (password hashing, required email confirmation, lockout, reset tokens) and issue revocable `member-sessions` tokens in an HttpOnly cookie scoped to `/api/public/account`, so anonymous HTML caching is unaffected.
- **Google** uses OAuth with PKCE directly (no new dependency) and accepts only Google-verified emails. It can claim an existing address; an unconfirmed password registered on that address is discarded.
- **Email** goes through Resend's HTTP API remotely and is printed to the terminal locally. Each address gets at most one account email per minute and five per day. Registration and reset responses don't reveal whether an account exists. Credential endpoints also have a Worker rate-limit binding.
- **Account settings** covers public name, changing or adding a password, signing out everywhere and account deletion (removes the member's reviews, replies, saved formulas and sessions).
- **Legal:** Privacy Policy and Terms of Use pages were added, linked from the footer and the create-account form. They are a template for review, not legal advice.
- **Retired data:** the old anonymous `recipe-ratings` tables remain declared and fully denied so the migration stays additive; nothing reads them.
- **Design:** underline fields became the standard page-form surface; filled fields remain for the workbench, dialogs and nested yellow/ink panels. Learn category headings lost their icon badges.

## Verification

- `pnpm test` passed: design policy, units, remote tooling, infra types, boundaries, TypeScript, production build, isolated content/security/accounts integration, HTTP/SEO, 43 interaction checks, 134 recipe checks, and 124 Storybook stories at two widths.
- `pnpm test:a11y`: 48 page/state checks passed, including the account pages at 1366, 390 and 320 pixels. `pnpm test:security`: no known vulnerabilities.
- Not run for this change: `pnpm test:lighthouse`, and review of `pnpm parity` differences (every page's nav now includes Sign in; baselines were not updated). Google sign-in has no end-to-end test: it needs a real OAuth client.
