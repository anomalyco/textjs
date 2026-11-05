import { canPrefetchConsole } from "@textjs/core/experimental";
import { useEffect, useState, type ReactNode } from "react";
import { useConsoleLogDown } from "../console-health";
import { activateCompanion } from "../console-companion/bridge";
import { isPadRoute, siteStore } from "../console-companion/store";
import { useSite } from "../console-companion/useSite";
import { rich, type Tags } from "../i18n/rich";
import { msg, t } from "../i18n/t";
import { A, useLocation } from "../router";
import { ArrowUpRight, ChevronRight, CloseIcon, GitHubIcon, Logo, MenuIcon, SearchIcon } from "./icons";
import { REPO_URL } from "./links";
import { LogoMenu, preloadLogoMenu, useLogoMenu } from "./logo-menu-loader";
import { openSearch, preloadSearch } from "./SearchModal";
import { hasLocaleMenu, LocaleMenu } from "./LocaleMenu";
import { Sheet, useCloseOnMedia } from "./Sheet";

/**
 * The console shortcut for this browser and platform. Every variant is rendered and CSS shows one
 * (`html[data-os]` and `html[data-browser]`, set before first paint), so prerendered HTML hydrates
 * without a text swap.
 */
export function DevtoolsShortcut(): ReactNode {
  return (
    <>
      <span className="br-chromium os-mac">⌘⌥J</span>
      <span className="br-chromium os-other">Ctrl+Shift+J</span>
      <span className="br-firefox os-mac">⌘⌥K</span>
      <span className="br-firefox os-other">Ctrl+Shift+K</span>
      <span className="br-safari">⌘⌥C</span>
    </>
  );
}

/**
 * Tags for sentences that tell the visitor to open the console, so each sentence is one catalog string:
 * `<keys></keys>` is this browser's shortcut, and `<safari>…</safari>` is shown in Safari only
 * (`html[data-browser=safari]`), where the shortcut works once developer features are on (`<link>`).
 */
export const CONSOLE_TAGS: Tags = {
  keys: () => (
    <kbd>
      <DevtoolsShortcut />
    </kbd>
  ),
  safari: (c) => <span className="br-safari">{c}</span>,
  link: (c) => <A href="/docs/installation#open-the-console">{c}</A>,
};

const NAV = [
  { href: "/docs", label: msg("Docs") },
  { href: "/learn", label: msg("Learn") },
  { href: "/playground", label: msg("Playground") },
];

function isActive(pathname: string, href: string): boolean {
  // OpenCode and terminal.shop are Playground demos.
  if (href === "/playground" && isPadRoute(pathname)) return true;
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Hovering or focusing a search button downloads search where prefetching suits the device and connection. */
function warmSearch(): void {
  if (canPrefetchConsole()) preloadSearch();
}

export function Header(): ReactNode {
  const { path: pathname } = useLocation();
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
        <A
          href="/"
          className="wordmark"
          aria-label={t("Text.js home")}
          dir="ltr"
          lang="en"
          onContextMenu={openLogoMenu}
          onMouseEnter={preloadLogoMenu}
          onFocus={preloadLogoMenu}
          onPointerDown={preloadLogoMenu}
        >
          <Logo size={20} />
          <span>Text.js</span>
        </A>
        {logoMenu ? <LogoMenu state={logoMenu} onClose={closeLogoMenu} /> : null}
        <nav className="nav" aria-label={t("Main")}>
          {NAV.map((n) => (
            <A key={n.href} href={n.href} aria-current={isActive(pathname, n.href) ? "page" : undefined}>
              {n.label}
            </A>
          ))}
        </nav>
        <div className="header-right">
          <button
            type="button"
            className="search-btn"
            onClick={openSearch}
            onMouseEnter={warmSearch}
            onFocus={warmSearch}
            onPointerDown={preloadSearch}
          >
            <SearchIcon />
            <span>{t("Search")}</span>
            <kbd>
              <span className="os-mac">⌘K</span>
              <span className="os-other">Ctrl+K</span>
            </kbd>
          </button>
          <button
            type="button"
            className="icon-btn search-icon-btn"
            onClick={search}
            onMouseEnter={warmSearch}
            onFocus={warmSearch}
            onPointerDown={preloadSearch}
            aria-label={t("Search documentation")}
          >
            <SearchIcon size={18} />
          </button>
          <A href={REPO_URL} className="icon-btn github-btn" aria-label={t("Text.js on GitHub")}>
            <GitHubIcon size={18} />
          </A>
          <button
            type="button"
            className="icon-btn menu-btn"
            onClick={() => setMenu((m) => !m)}
            aria-label={menu ? t("Close menu") : t("Open menu")}
            aria-expanded={menu}
            aria-controls="mobile-nav"
          >
            {menu ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </div>
      <Sheet open={menu} onClose={close} id="mobile-nav" label={t("Site navigation")} side="top" className="mobile-nav">
        <button type="button" className="mobile-search" onClick={search} onPointerDown={preloadSearch}>
          <SearchIcon size={16} />
          <span>{t("Search documentation…")}</span>
        </button>
        <nav aria-label={t("Mobile")} onClick={(e) => (e.target as Element).closest("a") && close()}>
          <A href="/" aria-current={pathname === "/" ? "page" : undefined}>
            {t("Home")}
            <ChevronRight />
          </A>
          {NAV.map((n) => (
            <A key={n.href} href={n.href} aria-current={isActive(pathname, n.href) ? "page" : undefined}>
              {n.label}
              <ChevronRight />
            </A>
          ))}
          <A href={REPO_URL}>
            GitHub
            <ArrowUpRight />
          </A>
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
        <span style={down ? { visibility: "hidden" } : undefined}>{t("All systems operational")}</span>
        <span style={down ? undefined : { visibility: "hidden" }}>{t("Major outage")}</span>
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
            {rich("© 2026 <link>Anomaly</link>. All rights reserved.", { link: (c) => <a href="https://anoma.ly">{c}</a> })}
          </p>
        </div>
        <nav aria-label={t("Footer")}>
          {NAV.map((l) => (
            <A key={l.href} href={l.href}>
              {l.label}
            </A>
          ))}
          <A href="/errors">{t("Errors")}</A>
          <A href="/changelog">{t("Changelog")}</A>
          <A href="/blog">{t("Blog")}</A>
          <A href="/enterprise">{t("Enterprise")}</A>
          <A href="/store">{t("Store")}</A>
          <A href="/status">{t("Status")}</A>
          <A href={REPO_URL}>GitHub</A>
        </nav>
        {hasLocaleMenu() ? (
          <div className="footer-end">
            <FooterStatus />
            <LocaleMenu />
          </div>
        ) : (
          <FooterStatus />
        )}
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
        else activateCompanion();
      }}
      aria-pressed={on}
      title={on ? t("Keystrokes outside form fields are sent to the console app. Click to pause.") : t("Click to send keystrokes into the console app.")}
    >
      <span className={`dot${on ? "" : " dot-idle"}`} />
      <kbd className="pill-detail">
        <DevtoolsShortcut />
      </kbd>
      <span>{t("Console")}</span>
    </button>
  );
}
