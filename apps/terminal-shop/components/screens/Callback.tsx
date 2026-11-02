import { useEffect, useRef, type ReactNode } from "react";
import { useRouter, useSearchParams } from "@textjs/app/navigation";
import { errorMessage } from "../../lib/api";
import { useShop, useShopState } from "../../lib/store";
import { defaultTheme } from "../../lib/theme";
import { place } from "../../lib/ui";
import { Screen } from "../Screen";
import { useLayout } from "../chrome";

/** `/auth/callback`: finish the OAuth 2.0 + PKCE sign in, then strip the code from the URL. */
export function CallbackScreen(): ReactNode {
  const store = useShop();
  const router = useRouter();
  const params = useSearchParams();
  const base = useShopState((s) => s.base);
  const done = useRef(false);
  const L = useLayout();

  useEffect(() => {
    if (!base || done.current) return;
    done.current = true;
    const search = new URLSearchParams();
    for (const k of ["code", "state", "error", "error_description"]) {
      const v = params.get(k);
      if (v) search.set(k, v);
    }
    store.completeOAuth(search).then(
      (returnTo) => router.replace(returnTo),
      (error) => {
        router.replace("/login");
        store.showLogin(errorMessage(error));
      },
    );
  }, [base]);

  return <Screen lines={place([[defaultTheme.base("signing in...")]], L.viewportWidth, L.viewportHeight)} />;
}
