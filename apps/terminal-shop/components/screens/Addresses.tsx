import { useRef, useState, type ReactNode } from "react";
import { useSearchParams } from "@textjs/app/navigation";
import { ADDRESS_FORM, addressFromValues, addressValues, newAddressValues, validateAddress } from "../../lib/address";
import { CONTENT, type Command } from "../../lib/frame";
import { useShop, useShopState } from "../../lib/store";
import { indent, viewport, type Line } from "../../lib/ui";
import { Page, useHeaderMode, useKeys, useNav } from "../chrome";
import { useForm } from "../useForm";
import { listBox, listItem } from "./Cart";
import { addressItem } from "./Checkout";

/** `AddressBookView`: manage saved addresses, or pick one for a subscription. */
export function AddressesScreen(): ReactNode {
  const store = useShop();
  const nav = useNav();
  const params = useSearchParams();
  const subscriptionID = params.get("subscription");
  const addresses = useShopState((s) => s.addresses);
  const user = useShopState((s) => s.user);
  const [view, setView] = useState<"list" | "form">("list");
  const [mode, setMode] = useState<"add" | "edit">("add");
  const [editingID, setEditingID] = useState("");
  const [selected, setSelected] = useState(() => {
    const sub = store.s.subscriptions.find((x) => x.id === subscriptionID);
    return Math.max(0, store.s.addresses.findIndex((a) => a.id === sub?.addressID));
  });
  const [deleting, setDeleting] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState<"" | "saving" | "removing" | "updating">("");
  const [notice, setNotice] = useState("");
  const offset = useRef(0);
  useHeaderMode("addresses", view === "list" && !submitting);

  const back = (): void => {
    if (subscriptionID) nav(`/account?subscription=${encodeURIComponent(subscriptionID)}`);
    else nav("/account?page=addresses");
  };

  const changed = (selectedID: string | null, message: string): void => {
    const list = store.s.addresses;
    const i = selectedID ? list.findIndex((a) => a.id === selectedID) : -1;
    setSelected(i >= 0 ? i : Math.max(0, Math.min(selected, list.length - 1)));
    setView("list");
    setDeleting(null);
    setSubmitting("");
    setNotice(message);
  };

  const form = useForm({
    groups: ADDRESS_FORM,
    active: view === "form" && !submitting,
    onKey: (key) => {
      if (key !== "esc") return false;
      setView("list");
      return true;
    },
    onSubmit: (values) => {
      const input = addressFromValues(values);
      const invalid = validateAddress(input);
      if (invalid) {
        store.setError(invalid);
        return;
      }
      setSubmitting("saving");
      const done =
        mode === "add" ? store.addAddress(input).then((id) => changed(id, "address added")) : store.updateAddress(editingID, input).then((a) => changed(a.id, "address updated"));
      done.catch((e) => {
        store.fail(e);
        setSubmitting("");
      });
    },
  });

  useKeys((key) => {
    if (view !== "list") return false;
    if (submitting) return true;
    switch (key) {
      case "j":
      case "down":
      case "tab":
        if (deleting === null) setSelected((s) => Math.max(0, Math.min(addresses.length - 1, s + 1)));
        return true;
      case "k":
      case "up":
      case "shift+tab":
        if (deleting === null) setSelected((s) => Math.max(0, s - 1));
        return true;
      case "n":
        if (deleting !== null) {
          setDeleting(null);
          return true;
        }
        setMode("add");
        setEditingID("");
        setNotice("");
        form.reset(newAddressValues(user?.name));
        setView("form");
        return true;
      case "enter": {
        const a = addresses[selected];
        if (deleting !== null || !subscriptionID || !a) return true;
        setSubmitting("updating");
        store
          .updateSubscription(subscriptionID, { addressID: a.id })
          .then(() => nav(`/account?subscription=${encodeURIComponent(subscriptionID)}&notice=${encodeURIComponent("shipping address updated")}`))
          .catch((e) => {
            store.fail(e);
            setSubmitting("");
          });
        return true;
      }
      case "e": {
        const a = addresses[selected];
        if (deleting !== null || !a) return true;
        setMode("edit");
        setEditingID(a.id);
        setNotice("");
        form.reset(addressValues(a));
        setView("form");
        return true;
      }
      case "delete":
      case "d":
      case "x":
        if (!subscriptionID && deleting === null && selected < addresses.length) setDeleting(selected);
        return true;
      case "y": {
        const a = deleting !== null ? addresses[deleting] : undefined;
        if (!a) return true;
        setSubmitting("removing");
        store
          .deleteAddress(a.id)
          .then(() => changed(null, "address removed"))
          .catch((e) => {
            store.fail(e);
            setSubmitting("");
          });
        return true;
      }
      case "esc":
      case "left":
      case "h":
        if (deleting !== null) setDeleting(null);
        else back();
        return true;
    }
    return false;
  });

  let commands: Command[];
  if (submitting) commands = [{ key: "…", value: submitting }];
  else if (view === "form") commands = [{ key: "esc", value: "cancel" }, { key: "enter", value: mode === "add" ? "add" : "save" }];
  else if (subscriptionID)
    commands = [{ key: "esc", value: "back" }, { key: "↑/↓", value: "addresses" }, { key: "enter", value: "select" }, { key: "e", value: "edit" }, { key: "n", value: "add" }];
  else commands = [{ key: "esc", value: "back" }, { key: "↑/↓", value: "addresses" }, { key: "e", value: "edit" }, { key: "n", value: "add" }, { key: "x/del", value: "remove" }];

  return (
    <Page
      page="addresses"
      commands={commands}
      body={(h, t) => {
        if (submitting === "saving") return indent([[t.base("  saving address...")]], 1);
        if (view === "form") return indent(viewport([[t.base(mode === "edit" ? " edit address" : " add address")], ...form.lines(CONTENT)], h), 1);
        const ls: Line[] = [[t.base(" saved addresses")]];
        if (notice) ls.push([t.brand(` ${notice}`)]);
        if (addresses.length === 0) {
          ls.push([], [t.base("no saved addresses")], [t.base("press n to add one")]);
          return indent(ls, 1);
        }
        addresses.forEach((a, i) => {
          const content = deleting === i ? listItem([[t.accent("remove this address?"), t.base(" (y/n)")]], true, t) : addressItem(a, i === selected, t);
          ls.push(...listBox(content, i === selected, t));
        });
        const top = selected * 4;
        if (top < offset.current) offset.current = top;
        if (top + 4 > offset.current + h) offset.current = top - h + 4 + 1;
        return indent(viewport(ls, h, offset.current), 1);
      }}
    />
  );
}
