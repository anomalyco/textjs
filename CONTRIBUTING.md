# Contributing to Text.js

Bug reports, fixes and docs improvements are welcome. For a new feature or a large change, open an issue first so we can agree on the approach before you write the code.

## Setup

You need [Bun](https://bun.sh) 1.2 or later (CI uses 1.4.4) and Node.js 22 or later.

```bash
git clone https://github.com/anomalyco/textjs.git
cd textjs
bun install
```

The apps and tests import the TypeScript sources. `bun run build:packages` builds each package's `dist/` in dependency order, which you need only before packing or publishing.

## Repository layout

| Path | Contents |
| --- | --- |
| `packages/` | The packages and extensions above |
| `apps/web` | [textjs.org](https://textjs.org): docs, Learn, the playground and the store |
| `apps/opencode-console` | The OpenCode client behind [textjs.org/opencode](https://textjs.org/opencode) |
| `apps/terminal-shop` | The [terminal.shop](https://terminal.shop) client behind [textjs.org/coffee](https://textjs.org/coffee) |
| `examples/` | Example apps |
| `scripts/` | Release scripts and `qa-starters.ts` |
| `bench/devtools` | DevTools rendering benchmarks, and the Playwright install the e2e scripts use |
| `media/learn` | The pipeline that renders the Learn chapter videos |
| `brand/`, `merch/` | Brand images, and the artwork and tech packs for [textjs.org/store](https://textjs.org/store) |

## Tests

```bash
bun test packages/                  # unit tests for every package
bun test apps/opencode-console/     # OpenCode client
bun run --cwd apps/web test         # site, docs and API routes
bun run --cwd apps/terminal-shop test
bun run typecheck                   # packages
bun run --cwd apps/web typecheck
```

Tests render frames to an in-memory buffer, so they don't need a browser. Add or update a test with every change.

### Browser tests

The end-to-end scripts drive headless Chromium through `playwright-core`, installed once in `bench/devtools`:

```bash
bun install --cwd bench/devtools
cd bench/devtools && bunx playwright-core install chromium
```

- `bun scripts/qa-starters.ts` scaffolds every `create-text-app` template from packed tarballs, installs it with bun and npm, and runs `text dev`, `build`, `start` and `run` in Chromium and a pty. It also covers `examples/` and the apps, and fails on any console error or warning. `--only` and `--steps` narrow the run; the header of the script lists every option. CI runs it on every pull request.
- `node apps/web/scripts/e2e-*.mjs` checks the site's keyboard input, layout, Learn pages and easter eggs. Each script's header lists the server it expects in `apps/web`, either `bun run dev` or `bun run build && bun run preview`.
- `bun apps/terminal-shop/scripts/e2e.ts --mock` walks through checkout against an in-memory Terminal API.
- `bun run --cwd packages/devtools-extension e2e` loads the DevTools extension in Chromium against `examples/dashboard`.

## Running the apps

| Command | App | URL |
| --- | --- | --- |
| `bun run --cwd apps/web dev` | textjs.org | [localhost:3000](http://localhost:3000) |
| `bun run dev:opencode` | OpenCode client | [localhost:3001](http://localhost:3001) |
| `bun run dev:terminal` | terminal.shop client | [localhost:3002](http://localhost:3002) |
| `bun run dev:dashboard` | `examples/dashboard` | [localhost:3000](http://localhost:3000) |

Open the page and press **⌘⌥J** (**Ctrl+Shift+J** on Windows and Linux) to see the app. The OpenCode client connects to a local OpenCode server and falls back to a demo without one; see [`apps/opencode-console/README.md`](apps/opencode-console/README.md). The terminal.shop client needs a dev sandbox token for signed-in flows; see [`apps/terminal-shop/README.md`](apps/terminal-shop/README.md).

## Pull requests

- Open pull requests against `dev`, the default branch.
- Keep each pull request to one change, and explain what it does and how you tested it.
- Add an entry under `## [Unreleased]` in [`CHANGELOG.md`](CHANGELOG.md) for any change users will notice.
- Match the style of the code around your change. TypeScript is strict across the repo.
- Run `bun test packages/` and `bun run typecheck` before you push.

## Writing docs and copy

Docs, READMEs, error messages and site copy follow [`apps/web/STYLE.md`](apps/web/STYLE.md). In short:

- Say what something is and what it does, with real API names, commands and numbers.
- Check every command, flag, shortcut and number against the code. Cut numbers you can't source.
- Write full sentences. Headings are a feature name or one plain statement, without a trailing period.
- Docs are instructional: "To do X, use Y."
- Avoid em dashes, contrast templates ("not X, but Y"), lists of three for rhythm, closing morals and stock words such as seamless, powerful, effortless and simply.

## Deploys

The repository has two long-lived branches. Pull requests merge into `dev`, and `production` holds what runs on textjs.org. To ship, maintainers open a pull request from `dev` to `production` and merge it with **Create a merge commit**.

[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) deploys every push to either branch. It builds the packages and the site, runs `bun run --cwd apps/web test`, and uploads `apps/web/dist` and `apps/web/functions` to the `textjs` Cloudflare Pages project.

| Push to | Deploys to |
| --- | --- |
| `dev` | [dev.textjs-avg.pages.dev](https://dev.textjs-avg.pages.dev), a preview |
| `production` | [textjs.org](https://textjs.org) |

Pull requests don't deploy. When a push to `production` changes `apps/web/workers/curl-http`, the workflow also deploys that Worker, which answers `curl http://textjs.org`.

## Releases

Every package is versioned in lockstep. Maintainers cut releases:

```bash
bun run release:version patch                       # or minor, major, canary, stable, x.y.z
bun run release:publish --tag latest --provenance
```

`release:version` bumps every `package.json` and the version constants that mirror it. `release:publish` builds, packs and publishes each package, and skips versions that already exist on npm. Every push to `dev` also publishes an `x.y.z-canary.N` build under the `canary` tag from [`.github/workflows/canary.yml`](.github/workflows/canary.yml). [Release channels](https://textjs.org/docs/release-channels) has the details.

## License

By contributing, you agree that your contributions are licensed under the [MIT License](LICENSE).
