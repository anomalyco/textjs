import { useEffect, useState, type ReactNode } from "react";
import { getCompanion } from "../console-companion/boot";
import { siteStore } from "../console-companion/store";
import { useSite } from "../console-companion/useSite";
import { A, useLocation } from "../router";
import { CloseIcon, Logo, MenuIcon, SearchIcon } from "./icons";
import { openSearch } from "./SearchModal";

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
            <span>Search</span>
            <kbd>⌘K</kbd>
          </button>
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

export function Footer(): ReactNode {
  return (
    <footer className="footer">
      <div className="container footer-row">
        <div className="tx-copyright">
          <img src="/anomaly-signature.svg" alt="" aria-hidden="true" width="163" height="64" loading="lazy" decoding="async" />
          <p>
            ©2026 <a href="https://anoma.ly">Anomaly</a>. All rights reserved
          </p>
        </div>
        <nav aria-label="Footer">
          {NAV.map((l) => (
            <A key={l.href} href={l.href}>
              {l.label}
            </A>
          ))}
        </nav>
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
      <span className={`dot${on ? "" : " dot-idle"}`} />
      <kbd className="pill-detail">{devtoolsShortcut()}</kbd>
      <span>Console</span>
    </button>
  );
}
