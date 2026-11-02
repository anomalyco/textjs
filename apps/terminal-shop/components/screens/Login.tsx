import { useState, type ReactNode } from "react";
import { notEmpty } from "../../lib/form";
import { usePathname } from "@textjs/app/navigation";
import { useShop, useShopState } from "../../lib/store";
import { defaultTheme } from "../../lib/theme";
import { keyHints, logoScreen } from "../../lib/frame";
import { balance, fit, type Line } from "../../lib/ui";
import { useBlink, useBusy, useKeys, useLayout } from "../chrome";
import { Screen } from "../Screen";
import { useForm } from "../useForm";
import { listItem } from "./Cart";

const TOKEN_FORM = [[{ key: "token", title: "personal access token", validate: notEmpty("token") }]];

/** Centered copy wraps at this width even on wide consoles. */
const TEXT_WIDTH = 48;
const REAL_SHOP = "this is the real shop. orders are charged.";

/**
 * Sign in. The SSH shop identifies you by your ssh key; in the browser you bring a
 * personal access token (`ssh terminal.shop -t tokens`) or sign in through Terminal's
 * OAuth 2.0 server. A centered column under the logo, like the splash.
 */
export function LoginScreen({ prompt, onDismiss }: { prompt?: string; onDismiss?: () => void } = {}): ReactNode {
  const site = useShopState((s) => s.proxy?.mode === "site");
  if (site) return <SiteLoginScreen prompt={prompt} onDismiss={onDismiss} />;
  return <TokenLoginScreen />;
}

/**
 * textjs.org: sign in only through Terminal's OAuth server. The site's proxy runs the
 * authorization code + PKCE flow and keeps the session in an httpOnly cookie, so there's
 * no token to paste and nothing for this page to store.
 */
function SiteLoginScreen({ prompt, onDismiss }: { prompt?: string; onDismiss?: () => void }): ReactNode {
  const store = useShop();
  const error = useShopState((s) => s.error);
  const proxy = useShopState((s) => s.proxy);
  const initialPath = useShopState((s) => s.initialPath);
  const signInReturn = useShopState((s) => s.signInReturn);
  const pathname = usePathname();
  const cursor = useBlink();
  const L = useLayout();
  const W = L.widthContent;
  const [busy, run] = useBusy();
  const configured = proxy?.session?.configured ?? false;

  useKeys((key) => {
    if (busy) return true;
    switch (key) {
      case "esc":
        if (!onDismiss) return false;
        onDismiss();
        return true;
      case "enter":
        store.setError(null);
        if (!configured) return true;
        void run(async () => {
          try {
            const returnTo = signInReturn ?? (pathname === "/" ? initialPath : pathname);
            await store.signInWithBrowser(returnTo === "/" ? "/shop" : returnTo);
          } catch (e) {
            store.fail(e);
          }
        });
        return true;
    }
    return false;
  });

  const t = defaultTheme;
  const M = Math.min(W, TEXT_WIDTH);
  const say = (v: string, style = t.base): Line[] => balance(v, M).map((l) => [style(l)]);
  const env = proxy?.environments[proxy.defaultEnv];
  const authHost = (env?.api ?? "https://api.terminal.shop").replace(/^https:\/\/api\./, "auth.");
  const lines = logoScreen(
    [
      [
        ...say(prompt ?? "sign in to your terminal account", t.accent),
        ...(error ? say(error, t.error) : !configured ? say("sign in isn't set up here", t.error) : []),
        ...(configured && env ? say(proxy?.defaultEnv === "prod" ? REAL_SHOP : `${env.label}: test cards, nothing ships`) : []),
      ],
      busy ? say(`opening ${authHost}...`) : keyHints([configured && ["enter", "sign in"], !!onDismiss && ["esc", "back"]], t, M),
    ],
    L,
    cursor,
  );
  return <Screen lines={lines} />;
}

function TokenLoginScreen(): ReactNode {
  const store = useShop();
  const env = useShopState((s) => s.env);
  const error = useShopState((s) => s.error);
  const proxy = useShopState((s) => s.proxy);
  const cursor = useBlink();
  const L = useLayout();
  const W = L.widthContent;
  const [selected, setSelected] = useState(0);
  const [view, setView] = useState<"choose" | "token" | "confirm-prod">("choose");
  const [busy, run] = useBusy();

  const form = useForm({
    groups: TOKEN_FORM,
    active: view === "token" && !busy,
    masked: ["token"],
    onKey: (key) => {
      if (key !== "esc") return false;
      setView("choose");
      return true;
    },
    onSubmit: (values) => {
      void run(() => store.signInWithToken(values.token ?? ""));
    },
  });

  useKeys((key) => {
    if (busy || view === "token") return busy;
    if (view === "confirm-prod") {
      if (key === "y") store.switchEnv("prod");
      if (key === "y" || key === "n" || key === "esc") setView("choose");
      return true;
    }
    switch (key) {
      case "up":
      case "k":
      case "shift+tab":
        setSelected(0);
        return true;
      case "down":
      case "j":
      case "tab":
        setSelected(1);
        return true;
      case "e":
        if (env === "prod") store.switchEnv("dev");
        else if (store.canUse("prod")) setView("confirm-prod");
        else store.switchEnv("prod");
        return true;
      case "enter":
        store.setError(null);
        if (!proxy) return true;
        if (selected === 0) {
          form.reset({});
          setView("token");
        } else {
          void run(async () => {
            await store.signInWithBrowser();
          });
        }
        return true;
    }
    return false;
  });

  const t = defaultTheme;
  const M = Math.min(W, TEXT_WIDTH);
  const say = (v: string, style = t.base): Line[] => balance(v, M).map((l) => [style(l)]);
  const host = env === "dev" ? "dev.terminal.shop" : "terminal.shop";
  const envInfo = proxy?.environments[env];
  const label = envInfo?.label ?? (env === "dev" ? "dev sandbox" : "production");
  const errorLines = error ? say(error, t.error) : null;
  // Fields and list rows keep their left edge: the block is centered, not each row.
  const FW = Math.min(M, 36);
  let blocks: Array<Line[] | null | false>;
  if (view === "confirm-prod") {
    blocks = [[[t.error("switch to production?", { bold: true })]], say("orders there are charged and shipped."), [[t.base("are you sure? "), t.accent("(y/n)")]]];
  } else if (view === "token") {
    blocks = [
      [...say("create a token with"), ...say(`ssh ${host} -t tokens`, t.accent)],
      form.lines(FW, 1).map((l) => fit(l, FW)),
      errorLines,
      busy ? say("signing in...") : keyHints([["enter", "sign in"], ["esc", "back"]], t, M),
    ];
  } else {
    const LW = Math.min(W, 42);
    blocks = [
      [
        ...listItem(LW < 40 ? "paste a token" : "paste an access token", selected === 0, t, LW),
        ...listItem(LW < 30 ? "use a browser" : "sign in with the browser", selected === 1, t, LW),
      ].map((l) => fit(l, LW)),
      [...say(`${label} · ${envInfo?.api.replace(/^https?:\/\//, "") ?? host}`), ...(env === "dev" ? say("test cards, nothing ships") : say(REAL_SHOP, t.error)), ...(errorLines ?? [])],
      busy ? say("opening sign in...") : keyHints([["↑/↓", "choose"], ["e", M < 36 ? "environment" : env === "dev" ? "switch to production" : "switch to dev sandbox"]], t, M),
    ];
  }
  return <Screen lines={logoScreen(blocks, L, cursor)} />;
}
