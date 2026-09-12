# Eat / Yeet

Next.js App Router and Payload, with Git-authored YAML content and optimized images served from persistent local Cloudflare D1/R2 emulation. The public site reads Payload; the owner admin is read-only.

Requires Node 22.13+ (Node 24 LTS recommended), Corepack, and pnpm 10.28.0. No Cloudflare account or credentials are needed locally.

```sh
pnpm install --frozen-lockfile
pnpm local:setup
pnpm owner:bootstrap
pnpm content:plan
pnpm content:sync
pnpm dev
```

Open `http://127.0.0.1:3000` or `/admin`. Owner bootstrap prompts for an email and a hidden password of at least 9 characters. Sources belong in `apps/eatyeet/fixtures` and `apps/eatyeet/site.yaml`; edit Git and run `content:sync` to publish local changes. Startup never synchronizes content automatically.

```sh
pnpm build
pnpm serve                 # Production Next.js preview
pnpm build:worker
pnpm preview               # Production Worker, local bindings only
pnpm test
pnpm test:a11y
pnpm test:lighthouse
pnpm test:security
pnpm shots
pnpm parity
```

Stop one preview before starting another on the same port. Use `LOCAL_ORIGIN=http://127.0.0.1:3001` to select a different loopback port. `LOCAL_STATE_DIR` selects an isolated local state directory; the default is `.local`.

See [the local operations guide](docs/payload-local.md) for content ownership, migrations, security, images, recovery, and verification. [Implementation evidence](docs/changes/payload-local/review.md) records acceptance results and known limits.

Remote migration is a separate phase. `pnpm run deploy` deliberately fails; do not use direct Wrangler publication commands. Remote infrastructure will use locally executed Pulumi TypeScript, private R2 state, Doppler secrets, Workers/D1/R2, and Cloudflare Access with MFA.

The workspace retains its l0–l8 package boundaries and Storybook. Vite and generated fixtures support Storybook and historical baseline tooling only; they do not supply public runtime content. `CLAUDE.md` is the canonical agent guide.
