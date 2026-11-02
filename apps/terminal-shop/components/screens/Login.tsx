import { useState, type ReactNode } from "react";
import { notEmpty } from "../../lib/form";
import { usePathname } from "@textjs/app/navigation";
import { useShop, useShopState } from "../../lib/store";
import { defaultTheme } from "../../lib/theme";
import { keyHints, logoScreen } from "../../lib/frame";
import { balance, fit, width, type Line } from "../../lib/ui";
import { useBlink, useBusy, useKeys, useLayout } from "../chrome";
import { Screen } from "../Screen";
import { useForm } from "../useForm";
import { listItem } from "./Cart";

const TOKEN_FORM = [[{ key: "token", title: "personal access token", validate: notEmpty("token") }]];

/** Centered copy wraps at this width even on wide consoles. */
const TEXT_WIDTH = 48;
const REAL_SHOP = "orders here are charged and shipped.";
const sandbox = (label: string): string => `${label} · test cards, nothing ships`;

/** Where "sign in with the browser" goes: Terminal's auth server next to its API. */
function authHost(api: string | undefined, host: string): string {
  return api && /^https:\/\/api\./.test(api) ? new URL(api).host.replace(/^api\./, "auth.") : `auth.${host}`;
}

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
  const lines = logoScreen(
    [
      [
        ...say(prompt ?? "sign in to your terminal account", t.accent),
        ...(error ? say(error, t.error) : !configured ? say("sign in isn't set up here", t.error) : []),
        // Production says nothing here: signing in charges nothing, and checkout asks before money moves.
        ...(configured && env && proxy?.defaultEnv !== "prod" ? say(sandbox(env.label)) : []),
      ],
      busy ? say(`opening ${authHost(env?.api, "terminal.shop")}...`) : keyHints([configured && ["enter", "sign in"], !!onDismiss && ["esc", "back"]], t, M),
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
        else if (store.canUse("prod")) {
          // The confirm view shows no error, so a leftover one would swallow the first esc.
          store.setError(null);
          setView("confirm-prod");
        } else store.switchEnv("prod");
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
  const command = say(`ssh ${host} -t tokens`, t.accent);
  // The field lines up under the command: same left edge, same width.
  const FW = Math.max(...command.map(width));
  let blocks: Array<Line[] | null | false>;
  if (view === "confirm-prod") {
    blocks = [[[t.error("switch to production?", { bold: true })], ...say("orders are charged and shipped.")], keyHints([["y", "switch"], ["n", "cancel"]], t, M)];
  } else if (view === "token") {
    blocks = [
      [...say("create a token with"), ...command],
      form.lines(FW, 1).map((l) => fit(l, FW)),
      errorLines,
      busy ? say("signing in...") : keyHints([["enter", "sign in"], ["esc", "back"]], t, M),
    ];
  } else {
    const options = M < 30 ? ["paste a token", "use a browser"] : ["paste an access token", "sign in with the browser"];
    const rowWidth = 5 + Math.max(...options.map((o) => width(o)));
    // `enter` sits 3 columns after the longest option, or moves to the key hints when that doesn't fit.
    const rowHint = rowWidth + 3 + 5 <= M;
    blocks = [
      options.flatMap((o, i) => listItem(o, selected === i, t, rowHint ? rowWidth + 3 + 5 + 6 : 0)).map((l) => fit(l, rowHint ? rowWidth + 8 : rowWidth)),
      env === "dev" ? say(sandbox(label)) : say(REAL_SHOP, t.error),
      errorLines,
      busy
        ? say(`opening ${authHost(envInfo?.api, host)}...`)
        : keyHints([["↑/↓", "choose"], !rowHint && ["enter", "select"], ["e", M < 36 ? "environment" : env === "dev" ? "switch to production" : "switch to dev sandbox"]], t, M),
    ];
  }
  return <Screen lines={logoScreen(blocks, L, cursor)} />;
}
