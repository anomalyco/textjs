import { useEffect, useState, type ReactNode } from "react";
import { useConsoleLogDown } from "../console-health";
import { getCompanion } from "../console-companion/boot";
import { isPadRoute, siteStore } from "../console-companion/store";
import { useSite } from "../console-companion/useSite";
import { A, useLocation } from "../router";
import { ChevronRight, CloseIcon, Logo, MenuIcon, SearchIcon } from "./icons";
import { LogoMenu, useLogoMenu } from "./LogoMenu";
import { openSearch } from "./SearchModal";
import { Sheet, useCloseOnMedia } from "./Sheet";

export function isMac(): boolean {
  return typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
}

export function devtoolsShortcut(): string {
  return isMac() ? "⌘⌥J" : "Ctrl+Shift+J";
}

/**
 * The DevTools shortcut for this platform. Both variants are rendered and CSS shows one
 * (`html[data-os]`, set before first paint), so prerendered HTML hydrates without a text swap.
 */
export function DevtoolsShortcut(): ReactNode {
  return (
    <>
      <span className="os-mac">⌘⌥J</span>
      <span className="os-other">Ctrl+Shift+J</span>
    </>
  );
}

const NAV = [
  { href: "/docs", label: "Docs" },
  { href: "/learn", label: "Learn" },
  { href: "/playground", label: "Playground" },
];

function isActive(pathname: string, href: string): boolean {
  // OpenCode and terminal.shop are Playground demos.
  if (href === "/playground" && isPadRoute(pathname)) return true;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Header(): ReactNode {
  const { pathname } = useLocation();
  const [menu, setMenu] = useState(false);
  const [logoMenu, openLogoMenu, closeLogoMenu] = useLogoMenu();
  const close = (): void => setMenu(false);
  useEffect(close, [pathname]);
  useCloseOnMedia(menu, "(min-width: 901px)", close);
  const search = (): void => {
    setMenu(false);
    openSearch();
  };
  return (
    <header className="header">
      <div className="container header-inner" style={{ maxWidth: 1440 }}>
        <A href="/" className="wordmark" aria-label="Text.js home" onContextMenu={openLogoMenu}>
          <Logo size={20} />
          <span>Text.js</span>
        </A>
        {logoMenu ? <LogoMenu state={logoMenu} onClose={closeLogoMenu} /> : null}
        <nav className="nav" aria-label="Main">
          {NAV.map((n) => (
            <A key={n.href} href={n.href} aria-current={isActive(pathname, n.href) ? "page" : undefined}>
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
          <button type="button" className="icon-btn search-icon-btn" onClick={search} aria-label="Search documentation">
            <SearchIcon size={18} />
          </button>
          <button
            type="button"
            className="icon-btn menu-btn"
            onClick={() => setMenu((m) => !m)}
            aria-label={menu ? "Close menu" : "Open menu"}
            aria-expanded={menu}
            aria-controls="mobile-nav"
          >
            {menu ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </div>
      <Sheet open={menu} onClose={close} id="mobile-nav" label="Site navigation" side="top" className="mobile-nav">
        <button type="button" className="mobile-search" onClick={search}>
          <SearchIcon size={16} />
          <span>Search documentation…</span>
        </button>
        <nav aria-label="Mobile" onClick={(e) => (e.target as Element).closest("a") && close()}>
          <A href="/" aria-current={pathname === "/" ? "page" : undefined}>
            Home
            <ChevronRight />
          </A>
          {NAV.map((n) => (
            <A key={n.href} href={n.href} aria-current={isActive(pathname, n.href) ? "page" : undefined}>
              {n.label}
              <ChevronRight />
            </A>
          ))}
        </nav>
      </Sheet>
    </header>
  );
}

/** Two labels share one grid cell, so the link keeps its width when the status changes. */
function FooterStatus(): ReactNode {
  const down = useConsoleLogDown();
  return (
    <A href="/status" className="footer-status">
      <span className={`dot${down ? " dot-red" : ""}`} />
      <span className="footer-status-label">
        <span style={down ? { visibility: "hidden" } : undefined}>All systems operational</span>
        <span style={down ? undefined : { visibility: "hidden" }}>Major outage</span>
      </span>
    </A>
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
          <A href="/errors">Errors</A>
          <A href="/changelog">Changelog</A>
          <A href="/blog">Blog</A>
          <A href="/enterprise">Enterprise</A>
          <A href="/merch">Merch</A>
          <A href="/status">Status</A>
        </nav>
        <FooterStatus />
      </div>
    </footer>
  );
}

/** Floating bottom-right toggle for routing keystrokes into the live console app. */
export function ConsolePill(): ReactNode {
  const site = useSite();
  const on = site.consoleInput;
  // Pad pages are one big console switch already.
  if (isPadRoute(site.pathname)) return null;
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
      <kbd className="pill-detail">
        <DevtoolsShortcut />
      </kbd>
      <span>Console</span>
    </button>
  );
}
