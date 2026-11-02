This page covers how long each Text.js release line receives fixes, and what counts as a breaking change.

## Release lines

| Status | Receives | Duration |
| :-- | :-- | :-- |
| Active | Features, fixes, security patches | Until the next major |
| Maintenance LTS | Critical fixes and security patches | 12 months after the next major ships |
| End of life | Nothing | — |

Only the latest minor of a major is patched: when `1.5.0` ships, fixes land in `1.5.x`, not `1.4.x`. When `2.0.0` ships, the final `1.x` minor becomes the Maintenance LTS line and is published under the `lts` and `v1-lts` dist-tags.

| Version | Status | Supported until |
| :-- | :-- | :-- |
| 1.x | Active | 12 months after 2.0.0 |

## What we fix on LTS

- Security vulnerabilities in Text.js packages
- Crashes, data loss and build failures without a workaround
- Compatibility with new Chromium releases that break console rendering
- Compatibility with supported runtimes and deploy targets

New features, performance work and refactors land on the active line only.

## Breaking changes

These only change in a major release, after a deprecation warning in at least one minor:

- Public exports of `@textjs/app`, `@textjs/react` and `@textjs/core`, including `@textjs/app/server` and `@textjs/app/cache`
- `text.config.ts` options, the `text` CLI commands and flags
- File conventions in `app/`, `middleware.ts` and route segment config
- Adapter output layouts (`.vercel/output`, `_worker.js`, `dist/server.js`)

Not covered: APIs marked experimental or `unstable_` (they may change in a minor, with notes in the changelog), internals such as `x-middleware-*` headers and `.text/` build metadata, canary releases, and exact `console.log` format strings and CSS (frames stay visually identical; their encoding may get faster).

## Runtime support

| Runtime | Supported |
| :-- | :-- |
| Chrome / Edge DevTools | Current and previous two stable releases |
| Node.js | Active and maintenance LTS releases (`text start`, Vercel functions) |
| Bun | Latest 1.x |
| Cloudflare Workers | `compatibility_date` 2025-01-01 or later, `nodejs_compat` |

Dropping a runtime version that has reached its own end of life is not a breaking change.

## Security

Report vulnerabilities privately to [security@textjs.org](mailto:security@textjs.org) or through the repository's GitHub security advisories, not in public issues. Fixes are released for every supported line at the same time, and the advisory is published once patched versions are on npm.

See [Release Channels](/docs/release-channels) for how versions and dist-tags are produced.
