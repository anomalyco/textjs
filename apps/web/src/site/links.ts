/** The Text.js repository. Every GitHub link on the site starts here. */
export const REPO_URL = "https://github.com/anomalyco/textjs";

/** The branch docs edits are proposed against. */
export const REPO_BRANCH = "dev";

/** GitHub's editor for a docs page. Each page's Markdown lives at `src/docs/content/<slug>.md`. */
export function docEditUrl(slug: string): string {
  return `${REPO_URL}/edit/${REPO_BRANCH}/apps/web/src/docs/content/${slug}.md`;
}
