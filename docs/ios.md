# iOS app (mobile/ios)

Personal SwiftUI app on the Payload backend. Free Apple ID signing (7-day profiles, same-Wi-Fi installs). Plan: native rendering of server-resolved view models; no domain logic in Swift.

- Project: XcodeGen `mobile/ios/project.yml` (the `.xcodeproj` is generated and ignored). Local SPM packages layered Core → UI → DevTools/Features.
- Commands (`scripts/ios.mjs`, each ends with one JSON line): `pnpm ios gen|build|test [--ui]|sim [url]|shot [url]|device [url]|record <s> [url]|resign|team`. `pnpm ios:check` = gen + tests.
- Deep links: `eatyeet://open`, `/dev`, `/recipes/<slug>`, `/recipes/<slug>/cook/<n>`, `/remix/<id>`. Tooling passes them as `-openURL <link>` launch arguments (`simctl openurl` shows a system prompt). `eatyeet://auth` is reserved for sign-in.
- Dev menu: shake, three-finger long press, or `eatyeet://open/dev`. Environment (Simulator defaults to Local `127.0.0.1:3000`, device to Production), build info, network log, MetricKit payloads, cache, overlays, appearance/Dynamic Type, copy diagnostics.
- Pinned Simulator: iPhone 17 Pro (402×874 @3x). Override with `IOS_SIMULATOR` / `IOS_DEVICE`.

## One-time phone setup
1. Xcode → Settings → Accounts: add your Apple ID, then `pnpm ios team`.
2. iPhone: Settings → Privacy & Security → Developer Mode.
3. Plug in by USB, trust the Mac, Xcode → Window → Devices → "Connect via network".
4. `pnpm ios device`, then trust the developer under Settings → General → VPN & Device Management.
