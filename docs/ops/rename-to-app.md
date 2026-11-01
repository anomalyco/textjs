# Renaming `@textjs/next` to `@textjs/app`

`@textjs/next` read like an official Next.js integration, so the framework package (App Router, server features, the `text` CLI, the Vite plugin and adapters) becomes `@textjs/app`. The CLI is still `text`. `@textjs/next` 1.0.0 and 1.0.1 stay on npm and get deprecated. `@textjs/app` starts at 1.0.2, in lockstep with the other packages.

## The codemod

```bash
bun scripts/rename-next-to-app.ts --dry-run   # what would change; exits 1 if anything would
bun scripts/rename-next-to-app.ts             # apply, then bun install
bun scripts/rename-next-to-app.ts             # second run: "nothing to do: already renamed"
```

Flags: `--no-move` keeps `packages/text`, `--no-bump` keeps the version, `--no-install` skips `bun install`, `--verbose` lists every file. It reads every tracked and untracked-but-not-ignored text file, so run it on a clean checkout.

| Step | What changes |
| --- | --- |
| Directory | `git mv packages/text packages/app` (stale ignored output in `packages/app` from another branch is removed first) |
| Package name | `@textjs/next` and every subpath (`/link`, `/navigation`, `/server`, `/cache`, `/terminal`, `/testing`, `/vite`, `/mcp`, `/cli`, …) become `@textjs/app`: manifests and workspace deps, imports, Vite plugin names, `ssr.noExternal`, error codes and error docs, ESLint plugin defaults, the VS Code extension, templates, docs, Learn content, READMEs, `ARCHITECTURE.md`, tests |
| Paths | `packages/text` becomes `packages/app`, plus relative paths that resolve into it (`../../text/src/cli/run`) |
| Narration | "at textjs slash next" becomes "at textjs slash app" (the `PRONOUNCE` map and chapter maps) |
| History | Released CHANGELOG sections, `status-incidents.ts` and the 1.0 blog post's "One rename" section keep `@textjs/next`. Only copyable commands there (`bunx @textjs/next proxy`, `bun add @textjs/next`) are rewritten. Lines that name both packages are rename notes and are never touched |
| Version | Lockstep 1.0.1 → 1.0.2 via `release-version.ts`, so templates pin `^1.0.2`; `"@textjs/app": "^1.0.0"`/`"^1.0.1"` ranges become `^1.0.2` |
| Additions | An Unreleased CHANGELOG entry (Changed) and an update note under the blog post's rename |
| Videos | `apps/web/src/learn/video.ts`: eight chapters point at their `-v2` files, with durations |
| Lockfile | `bun install` rewrites `bun.lock` and relinks the workspace |

`@textjs/opencode` keeps its name. Its README's one `@textjs/next` reference becomes `@textjs/app`.

## Learn videos

All ten chapters are re-rendered or checked. Eight show or say the package name: Getting Started, Routing and Running in a Terminal say it, and Data Fetching, Layout, Styling, Input & Keymaps and Components show `import … from "@textjs/next"` on screen. Testing and Shipping changed with the copy audit and `audit-followups` (narration fixes, quiz text, the Netlify `_redirects` step). Layout's outro and Styling's cover show Styling's new summary.

| Chapter | Files | Duration |
| --- | --- | --- |
| Getting Started | `getting-started-v3-*` | 234.3 s |
| Layout | `layout-v3-*` | 218.7 s |
| Styling | `styling-v3-*` | 204.4 s |
| Input & Keymaps | `input-and-keymaps-v2-*` | 205.1 s |
| Routing | `routing-v3-*` | 226.1 s |
| Data Fetching | `data-fetching-v2-*` | 212.3 s |
| Components | `components-v3-*` | 184.8 s |
| Testing | `testing-v2-*` | 194.4 s |
| Running in a Terminal | `terminal-v2-*` | 211.1 s |
| Shipping | `shipping-v2-*` | 183.7 s |

Each is on R2 at `learn/<slug>/<slug>-vN-{1080p.mp4,720p.mp4,poster.jpg}` and `<slug>-vN.vtt`. The live site keeps serving the unversioned files until a deploy picks up `REVISIONS` in `video.ts`. The `v2` files of the first five chapters in the table are an earlier pass, superseded by `v3`.

To check whether a later lesson or `course.ts` edit made a render stale, run `bun media/learn/render.ts <slug> --timeline-only` before and after the edit and compare `media/learn/out/work/<slug>/timeline.json`.

## Release

1. Merge `rename-app` into `main` if `main` hasn't moved past `f323ef7`. Otherwise cherry-pick its codemod and video filename commits onto `main` (not the codemod's output commit), run `bun scripts/rename-next-to-app.ts`, commit, then cherry-pick the two `learn(video)` commits. Read the codemod's summary: the only lines left naming `@textjs/next` should be history and rename notes.
2. Verify: `bun run build:packages`, `CI=1 bun test packages/`, the web, opencode-console and terminal-shop tests, `bun run typecheck`, the web build, `bun scripts/qa-starters.ts --skip-build`, `bun scripts/release-publish.ts --tag latest --dry-run --skip-build`.
3. In `CHANGELOG.md`, turn `## [Unreleased]` into `## [1.0.2] - <date>`. Commit and push. Don't run `release:version patch`: the codemod already set 1.0.2.
4. Publish: `bun run release:publish --tag latest --provenance`.
5. Check `npm view @textjs/app version` is 1.0.2, then deprecate the old name:

   ```bash
   npm deprecate @textjs/next "Renamed to @textjs/app. Run: bun remove @textjs/next && bun add @textjs/app"
   ```

6. Deploy the site, so the Learn pages switch to the versioned videos.

## A `@textjs/next` 1.0.2 shim

Not worth it before launch. The deprecation message tells anyone on 1.0.x what to run. A shim would have to mirror all 21 export paths and the `text` bin, would install a second `text` bin beside `@textjs/app`'s, and would keep the old name alive in search results.
