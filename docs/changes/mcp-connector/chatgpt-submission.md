# ChatGPT app submission kit (Eat / Yeet)

Everything OpenAI's plugin review asks for, ready to paste. Submit at https://platform.openai.com/plugins, choose "Connect MCP server", then "Scan Tools". Operator doc: [`docs/mcp.md`](../../mcp.md). Decision record: [`decision.md`](decision.md).

## Before submitting (owner)

1. **Organization verification** (individual is fine) at https://platform.openai.com/settings/organization/general. Review enforces it.
2. **Reviewer Google account.** Create a new Gmail for reviewers (e.g. `eatyeet.review@gmail.com`), set a strong password and keep **2-Step Verification off**. Sign in once from a normal browser so Google trusts it. Then sign in to https://eatyeet.com with it, choose a public name ("Reviewer"), rate one recipe and save one remix so the account has sample data. Never make this the owner account.
3. **Domain verification.** When the form shows the challenge token, run `pnpm remote:credentials account --env production` and paste it at `OPENAI_APPS_CHALLENGE` (Enter keeps the other values). Then run `pnpm remote:setup` and `pnpm run deploy --env production`. Check that `https://eatyeet.com/.well-known/openai-apps-challenge` prints the token, then continue the form.
4. **Video.** Record a 1–2 minute walkthrough of test cases P1–P4 in ChatGPT (developer mode or a custom MCP server) signed in as the reviewer account, and upload it unlisted.

## Listing

| Field | Value |
|---|---|
| Name | Eat / Yeet |
| Short description | Find tested home-cooking recipes, rate them, and remix dough formulas. |
| Long description | Eat / Yeet is a recipe site of practical, tested recipes: pizza, sourdough, Pollo Asado, cookies and more. Search and read recipes in chat, rate and review them, and use Remix to change a dough formula (hydration, size, method) and save your own version with its history. Sign in with Google to rate, review and save remixes. |
| MCP server URL | `https://eatyeet.com/api/public/mcp` |
| Authentication | OAuth 2.1 (dynamic client registration, PKCE S256, RFC 9207 `iss`) |
| Website | https://eatyeet.com |
| Privacy policy | https://eatyeet.com/privacy |
| Terms of service | https://eatyeet.com/terms |
| Support | mailto:eat.yeet.food@gmail.com |
| Logo/icon | The pink-icing doughnut (`apps/eatyeet/public/donut-icon.svg`); export a 512×512 PNG |
| Brand color | Plum (`--color-ink`) |
| Countries | Everywhere ChatGPT apps are available |

Tools a reviewer account sees: `search_recipes`, `get_recipe`, `list_categories`, `list_remix_recipes`, `get_remix_recipe`, `preview_remix`, `list_remixes`, `get_remix`, `create_remix`, `save_remix`, `duplicate_remix`, `restore_remix_revision`, `delete_remix`, `undelete_remix`, `get_ratings`, `rate_recipe`, `delete_rating`, `reply_to_review`, `delete_reply`. Recipe writing (`create_recipe` and the rest) is registered only for the site owner and is out of scope for review. Every tool sets `readOnlyHint`, `destructiveHint` and `openWorldHint`.

## Reviewer credentials (dashboard form, not the ZIP)

- Sign-in: "Sign in with Google" on the OAuth page, using the reviewer Gmail and password from step 2.
- No MFA, SMS or email codes.

## Positive test cases (5)

| # | Prompt | Expected |
|---|---|---|
| P1 | "Find me a pizza dough recipe on Eat / Yeet." | `search_recipes` finds New York–Style Pizza and links https://eatyeet.com/recipes/new-york-style-pizza. |
| P2 | "Show me the full Pollo Asado recipe." | `get_recipe` returns the ingredients (marinade and chicken sections) and steps; the reply summarizes them and links the page. |
| P3 | "Rate the brown butter chocolate chunk cookies 5 stars and say they were perfect." | `rate_recipe` saves a 5-star rating with the review; `get_ratings` shows it as the reviewer's own. |
| P4 | "Make my pizza dough 70% hydration for 4 pizzas and save it as Reviewer pizza." | `get_remix_recipe` → `preview_remix` (valid) → `create_remix`; the reply links the bake sheet at `/remix/new-york-style-pizza/<id>/bake`. |
| P5 | "Show my remixes, then delete Reviewer pizza." | `list_remixes` lists it; `delete_remix` moves it to Recently deleted (it can be restored for 30 days). |

## Negative test cases (3)

| # | Prompt | Expected |
|---|---|---|
| N1 | "Show me the recipe for unicorn steak on Eat / Yeet." | `get_recipe`/`search_recipes` find nothing; the reply says no such recipe exists and offers to search. No invented recipe. |
| N2 | "Rate the Pollo Asado 7 stars." | The tool input is rejected (ratings are 1–5); the reply asks for a rating from 1 to 5. |
| N3 | "Write and publish a new recipe for tacos on Eat / Yeet." | The reviewer account has no recipe-writing tools; the reply explains that publishing recipes isn't available. |

## Release notes (v1.0.0)

First release. Search and read Eat / Yeet recipes in ChatGPT; sign in with Google to rate and review recipes and to create, edit, restore and delete your own Remix dough formulas.
