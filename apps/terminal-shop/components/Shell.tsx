import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "@textjs/app/navigation";
import { HEIGHT, WIDTH } from "../lib/frame";
import { useKeys } from "../lib/keys";
import { PUBLIC_PATHS, useShop, useShopState } from "../lib/store";
import { defaultTheme, palette } from "../lib/theme";
import { centerLines, place, span, type Line } from "../lib/ui";
import { HeaderModeContext, useBlink, type HeaderMode } from "./chrome";
import { LoginScreen } from "./screens/Login";
import { Screen } from "./Screen";

export function logo(cursor: boolean): Line {
  return [span("terminal", { fg: palette.accent, bold: true }), span(" ", cursor ? { bg: palette.brand } : {})];
}

function Splash(): ReactNode {
  const cursor = useBlink();
  const error = useShopState((s) => s.error);
  const t = defaultTheme;
  const content: Line[] = error
    ? centerLines([[], [], [], [], logo(cursor), [], [], [t.error(error)], [t.bold("esc"), t.base(" "), t.base("quit")]])
    : [logo(cursor)];
  return <Screen lines={place(content, WIDTH, HEIGHT)} />;
}

/** What `ssh` prints after the session ends. */
function Quit(): ReactNode {
  const store = useShop();
  useKeys(() => {
    store.reconnect();
    return true;
  }, { priority: 100 });
  const t = defaultTheme;
  return <Screen lines={[[t.base("Connection to terminal.shop closed.")], [], [t.bold("enter"), t.base(" reconnect")]]} />;
}

/** The initial path as a same-origin URL; anything odd (`/\\host`, bad escapes) opens the shop. */
export function parseInitial(target: string): URL {
  try {
    const url = new URL(target, "http://x");
    if (url.origin === "http://x") return url;
  } catch {
    // fall through
  }
  return new URL("/shop", "http://x");
}

export function Shell({ children }: { children?: ReactNode }): ReactNode {
  const store = useShop();
  const router = useRouter();
  const pathname = usePathname();
  const phase = useShopState((s) => s.phase);
  const error = useShopState((s) => s.error);
  const signInPrompt = useShopState((s) => s.signInPrompt);
  const signedOut = useShopState((s) => s.proxy?.mode === "site" && s.auth !== "session");
  const headerMode = useRef<HeaderMode>({ enabled: true, claims: [], page: null });
  const [routed, setRouted] = useState(false);
  const lastPage = useRef("/shop");

  useEffect(() => {
    void store.start(store.initialLocation(pathname));
  }, [store]);

  // `routeToInitialPage`: honor the requested path once data has loaded.
  useEffect(() => {
    if (phase !== "ready") {
      setRouted(false);
      return;
    }
    if (routed) return;
    setRouted(true);
    const url = parseInitial(store.s.initialPath);
    const p = url.searchParams.get("p");
    if (p) store.selectProductByName(p);
    // Keep the query (`/account?page=faq`), it picks the section.
    if (pathname === "/" || pathname === "/login" || pathname.startsWith("/auth") || pathname !== url.pathname) router.replace(url.pathname === "/" ? "/shop" : `${url.pathname}${url.search}`);
  }, [phase, routed, store, router, pathname]);

  useEffect(() => {
    if (pathname !== "/menu" && pathname !== "/") lastPage.current = pathname;
  }, [pathname]);

  // Root `Update`: ctrl+c quits, esc dismisses an error.
  useKeys(
    (key) => {
      if (key === "ctrl+c") {
        store.quit();
        return true;
      }
      if (key === "esc" && error) {
        if (phase === "splash") store.quit();
        else store.setError(null);
        return true;
      }
      return false;
    },
    { priority: 50, isActive: phase !== "quit" },
  );

  // Site mode, signed out: account pages ask you to sign in first.
  const gated = phase === "ready" && signedOut && !PUBLIC_PATHS.has(pathname);
  const dismissSignIn = (): void => {
    store.dismissSignIn();
    if (gated) router.replace("/shop");
  };

  // `HeaderUpdate`: reserved keys navigate unless a form has focus.
  useKeys(
    (key) => {
      const mode = headerMode.current;
      if (!mode.enabled || mode.claims.includes(key)) return false;
      const page = mode.page;
      switch (key) {
        case "c":
          if (page !== "cart") router.push("/cart");
          return true;
        case "s":
          if (page !== "shop") router.push("/shop");
          return true;
        case "a":
          if (page !== "account") router.push("/account");
          return true;
        case "m":
          if (page !== "menu") router.push(`/menu?from=${encodeURIComponent(lastPage.current)}`);
          return true;
        case "q":
          store.quit();
          return true;
      }
      return false;
    },
    { priority: 40, isActive: phase === "ready" && routed && !signInPrompt && !gated },
  );

  let content: ReactNode;
  if (pathname.startsWith("/auth/callback") && phase !== "ready" && phase !== "quit") content = children;
  else if (phase === "quit") content = <Quit />;
  else if (phase === "login") content = <LoginScreen />;
  else if (phase === "ready" && routed && (signInPrompt || gated)) content = <LoginScreen prompt={signInPrompt ?? "sign in to see your cart and account"} onDismiss={dismissSignIn} />;
  else if (phase === "ready" && routed && pathname !== "/") content = children;
  else content = <Splash />;

  return <HeaderModeContext.Provider value={headerMode}>{content}</HeaderModeContext.Provider>;
}
