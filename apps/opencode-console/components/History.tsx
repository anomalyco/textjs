import { useEffect, useState } from "react";
import { useStore } from "../lib/store";
import { Choices } from "./Choices";
import type { Draft } from "../lib/history";
export function History({ id, close }: { id?: string; close: () => void }) {
  const store = useStore(),
    api = store.api,
    [entries, set] = useState<Draft[]>(() => store.promptHistory.entries.slice().reverse()),
    [cursor, page] = useState<string | undefined>(),
    [next, more] = useState<string | undefined>(),
    [note, report] = useState("");
  useEffect(() => {
    if (!id || !api) return;
    let active = true;
    report("Loading…");
    void (
      api.historyPage
        ? api.historyPage(id, cursor)
        : api.messages(id).then((messages) => ({ messages: messages.reverse(), next: undefined }))
    ).then(
      (r) => {
        if (!active) return;
        set((prev) => {
          const seen = new Set(prev.map((e) => JSON.stringify(e)));
          return [
            ...prev,
            ...r.messages.flatMap((m) => {
              if (m.type !== "user") return [];
              const e = { text: m.text, marks: m.mentions ?? [] },
                k = JSON.stringify(e);
              if (seen.has(k)) return [];
              seen.add(k);
              return [e];
            }),
          ];
        });
        more(r.next !== cursor ? r.next : undefined);
        report("");
      },
      (e) => {
        if (active) report(String(e));
      },
    );
    return () => {
      active = false;
    };
  }, [api, id, cursor]);
  return (
    <Choices
      wide
      title="Prompt history"
      items={[
        ...entries.map((e, i) => ({
          id: String(i),
          label: e.text.replace(/\s+/g, " "),
          hint: e.marks.length ? `${e.marks.length} attachments` : undefined,
        })),
        ...(next ? [{ id: "more", label: "Load earlier messages" }] : []),
      ]}
      choose={(i) => {
        if (i === "more") {
          page(next);
          more(undefined);
        } else {
          const e = entries[Number(i)];
          if (e) {
            store.restore(id ?? "", e.text, undefined, e.marks);
            close();
          }
        }
      }}
      close={close}
      note={note}
    />
  );
}
