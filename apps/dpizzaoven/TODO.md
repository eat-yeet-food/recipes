## Launch TODO

Current state:

- This app owns its config in `app.config.mjs`.
- Fixtures live in `fixtures/recipes`.
- Public assets live in `public`.
- The app uses the shared package stack, theme, shell, catalog cards, browse,
  search, recipe detail page, content build, and deploy pipeline.
- Local video blocks are not implemented yet.

Launch checklist:

1. Audit fixtures for titles, descriptions, ingredient text, instructions,
   notes, image fields, and internal links.
2. Compress or replace oversized images in `public/images`.
3. Review copy and SEO values in `app.config.mjs`, including hero copy, page
   titles, descriptions, author, default OG image, preview paths, origin, and
   Cloudflare Pages project.
4. Run this app's build and build verification with its app id selected.
5. QA `/`, `/recipes`, `/browse`, `/search`, and at least one recipe page on
   desktop and mobile.
6. Before launch, run the shared app gates from the workspace root.
7. Deploy with this app id selected.

Follow-ups:

- Add a first-class local `video` content block in `packages/l4/content-build`
  and `packages/l6/ui-content-blocks` before adding local video assets.
- Decide whether this app needs its own theme token values in
  `packages/l8/web/src/styles/global.css` / `site-overrides.css`.
  Until then, keep it on the shared visual system.
