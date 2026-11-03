import { useEffect, useState, type ReactNode } from "react";
import { LOCALE, localePath, offeredLocales, type Locale } from "../i18n/locales";
import { t } from "../i18n/t";
import { getLocation } from "../router";

/** The visitor's choice of language (set by the picker or the banner); the banner never shows once it's set. */
export const LOCALE_KEY = "textjs:locale";

function remember(code: string): void {
  try {
    localStorage.setItem(LOCALE_KEY, code);
  } catch {
    // Private mode or full storage: the choice lasts for this page view.
  }
}

/** Each locale is its own build, so switching is a page load. */
function switchTo(locale: Locale): void {
  remember(locale.code);
  const { path, hash } = getLocation();
  window.location.assign(`${localePath(locale, path)}${window.location.search}${hash}`);
}

/** Footer language picker. Renders nothing while English is the only language offered. */
export function LocaleMenu(): ReactNode {
  const locales = offeredLocales();
  if (locales.length < 2) return null;
  return (
    <label className="locale-menu" data-console-bypass="">
      <span className="sr-only">{t("Language")}</span>
      <select
        value={LOCALE.code}
        onChange={(e) => {
          const next = locales.find((l) => l.code === e.target.value);
          if (next && next !== LOCALE) switchTo(next);
        }}
      >
        {locales.map((l) => (
          <option key={l.code} value={l.code} lang={l.code}>
            {l.name}
          </option>
        ))}
      </select>
    </label>
  );
}

/** The offered locale that best matches `languages` (`navigator.languages`), or `null`. */
export function suggestedLocale(languages: readonly string[], locales: readonly Locale[] = offeredLocales()): Locale | null {
  for (const raw of languages) {
    const tag = raw.toLowerCase();
    const exact = locales.find((l) => l.code.toLowerCase() === tag);
    if (exact) return exact;
    const [lang, ...rest] = tag.split("-");
    if (lang === "zh") {
      const traditional = rest.some((s) => s === "hant" || s === "tw" || s === "hk" || s === "mo");
      const zh = locales.find((l) => l.code === (traditional ? "zh-TW" : "zh-CN"));
      if (zh) return zh;
      continue;
    }
    const primary = locales.find((l) => l.code.split("-")[0]?.toLowerCase() === lang);
    if (primary) return primary;
  }
  return null;
}

interface BannerCopy {
  text: string;
  action: string;
  dismiss: string;
}

/**
 * Offers the visitor's language when the page is in another one. Fixed at the bottom start corner, so it never
 * moves the page, and shown after hydration. Never redirects.
 */
export function LocaleSuggestion(): ReactNode {
  const [offer, setOffer] = useState<{ locale: Locale; copy: BannerCopy } | null>(null);
  useEffect(() => {
    try {
      if (localStorage.getItem(LOCALE_KEY)) return;
    } catch {
      return;
    }
    const target = suggestedLocale(navigator.languages ?? [navigator.language]);
    if (!target || target === LOCALE) return;
    let alive = true;
    void import("../../locales/banner.json").then((m) => {
      const copy = (m.default as Record<string, BannerCopy>)[target.code];
      if (alive && copy) setOffer({ locale: target, copy });
    });
    return () => {
      alive = false;
    };
  }, []);
  if (!offer) return null;
  const { locale, copy } = offer;
  return (
    // The corner follows the page's direction; the offer reads in its own.
    <div className="locale-suggestion" role="region" aria-label={copy.text} data-console-bypass="">
      <div className="locale-suggestion-body" lang={locale.code} dir={locale.dir}>
        <span>{copy.text}</span>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => switchTo(locale)}>
          {copy.action}
        </button>
        <button
          type="button"
          className="locale-suggestion-close"
          aria-label={copy.dismiss}
          onClick={() => {
            remember(LOCALE.code);
            setOffer(null);
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
}
