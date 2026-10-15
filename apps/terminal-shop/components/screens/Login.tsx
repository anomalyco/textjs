import { useState, type ReactNode } from "react";
import { CONTENT, HEIGHT, WIDTH } from "../../lib/frame";
import { notEmpty } from "../../lib/form";
import { useShop, useShopState } from "../../lib/store";
import { defaultTheme } from "../../lib/theme";
import { fit, place, span, type Line } from "../../lib/ui";
import { useBlink, useBusy, useKeys } from "../chrome";
import { Screen } from "../Screen";
import { useForm } from "../useForm";
import { listItem } from "./Cart";

const TOKEN_FORM = [[{ key: "token", title: "personal access token", validate: notEmpty("token") }]];

/**
 * Sign in. The SSH shop identifies you by your ssh key; in the browser you bring a
 * personal access token (`ssh terminal.shop -t tokens`) or sign in through Terminal's
 * OAuth 2.0 server. Styled after the shop's `EmailGateView`.
 */
export function LoginScreen(): ReactNode {
  const store = useShop();
  const env = useShopState((s) => s.env);
  const error = useShopState((s) => s.error);
  const proxy = useShopState((s) => s.proxy);
  const cursor = useBlink();
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
            const url = await store.beginOAuth(window.location.origin);
            window.location.assign(url);
          });
        }
        return true;
    }
    return false;
  });

  const t = defaultTheme;
  const host = env === "dev" ? "dev.terminal.shop" : "terminal.shop";
  const envInfo = proxy?.environments[env];
  const lines: Line[] = [[span("terminal", { fg: "#FFFFFF", bold: true }), span(" ", cursor ? { bg: "#FF5C00" } : {})], [], [t.bold("sign in")], []];
  if (view === "confirm-prod") {
    lines.push(
      [t.error("switch to production?", { bold: true })],
      [],
      [t.base("orders placed in production are real: your card is charged and")],
      [t.base("coffee ships. the dev sandbox uses stripe test cards instead.")],
      [],
      [t.base("are you sure? "), t.accent("(y/n)")],
    );
  } else if (view === "token") {
    lines.push([t.base("paste a personal access token. create one with")], [t.accent(`  ssh ${host} -t tokens`)], []);
    lines.push(...form.lines(CONTENT, 1));
    lines.push([], [t.base(busy ? "signing in..." : "enter to continue · esc to go back · ctrl+c to quit")]);
  } else {
    lines.push([t.base("the ssh shop knows you by your ssh key. here, bring a personal")], [t.base("access token or sign in with the browser.")], []);
    lines.push(...listItem("paste a personal access token", selected === 0, t, CONTENT - 4));
    lines.push(...listItem("sign in with the browser (oauth 2.0)", selected === 1, t, CONTENT - 4));
    lines.push([]);
    lines.push([t.base("environment: "), t.accent(envInfo?.label ?? (env === "dev" ? "dev sandbox" : "production")), t.base(` · ${envInfo?.api.replace(/^https:\/\//, "") ?? host}`)]);
    if (env === "dev") lines.push([t.base("stripe test cards, nothing is charged or shipped")]);
    else lines.push([t.error("real orders, real charges")]);
    lines.push([], [t.base(busy ? "opening sign in..." : "enter to continue · e environment · ctrl+c to quit")]);
  }
  if (error) lines.push([], [t.error(error)]);
  return <Screen lines={place(lines.map((l) => fit(l, CONTENT)), WIDTH, HEIGHT)} />;
}
