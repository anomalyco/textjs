import { DOCS_META, type DocMeta } from "./meta";

export interface Heading {
  depth: number;
  text: string;
  id: string;
}

export const DOC_HEADINGS: Readonly<Record<string, readonly Heading[]>> = {
  "introduction": [
    {
      "depth": 2,
      "text": "What's included",
      "id": "whats-included"
    },
    {
      "depth": 2,
      "text": "How it works",
      "id": "how-it-works"
    },
    {
      "depth": 2,
      "text": "Next steps",
      "id": "next-steps"
    }
  ],
  "installation": [
    {
      "depth": 2,
      "text": "Requirements",
      "id": "requirements"
    },
    {
      "depth": 2,
      "text": "Create an app",
      "id": "create-an-app"
    },
    {
      "depth": 2,
      "text": "Open the console",
      "id": "open-the-console"
    },
    {
      "depth": 2,
      "text": "Console settings",
      "id": "console-settings"
    },
    {
      "depth": 2,
      "text": "Manual setup",
      "id": "manual-setup"
    },
    {
      "depth": 2,
      "text": "Without the framework",
      "id": "without-the-framework"
    }
  ],
  "project-structure": [
    {
      "depth": 2,
      "text": "Folders",
      "id": "folders"
    },
    {
      "depth": 2,
      "text": "Routing files",
      "id": "routing-files"
    },
    {
      "depth": 2,
      "text": "Dynamic routes",
      "id": "dynamic-routes"
    },
    {
      "depth": 2,
      "text": "text.config.ts",
      "id": "textconfigts"
    },
    {
      "depth": 2,
      "text": "CLI",
      "id": "cli"
    }
  ],
  "routing": [
    {
      "depth": 2,
      "text": "Pages",
      "id": "pages"
    },
    {
      "depth": 2,
      "text": "Layouts",
      "id": "layouts"
    },
    {
      "depth": 2,
      "text": "Dynamic segments",
      "id": "dynamic-segments"
    },
    {
      "depth": 2,
      "text": "Navigation",
      "id": "navigation"
    },
    {
      "depth": 3,
      "text": "<Link>",
      "id": "link"
    },
    {
      "depth": 3,
      "text": "useRouter",
      "id": "userouter"
    },
    {
      "depth": 3,
      "text": "usePathname and useParams",
      "id": "usepathname-and-useparams"
    }
  ],
  "loading-and-errors": [
    {
      "depth": 2,
      "text": "Loading UI",
      "id": "loading-ui"
    },
    {
      "depth": 2,
      "text": "Errors",
      "id": "errors"
    },
    {
      "depth": 2,
      "text": "Not found",
      "id": "not-found"
    },
    {
      "depth": 2,
      "text": "The in-console Redbox",
      "id": "the-in-console-redbox"
    },
    {
      "depth": 2,
      "text": "Dev Overlay",
      "id": "dev-overlay"
    }
  ],
  "route-handlers": [
    {
      "depth": 2,
      "text": "Convention",
      "id": "convention"
    },
    {
      "depth": 2,
      "text": "Dynamic handlers",
      "id": "dynamic-handlers"
    },
    {
      "depth": 2,
      "text": "Streaming",
      "id": "streaming"
    },
    {
      "depth": 2,
      "text": "Rewrites",
      "id": "rewrites"
    },
    {
      "depth": 2,
      "text": "Local daemon proxying",
      "id": "local-daemon-proxying"
    }
  ],
  "server-rendering": [
    {
      "depth": 2,
      "text": "Two runtimes",
      "id": "two-runtimes"
    },
    {
      "depth": 2,
      "text": "Opting in",
      "id": "opting-in"
    },
    {
      "depth": 2,
      "text": "When to use which",
      "id": "when-to-use-which"
    },
    {
      "depth": 2,
      "text": "Async server components",
      "id": "async-server-components"
    },
    {
      "depth": 2,
      "text": "How it works",
      "id": "how-it-works"
    },
    {
      "depth": 2,
      "text": "Partial Prerendering",
      "id": "partial-prerendering"
    },
    {
      "depth": 2,
      "text": "Deploying",
      "id": "deploying"
    }
  ],
  "middleware": [
    {
      "depth": 2,
      "text": "Convention",
      "id": "convention"
    },
    {
      "depth": 2,
      "text": "Matching paths",
      "id": "matching-paths"
    },
    {
      "depth": 2,
      "text": "NextResponse",
      "id": "nextresponse"
    },
    {
      "depth": 2,
      "text": "Headers",
      "id": "headers"
    },
    {
      "depth": 2,
      "text": "Cookies",
      "id": "cookies"
    },
    {
      "depth": 2,
      "text": "Background work",
      "id": "background-work"
    },
    {
      "depth": 2,
      "text": "Notes",
      "id": "notes"
    }
  ],
  "caching": [
    {
      "depth": 2,
      "text": "Route handlers",
      "id": "route-handlers"
    },
    {
      "depth": 2,
      "text": "Headers",
      "id": "headers"
    },
    {
      "depth": 2,
      "text": "Data cache",
      "id": "data-cache"
    },
    {
      "depth": 2,
      "text": "Stale-while-revalidate",
      "id": "stale-while-revalidate"
    },
    {
      "depth": 2,
      "text": "On-demand revalidation",
      "id": "on-demand-revalidation"
    },
    {
      "depth": 2,
      "text": "Custom cache stores",
      "id": "custom-cache-stores"
    },
    {
      "depth": 2,
      "text": "Platform notes",
      "id": "platform-notes"
    }
  ],
  "deploying": [
    {
      "depth": 2,
      "text": "Adapters",
      "id": "adapters"
    },
    {
      "depth": 2,
      "text": "Static",
      "id": "static"
    },
    {
      "depth": 2,
      "text": "Bun",
      "id": "bun"
    },
    {
      "depth": 2,
      "text": "Vercel",
      "id": "vercel"
    },
    {
      "depth": 2,
      "text": "Cloudflare Pages",
      "id": "cloudflare-pages"
    },
    {
      "depth": 2,
      "text": "Upgrading",
      "id": "upgrading"
    },
    {
      "depth": 2,
      "text": "Server-rendered routes",
      "id": "server-rendered-routes"
    },
    {
      "depth": 2,
      "text": "Behind a proxy",
      "id": "behind-a-proxy"
    },
    {
      "depth": 2,
      "text": "Caveats",
      "id": "caveats"
    }
  ],
  "styling": [
    {
      "depth": 2,
      "text": "Utilities",
      "id": "utilities"
    },
    {
      "depth": 2,
      "text": "Typed props",
      "id": "typed-props"
    },
    {
      "depth": 2,
      "text": "Colors",
      "id": "colors"
    },
    {
      "depth": 2,
      "text": "Themes",
      "id": "themes"
    },
    {
      "depth": 2,
      "text": "Responsive viewports",
      "id": "responsive-viewports"
    }
  ],
  "internationalization": [
    {
      "depth": 2,
      "text": "Direction",
      "id": "direction"
    },
    {
      "depth": 2,
      "text": "How it renders",
      "id": "how-it-renders"
    },
    {
      "depth": 2,
      "text": "Cell widths",
      "id": "cell-widths"
    },
    {
      "depth": 2,
      "text": "Input and editing",
      "id": "input-and-editing"
    },
    {
      "depth": 2,
      "text": "Limits",
      "id": "limits"
    },
    {
      "depth": 2,
      "text": "API",
      "id": "api"
    }
  ],
  "keyboard": [
    {
      "depth": 2,
      "text": "useKeymap",
      "id": "usekeymap"
    },
    {
      "depth": 2,
      "text": "<KeyHelp>",
      "id": "keyhelp"
    },
    {
      "depth": 2,
      "text": "<KeyHints> and <StatusBar>",
      "id": "keyhints-and-statusbar"
    },
    {
      "depth": 2,
      "text": "<CommandPalette>",
      "id": "commandpalette"
    }
  ],
  "testing": [
    {
      "depth": 2,
      "text": "Rendering",
      "id": "rendering"
    },
    {
      "depth": 2,
      "text": "Input",
      "id": "input"
    },
    {
      "depth": 2,
      "text": "Time",
      "id": "time"
    },
    {
      "depth": 2,
      "text": "Snapshots",
      "id": "snapshots"
    }
  ],
  "terminal": [
    {
      "depth": 2,
      "text": "text run",
      "id": "text-run"
    },
    {
      "depth": 2,
      "text": "renderToTerminal",
      "id": "rendertoterminal"
    },
    {
      "depth": 2,
      "text": "Output",
      "id": "output"
    },
    {
      "depth": 2,
      "text": "Input",
      "id": "input"
    },
    {
      "depth": 2,
      "text": "Differences",
      "id": "differences"
    }
  ],
  "mcp": [
    {
      "depth": 2,
      "text": "Setup",
      "id": "setup"
    },
    {
      "depth": 3,
      "text": "OpenCode",
      "id": "opencode"
    },
    {
      "depth": 3,
      "text": "Claude Code",
      "id": "claude-code"
    },
    {
      "depth": 3,
      "text": "Cursor",
      "id": "cursor"
    },
    {
      "depth": 3,
      "text": "VS Code",
      "id": "vs-code"
    },
    {
      "depth": 2,
      "text": "Tools",
      "id": "tools"
    },
    {
      "depth": 2,
      "text": "Frames and idle",
      "id": "frames-and-idle"
    },
    {
      "depth": 2,
      "text": "Errors and logs",
      "id": "errors-and-logs"
    },
    {
      "depth": 2,
      "text": "Options",
      "id": "options"
    },
    {
      "depth": 2,
      "text": "How it works",
      "id": "how-it-works"
    },
    {
      "depth": 2,
      "text": "Limits",
      "id": "limits"
    }
  ],
  "eslint": [
    {
      "depth": 2,
      "text": "Setup",
      "id": "setup"
    },
    {
      "depth": 2,
      "text": "Configs",
      "id": "configs"
    },
    {
      "depth": 2,
      "text": "Console files",
      "id": "console-files"
    },
    {
      "depth": 2,
      "text": "Rules",
      "id": "rules"
    },
    {
      "depth": 3,
      "text": "no-dom-elements",
      "id": "no-dom-elements"
    },
    {
      "depth": 3,
      "text": "no-box-in-text",
      "id": "no-box-in-text"
    },
    {
      "depth": 3,
      "text": "no-unsupported-glyphs",
      "id": "no-unsupported-glyphs"
    },
    {
      "depth": 3,
      "text": "no-console-in-components",
      "id": "no-console-in-components"
    },
    {
      "depth": 3,
      "text": "prefer-use-interval",
      "id": "prefer-use-interval"
    },
    {
      "depth": 3,
      "text": "no-sub-frame-timers",
      "id": "no-sub-frame-timers"
    },
    {
      "depth": 3,
      "text": "prefer-use-keymap",
      "id": "prefer-use-keymap"
    },
    {
      "depth": 3,
      "text": "valid-route-module",
      "id": "valid-route-module"
    },
    {
      "depth": 3,
      "text": "valid-metadata",
      "id": "valid-metadata"
    },
    {
      "depth": 3,
      "text": "route-handler-exports",
      "id": "route-handler-exports"
    }
  ],
  "devtools-extension": [
    {
      "depth": 2,
      "text": "Install",
      "id": "install"
    },
    {
      "depth": 2,
      "text": "Components",
      "id": "components"
    },
    {
      "depth": 2,
      "text": "Frame",
      "id": "frame"
    },
    {
      "depth": 2,
      "text": "Timeline",
      "id": "timeline"
    },
    {
      "depth": 2,
      "text": "How it works",
      "id": "how-it-works"
    },
    {
      "depth": 2,
      "text": "Privacy",
      "id": "privacy"
    },
    {
      "depth": 2,
      "text": "Limitations",
      "id": "limitations"
    }
  ],
  "vscode": [
    {
      "depth": 2,
      "text": "Install",
      "id": "install"
    },
    {
      "depth": 2,
      "text": "Live Preview",
      "id": "live-preview"
    },
    {
      "depth": 3,
      "text": "Keyboard",
      "id": "keyboard"
    },
    {
      "depth": 3,
      "text": "Live mode",
      "id": "live-mode"
    },
    {
      "depth": 3,
      "text": "Headless mode",
      "id": "headless-mode"
    },
    {
      "depth": 2,
      "text": "Commands",
      "id": "commands"
    },
    {
      "depth": 2,
      "text": "Snippets",
      "id": "snippets"
    },
    {
      "depth": 2,
      "text": "Error codes",
      "id": "error-codes"
    },
    {
      "depth": 2,
      "text": "Status bar",
      "id": "status-bar"
    },
    {
      "depth": 2,
      "text": "Settings",
      "id": "settings"
    },
    {
      "depth": 2,
      "text": "Workspace Trust",
      "id": "workspace-trust"
    },
    {
      "depth": 2,
      "text": "How it works",
      "id": "how-it-works"
    }
  ],
  "components-layout": [
    {
      "depth": 2,
      "text": "<Box>",
      "id": "box"
    },
    {
      "depth": 2,
      "text": "<Text>",
      "id": "text"
    },
    {
      "depth": 2,
      "text": "<ScrollBox>",
      "id": "scrollbox"
    },
    {
      "depth": 2,
      "text": "<Modal>",
      "id": "modal"
    },
    {
      "depth": 2,
      "text": "Spacer, Divider and Badge",
      "id": "spacer-divider-and-badge"
    },
    {
      "depth": 2,
      "text": "Layout helpers",
      "id": "layout-helpers"
    },
    {
      "depth": 2,
      "text": "<SplitPane>",
      "id": "splitpane"
    }
  ],
  "components-interactive": [
    {
      "depth": 2,
      "text": "Focus",
      "id": "focus"
    },
    {
      "depth": 2,
      "text": "<Input>",
      "id": "input"
    },
    {
      "depth": 2,
      "text": "<Textarea>",
      "id": "textarea"
    },
    {
      "depth": 2,
      "text": "<Select>",
      "id": "select"
    },
    {
      "depth": 2,
      "text": "<Tabs>",
      "id": "tabs"
    },
    {
      "depth": 2,
      "text": "Unfocused cursor",
      "id": "unfocused-cursor"
    }
  ],
  "components-content": [
    {
      "depth": 2,
      "text": "<Markdown>",
      "id": "markdown"
    },
    {
      "depth": 2,
      "text": "<Code>",
      "id": "code"
    },
    {
      "depth": 2,
      "text": "<Diff>",
      "id": "diff"
    },
    {
      "depth": 2,
      "text": "<Spinner>",
      "id": "spinner"
    },
    {
      "depth": 2,
      "text": "<AsciiFont>",
      "id": "asciifont"
    }
  ],
  "fonts": [
    {
      "depth": 2,
      "text": "Installation",
      "id": "installation"
    },
    {
      "depth": 2,
      "text": "Usage",
      "id": "usage"
    },
    {
      "depth": 2,
      "text": "Layout",
      "id": "layout"
    },
    {
      "depth": 2,
      "text": "Wrapping and alignment",
      "id": "wrapping-and-alignment"
    },
    {
      "depth": 2,
      "text": "Bundled fonts",
      "id": "bundled-fonts"
    },
    {
      "depth": 2,
      "text": "Custom fonts",
      "id": "custom-fonts"
    },
    {
      "depth": 2,
      "text": "Licensing",
      "id": "licensing"
    },
    {
      "depth": 2,
      "text": "Verified against figlet",
      "id": "verified-against-figlet"
    }
  ],
  "components-data": [
    {
      "depth": 2,
      "text": "Navigation",
      "id": "navigation"
    },
    {
      "depth": 2,
      "text": "<List>",
      "id": "list"
    },
    {
      "depth": 2,
      "text": "<Table>",
      "id": "table"
    },
    {
      "depth": 3,
      "text": "Sorting",
      "id": "sorting"
    },
    {
      "depth": 3,
      "text": "Selection",
      "id": "selection"
    },
    {
      "depth": 2,
      "text": "<Tree>",
      "id": "tree"
    }
  ],
  "components-charts": [
    {
      "depth": 2,
      "text": "<LineChart>",
      "id": "linechart"
    },
    {
      "depth": 2,
      "text": "<BarChart>",
      "id": "barchart"
    },
    {
      "depth": 2,
      "text": "<Sparkline>",
      "id": "sparkline"
    },
    {
      "depth": 2,
      "text": "<ProgressBar>",
      "id": "progressbar"
    },
    {
      "depth": 2,
      "text": "<Gradient>",
      "id": "gradient"
    },
    {
      "depth": 2,
      "text": "<Image>",
      "id": "image"
    }
  ],
  "components-forms": [
    {
      "depth": 2,
      "text": "Controls",
      "id": "controls"
    },
    {
      "depth": 3,
      "text": "Buttons",
      "id": "buttons"
    },
    {
      "depth": 2,
      "text": "<Dialog>",
      "id": "dialog"
    },
    {
      "depth": 2,
      "text": "<Confirm>",
      "id": "confirm"
    },
    {
      "depth": 2,
      "text": "Toasts",
      "id": "toasts"
    }
  ],
  "hooks-and-repl": [
    {
      "depth": 2,
      "text": "useInput",
      "id": "useinput"
    },
    {
      "depth": 2,
      "text": "usePaste and useWheel",
      "id": "usepaste-and-usewheel"
    },
    {
      "depth": 2,
      "text": "useViewport",
      "id": "useviewport"
    },
    {
      "depth": 2,
      "text": "usePageFocus",
      "id": "usepagefocus"
    },
    {
      "depth": 2,
      "text": "useConsoleStats",
      "id": "useconsolestats"
    },
    {
      "depth": 2,
      "text": "useApp",
      "id": "useapp"
    },
    {
      "depth": 2,
      "text": "The window.text REPL",
      "id": "the-windowtext-repl"
    }
  ],
  "utility-hooks": [
    {
      "depth": 2,
      "text": "Timers",
      "id": "timers"
    },
    {
      "depth": 2,
      "text": "useAnimationFrame",
      "id": "useanimationframe"
    },
    {
      "depth": 2,
      "text": "useTween and useSpring",
      "id": "usetween-and-usespring"
    },
    {
      "depth": 2,
      "text": "useMeasure",
      "id": "usemeasure"
    },
    {
      "depth": 2,
      "text": "useBreakpoint",
      "id": "usebreakpoint"
    },
    {
      "depth": 2,
      "text": "useLocalStorage",
      "id": "uselocalstorage"
    },
    {
      "depth": 2,
      "text": "useClipboard",
      "id": "useclipboard"
    },
    {
      "depth": 2,
      "text": "<FocusScope>",
      "id": "focusscope"
    }
  ],
  "turbolog-engine": [
    {
      "depth": 2,
      "text": "Goals",
      "id": "goals"
    },
    {
      "depth": 2,
      "text": "Pipeline",
      "id": "pipeline"
    },
    {
      "depth": 2,
      "text": "CellBuffer",
      "id": "cellbuffer"
    },
    {
      "depth": 2,
      "text": "Dirty gate",
      "id": "dirty-gate"
    },
    {
      "depth": 2,
      "text": "Frame swap",
      "id": "frame-swap"
    },
    {
      "depth": 2,
      "text": "Run-length encoding",
      "id": "run-length-encoding"
    },
    {
      "depth": 2,
      "text": "Chromium details",
      "id": "chromium-details"
    },
    {
      "depth": 2,
      "text": "Firefox and Safari",
      "id": "firefox-and-safari"
    },
    {
      "depth": 2,
      "text": "Benchmarks",
      "id": "benchmarks"
    }
  ],
  "release-channels": [
    {
      "depth": 2,
      "text": "Channels",
      "id": "channels"
    },
    {
      "depth": 2,
      "text": "Stable",
      "id": "stable"
    },
    {
      "depth": 2,
      "text": "Canary",
      "id": "canary"
    },
    {
      "depth": 2,
      "text": "Provenance",
      "id": "provenance"
    },
    {
      "depth": 2,
      "text": "Cutting a release",
      "id": "cutting-a-release"
    }
  ],
  "support-policy": [
    {
      "depth": 2,
      "text": "Release lines",
      "id": "release-lines"
    },
    {
      "depth": 2,
      "text": "What we fix on LTS",
      "id": "what-we-fix-on-lts"
    },
    {
      "depth": 2,
      "text": "Breaking changes",
      "id": "breaking-changes"
    },
    {
      "depth": 2,
      "text": "Runtime support",
      "id": "runtime-support"
    },
    {
      "depth": 2,
      "text": "Security",
      "id": "security"
    }
  ],
  "opencode": [
    {
      "depth": 2,
      "text": "Try it",
      "id": "try-it"
    },
    {
      "depth": 2,
      "text": "Anatomy",
      "id": "anatomy"
    },
    {
      "depth": 2,
      "text": "Keys",
      "id": "keys"
    },
    {
      "depth": 2,
      "text": "Connect a local server",
      "id": "connect-a-local-server"
    }
  ]
};

export interface MetaSearchHit {
  doc: DocMeta;
  heading?: Heading;
  score: number;
}

/** Subsequence fuzzy score (higher is better); `-1` when `query` doesn't match. */
export function fuzzyScore(query: string, target: string): number {
  const q = query.toLowerCase().replace(/\s+/g, "");
  const t = target.toLowerCase();
  if (q.length === 0) return 0;
  const direct = t.indexOf(query.toLowerCase().trim());
  if (direct >= 0) return 1000 - direct - t.length * 0.1;
  let score = 0;
  let ti = 0;
  let streak = 0;
  for (const ch of q) {
    const found = t.indexOf(ch, ti);
    if (found < 0) return -1;
    streak = found === ti ? streak + 1 : 0;
    score += 10 + streak * 5 - (found - ti);
    ti = found + 1;
  }
  return score - t.length * 0.1;
}

export function searchDocsMeta(query: string, limit = 12): MetaSearchHit[] {
  const q = query.trim();
  if (q.length === 0) return DOCS_META.map((doc) => ({ doc, score: 0 }));
  const hits: MetaSearchHit[] = [];
  for (const doc of DOCS_META) {
    const s = Math.max(fuzzyScore(q, doc.title) * 1.5, fuzzyScore(q, doc.nav ?? doc.title) * 1.5, fuzzyScore(q, doc.description));
    if (s >= 0) hits.push({ doc, score: s + 50 });
    for (const h of DOC_HEADINGS[doc.slug] ?? []) {
      const hs = fuzzyScore(q, h.text);
      if (hs >= 0) hits.push({ doc, heading: h, score: hs });
    }
  }
  hits.sort((a, b) => b.score - a.score);
  return hits.slice(0, limit);
}
