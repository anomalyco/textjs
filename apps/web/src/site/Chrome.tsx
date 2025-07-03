import { useEffect, useState, type ReactNode } from "react";
import { getCompanion } from "../console-companion/boot";
import { siteStore } from "../console-companion/store";
import { useSite } from "../console-companion/useSite";
import { A, useLocation } from "../router";
import { CloseIcon, GitHubIcon, Logo, MenuIcon, SearchIcon } from "./icons";
import { openSearch } from "./SearchModal";
import { useCompanionTelemetry } from "./useCompanion";

export const GITHUB_URL = "https://github.com/adamdotdevin/textjs";

export function isMac(): boolean {
  return typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
}

export function devtoolsShortcut(): string {
  return isMac() ? "⌘⌥J" : "Ctrl+Shift+J";
}

const NAV = [
  { href: "/docs", label: "Docs" },
  { href: "/playground", label: "Playground" },
  { href: "/opencode", label: "OpenCode" },
  { href: "/showcase", label: "Showcase" },
];

function LivePill(): ReactNode {
  const t = useCompanionTelemetry(500);
  return (
    <button type="button" className="live-pill" onClick={() => getCompanion()?.activate()} title="A Text.js app is running in your DevTools console right now">
      <span className="dot pulse" />
      <b>Live in Console</b>
      <span className="live-detail">· Press {devtoolsShortcut()}</span>
      <span className="live-detail" style={{ color: "var(--subtle)" }}>
        · #{t?.frames ?? 0}
      </span>
    </button>
  );
}

export function Header(): ReactNode {
  const { pathname } = useLocation();
  const [menu, setMenu] = useState(false);
  useEffect(() => setMenu(false), [pathname]);
  return (
    <header className="header">
      <div className="container header-inner" style={{ maxWidth: 1440 }}>
        <A href="/" className="wordmark" aria-label="Text.js home">
          <Logo size={20} />
          <span>Text.js</span>
          <span className="version">1.0</span>
        </A>
        <nav className="nav" aria-label="Main">
          {NAV.map((n) => (
            <A key={n.href} href={n.href} aria-current={pathname === n.href || pathname.startsWith(`${n.href}/`) ? "page" : undefined}>
              {n.label}
            </A>
          ))}
        </nav>
        <div className="header-right">
          <button type="button" className="search-btn" onClick={openSearch}>
            <SearchIcon />
            <span>Search documentation…</span>
            <kbd>⌘K</kbd>
          </button>
          <LivePill />
          <a className="icon-btn" href={GITHUB_URL} target="_blank" rel="noreferrer" aria-label="GitHub">
            <GitHubIcon />
          </a>
          <button type="button" className="icon-btn menu-btn" onClick={() => setMenu((m) => !m)} aria-label="Menu">
            {menu ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </div>
      {menu ? (
        <nav className="mobile-nav" aria-label="Mobile">
          {NAV.map((n) => (
            <A key={n.href} href={n.href}>
              {n.label}
            </A>
          ))}
          <button type="button" className="btn btn-secondary" style={{ marginTop: 16 }} onClick={openSearch}>
            <SearchIcon /> Search docs
          </button>
        </nav>
      ) : null}
    </header>
  );
}

const FOOTER = [
  {
    title: "Resources",
    links: [
      { href: "/docs", label: "Docs" },
      { href: "/docs/installation", label: "Installation" },
      { href: "/playground", label: "Playground" },
      { href: "/showcase", label: "Showcase" },
    ],
  },
  {
    title: "Framework",
    links: [
      { href: "/docs/routing", label: "App Router" },
      { href: "/docs/route-handlers", label: "Route Handlers" },
      { href: "/docs/styling", label: "Styling" },
      { href: "/docs/hooks-and-repl", label: "Hooks & REPL" },
    ],
  },
  {
    title: "Engine",
    links: [
      { href: "/docs/turbolog-engine", label: "Turbolog" },
      { href: "/docs/turbolog-engine#benchmarks", label: "Benchmarks" },
      { href: "/docs/loading-and-errors#the-in-console-redbox", label: "Redbox" },
      { href: "/opencode", label: "OpenCode Lite" },
    ],
  },
  {
    title: "Community",
    links: [
      { href: GITHUB_URL, label: "GitHub" },
      { href: "https://opencode.ai", label: "OpenCode" },
      { href: `${GITHUB_URL}/releases`, label: "Releases" },
      { href: `${GITHUB_URL}/discussions`, label: "Discussions" },
    ],
  },
];

export function Footer(): ReactNode {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <A href="/" className="wordmark" aria-label="Text.js">
              <Logo size={20} />
              <span>Text.js</span>
            </A>
            <p className="subtle" style={{ fontSize: 14, maxWidth: 280, marginTop: 14 }}>
              The Console Framework for the Web. Zero-DOM React, rendered entirely inside console.log.
            </p>
          </div>
          {FOOTER.map((col) => (
            <div key={col.title}>
              <h4>{col.title}</h4>
              <ul>
                {col.links.map((l) => (
                  <li key={l.label}>
                    <A href={l.href}>{l.label}</A>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="footer-bottom">
          <span>▼ Elmore Inc. — Deployed downward into console.log</span>
          <span className="mono" style={{ fontSize: 12 }}>
            © 2026 Vershell · 0 DOM nodes were rendered by this footer's framework
          </span>
        </div>
      </div>
    </footer>
  );
}

/** Floating bottom-right toggle for routing keystrokes into the live console app. */
export function ConsolePill(): ReactNode {
  const site = useSite();
  const on = site.consoleInput;
  return (
    <button
      type="button"
      className={`console-pill${on ? " on" : ""}`}
      data-textjs-interactive=""
      onClick={() => {
        if (on) siteStore.set({ consoleInput: false });
        else getCompanion()?.activate();
      }}
      aria-pressed={on}
      title={on ? "Keystrokes outside form fields are sent to the console app. Click to pause." : "Click to send keystrokes into the console app."}
    >
      <span className={`dot${on ? " pulse" : " dot-idle"}`} />
      <span>{on ? "Console Input Active" : "Console Input Paused"}</span>
      <kbd className="pill-detail">{devtoolsShortcut()}</kbd>
    </button>
  );
}
