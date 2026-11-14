# Eat / Yeet ChatGPT app (MCP connector)

The site is an MCP server at `https://eatyeet.com/api/public/mcp` (Streamable HTTP, stateless JSON). It is meant for public listing in ChatGPT's app directory; until that's approved, anyone can add it as a custom MCP server (chatgpt.com/plugins → + → Add custom MCP server), and it also works as a Claude custom connector. The site is its own OAuth authorization server (dynamic client registration, PKCE S256, RFC 9207 `iss` on every redirect): people sign in with Google.

**Who gets what.** Any signed-in member gets reading, ratings/reviews and their own Remix formulas. The owner (`OWNER_EMAIL`) also gets the recipe-writing and photo tools; those are never registered on anyone else's server, so they can't be called.

Submission kit (listing text, reviewer account, test cases, domain verification): [`docs/changes/mcp-connector/chatgpt-submission.md`](changes/mcp-connector/chatgpt-submission.md).

Decision record: [`docs/changes/mcp-connector/decision.md`](changes/mcp-connector/decision.md).

## What it does

| Group | Tools |
|---|---|
| Read (everyone) | `search_recipes`, `get_recipe`, `list_categories` |
| Owner: style | `get_style_guide` (also the `write_recipe` prompt), `list_trial_recipes` |
| Owner: trial recipes | `create_recipe` (`publish: true` posts it), `update_recipe` (`expectedRevision`), `publish_recipe`, `unpublish_recipe`, `delete_recipe` |
| Owner: images | `upload_image` (the owner's photo: a ChatGPT chat file via `openai/fileParams`, an https URL or base64), `search_stock_photos` / `import_stock_photo` (Pexels, then Unsplash; fallback only) |
| Remix (everyone, their own) | `list_remix_recipes`, `get_remix_recipe`, `preview_remix`, `list_remixes`, `get_remix`, `create_remix`, `save_remix`, `duplicate_remix`, `restore_remix_revision`, `delete_remix`, `undelete_remix`, `delete_remix_forever` |
| Reviews (everyone, Git recipes) | `get_ratings`, `rate_recipe`, `delete_rating`, `reply_to_review`, `delete_reply` |

Style: the server instructions send models to `get_style_guide` first. It describes the published recipes' voice and format (amounts first in grams, bold step leads, ingredient ids and `uses`, the description as the only intro, stories after the card) and includes two published recipes, read live, as examples.

Photos: the owner's own photo comes first. The model offers a background clean-up for a food-blog look that keeps the food exactly as photographed, shows original and edit side by side, and uploads only the approved image. Stock is the fallback. The server can't verify that the food pixels are unchanged; that rests on the instructions and the owner's approval.

Git recipes are read-only through the connector. Trial recipes are written in the same shape as a Git YAML source (`blocks: [{ type: recipe, … }]`) and go through the same validation and normalization (`content-build/src/authoring.mjs`), so a trial recipe can become a Git source unchanged.

## Trial recipes

- Stored in `trial_recipes` and `trial_media`, outside the table prefixes content sync owns. `content:sync` never reads, rewrites or deletes them.
- Public when published, everywhere recipes appear (lists, search, recipe pages, the iPhone app API). Git wins a slug.
- Marked **Trial** on cards and recipe headers, `noindex`, left out of the sitemap and JSON-LD.
- Images are resized in the Worker by the Cloudflare Images binding (`IMAGES`) into the standard AVIF/WebP widths plus a social crop, stored in R2 under the content hash before the row exists, and referenced as `trial/<hash>.webp`.
- After every write the Worker starts a new cache generation (a conditional write to `control.json`, only while the site is `ready`). Release tooling ignores generation-only changes when it checks for concurrent content changes.
- Ratings and reviews attach to Git recipes only (their table references `recipes`).

## Operating it

```sh
pnpm remote:credentials account --env production   # adds PEXELS_API_KEY / UNSPLASH_ACCESS_KEY (blank keeps, - removes); then export a recovery kit
pnpm mcp token  --env production   # owner token for scripted tests → .local/production/mcp-token.json (1 hour)
pnpm mcp revoke --env production   # every chat client must reconnect
# OPENAI_APPS_CHALLENGE (remote:credentials account) is served at /.well-known/openai-apps-challenge for OpenAI's domain check
pnpm mcp wipe   --env production   # delete all trial recipes and images, then refresh caches
pnpm test:mcp [origin]             # every tool against a running local server (pnpm dev, or pnpm preview after build:worker)
```

Stock photos are optional: without keys, `search_stock_photos` says so and `upload_image` still works. Unsplash's API guidelines prefer hotlinking and visible credit; the site rehosts and keeps the credit with the image (`trial_media.credit`). Prefer Pexels until credits are shown on the page.
