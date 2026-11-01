Text.js ships on three npm dist-tags. Every package (`@textjs/next`, `@textjs/react`, `@textjs/core`, `@textjs/font`, `create-text-app` and `eslint-plugin-textjs`) is versioned in lockstep, so one version number describes the whole framework.

## Channels

| Channel | dist-tag | Version | Install |
| :-- | :-- | :-- | :-- |
| Stable | `latest` | `1.0.0` | `bun add @textjs/next` |
| Canary | `canary` | `1.0.1-canary.N` | `bun add @textjs/next@canary` |
| LTS | `lts`, `v1-lts` | Published once `2.0.0` ships | `bun add @textjs/next@lts` |

Use stable in production. Use canary to try fixes and features the day they land on `main`. Once an LTS line exists, use it if you upgrade once a year.

```bash
bun create text-app@canary my-console
```

## Stable

Stable releases follow [semantic versioning](https://semver.org): patches fix bugs, minors add backwards-compatible features, majors may break APIs after a deprecation period. A stable release is promoted from a canary that has passed the full test suite, and is published with npm provenance.

## Canary

Every push to `main` in the official repository is type-checked, tested and published as the next patch with a `-canary.N` suffix:

| `latest` | `main` push | Published |
| :-- | :-- | :-- |
| `1.0.0` | first | `1.0.1-canary.0` |
| `1.0.0` | second | `1.0.1-canary.1` |
| `1.0.1` | next | `1.0.2-canary.0` |

`N` continues from the highest canary already on npm, so numbers never repeat. Canary versions are not committed to the repository. Add `[skip canary]` to a commit message to skip a release.

Canaries are real builds of `main`, not nightlies: they may change or remove unreleased APIs without notice. Pin an exact canary version if you depend on one.

## Provenance

Releases are published from GitHub Actions with `npm publish --provenance`, which links each tarball to the exact commit and workflow that built it. Verify a package with:

```bash
npm audit signatures
```

## Cutting a release

Maintainers bump every workspace package in lockstep with the release scripts:

```bash
bun run release:version minor   # 1.0.0 → 1.1.0 (also: patch, major, canary, stable, x.y.z)
bun run release:publish --tag latest --provenance
```

`release:version` rewrites each `package.json` and the version constants that mirror it (`VERSION`, the reconciler's `rendererVersion`), refuses to run when packages have drifted apart, and `--dry-run` prints the plan. `release:publish` builds, packs (resolving `workspace:*`), applies `publishConfig`, refuses to put a prerelease on `latest` or a stable version on `canary`, and skips versions that already exist on npm.

See the [Support Policy](/docs/support-policy) for how long each release line is maintained.
