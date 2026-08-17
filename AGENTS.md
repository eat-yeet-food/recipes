# Agent Instructions

Read `README.md` for the full project map and `CLAUDE.md` for the short list of
known traps. The essentials:

- This is a prerendered TanStack Start static site for Cloudflare Pages. Runtime
  output is `.output/public`.
- `src/styles/global.css` is a compiled production Tailwind build. There is no
  Tailwind compiler here. Run `npm run classes` or `node scripts/has-class.mjs`
  before using unfamiliar utility classes.
- New recipe-page/chrome styling belongs in `src/styles/site-overrides.css`,
  usually behind data attributes. Do not add broad global CSS.
- Canonical recipe pages render `components/recipe-butternut-trial.tsx` through
  `components/recipe.tsx`. The old centered recipe layout is intentionally gone.
- Use `/storybook` for component review. It is an internal noindex route listed
  in `TRIAL_PATHS`.
- Validate with `npm test` before deploy. For focused recipe layout work, run
  `npm run test:recipe-pages` as well while iterating.
- Deploy from non-interactive shells with:

```bash
doppler run -p yeet -c dev -- npx wrangler pages deploy .output/public --project-name eatyeet
```
