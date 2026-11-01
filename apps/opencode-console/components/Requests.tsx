/** Keyboard and cell layouts from packages/tui/src/routes/session/{permission,form}.tsx. */
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import {
  Box,
  Code,
  Diff,
  ScrollBox,
  Text,
  Textarea,
  useClipboard,
  useFocus,
  useFocusManager,
  useInput,
  usePaste,
  useViewport,
  type ScrollBoxHandle,
} from "@textjs/next";
import {
  formCustom,
  formDisplayValue,
  formInitialValues,
  formLabel,
  formRows,
  formSelected,
  formSetMultiselectCustom,
  formTextual,
  formToggleMultiselect,
  formValidateValue,
} from "../lib/form";
import { useTokens } from "../lib/native-theme";
import { permissionAlwaysLines, permissionOptionLabel, permissionPresentation } from "../lib/permission";
import { useStore, useStoreState } from "../lib/store";
import type { FormAnswer, FormInfo, FormValue, PermissionReply, PermissionRequest } from "../lib/types";

export function KeyHints({ items }: { items: [string, string][] }) {
  const t = useTokens();
  return (
    <Text wrap="nowrap">
      {items.map(([key, label], i) => (
        <Text key={key}>
          <Text color={t.text}>{`${i ? "  " : ""}${key} `}</Text>
          <Text color={t.muted}>{label}</Text>
        </Text>
      ))}
    </Text>
  );
}

function Panel({ children, full, border }: { children: ReactNode; full?: boolean; border?: string }) {
  const t = useTokens();
  return (
    <Box
      flexDirection="column"
      flexShrink={0}
      bg={t.raised}
      border="heavy"
      borderTop={false}
      borderRight={false}
      borderBottom={false}
      borderColor={border ?? t.primaryBgFocused}
      {...(full ? ({ position: "absolute", top: 0, bottom: 0, left: 2, right: 2, zIndex: 4 } as const) : {})}
    >
      {children}
    </Box>
  );
}

export function PermissionPrompt({ request, child }: { request: PermissionRequest; child: boolean }) {
  const store = useStore();
  const t = useTokens(),
    vp = useViewport();
  const [selected, select] = useState(0),
    [full, expand] = useState(false),
    [rejecting, reject] = useState(false),
    [reason, setReason] = useState("");
  const inflight = useRef(false);
  const scroll = useRef<ScrollBoxHandle>(null);
  const [error, fail] = useState("");
  useFocus({ id: `permission:${request.id}`, autoFocus: true, isActive: !rejecting });
  const focus = useFocusManager();
  useLayoutEffect(() => {
    focus.focus(rejecting ? "permission-reason" : `permission:${request.id}`);
  }, [rejecting, request.id]);
  const options: PermissionReply[] = request.save?.length ? ["once", "always", "reject"] : ["once", "reject"];
  const choice = options[selected]!;
  const msg = useStoreState((s) => s.messages[request.sessionID]?.find((m) => m.id === request.source?.messageID));
  const tool = msg?.type === "assistant" && msg.content.find((p) => p.type === "tool" && p.id === request.source?.id);
  const info = tool && tool.type === "tool" && tool.state.status !== "streaming" ? tool.state : undefined;
  const body = permissionPresentation({ ...request, input: info?.input, toolMetadata: info?.metadata });
  const send = (decision: PermissionReply) => {
    if (inflight.current) return;
    if (child && decision === "reject" && !rejecting) {
      reject(true);
      return;
    }
    inflight.current = true;
    void store
      .replyPermission(request, decision, rejecting ? reason : undefined)
      .then((issue) => fail(issue ?? ""))
      .finally(() => {
        inflight.current = false;
      });
  };
  useInput(
    (e) => {
      if (rejecting) {
        if (e.key === "escape") reject(false);
        else if (e.key === "return" && !e.shift && !e.alt && !e.ctrl && !e.meta && !e.repeat) send("reject");
        else return;
      } else if (e.ctrl && e.key === "f") expand(!full);
      else if (e.key === "escape" || (e.ctrl && ["c", "d"].includes(e.key))) {
        if (full) expand(false);
        else if (!e.repeat) send("reject");
      } else if (!e.ctrl && !e.meta && !e.alt && ["left", "h", "right", "l"].includes(e.key))
        select((i) => (i + (["left", "h"].includes(e.key) ? -1 : 1) + options.length) % options.length);
      else if (e.key === "return" && !e.ctrl && !e.meta && !e.alt && !e.shift && !e.repeat) send(choice);
      else if (["pageup", "pagedown", "up", "down"].includes(e.key))
        scroll.current?.scrollBy(
          (e.key === "pageup" || e.key === "up" ? -1 : 1) *
            (e.key.startsWith("page") ? Math.max(1, scroll.current?.node?.layout.contentHeight ?? 1) : 1),
        );
      else if (e.key === "home") scroll.current?.scrollToTop();
      else if (e.key === "end") scroll.current?.scrollToBottom();
      else if (e.ctrl || e.alt || e.meta) return;
      e.stopPropagation();
    },
    { priority: 40 },
  );
  if (rejecting)
    return (
      <Panel border={t.error}>
        <Box flexDirection="column" paddingX={2} paddingY={1} gap={1}>
          <Text>△ Reject permission</Text>
          <Text color={t.muted}>Tell OpenCode what to do differently</Text>
          <Textarea id="permission-reason" autoFocus value={reason} onChange={setReason} />
          <KeyHints
            items={[
              ["enter", "confirm"],
              ["esc", "cancel"],
            ]}
          />
          {error && <Text color={t.error}>{error}</Text>}
        </Box>
      </Panel>
    );
  const lines = choice === "always" ? permissionAlwaysLines(request) : body.lines;
  return (
    <Panel full={full}>
      <Box
        flexDirection="column"
        paddingLeft={2}
        paddingRight={3}
        paddingY={1}
        gap={1}
        flexGrow={full ? 1 : 0}
        flexShrink={1}
        minHeight={0}
      >
        <Box flexDirection="column" flexShrink={0}>
          <Text>
            <Text color={t.warning}>△ </Text>Permission required
          </Text>
          {request.action !== "shell" && <Text>{`  ${body.icon} ${body.title}`}</Text>}
        </Box>
        <ScrollBox ref={scroll} maxHeight={full ? Math.max(1, vp.rows - 9) : 7} showScrollbar={false} focused>
          {choice !== "always" && request.action === "edit" ? (
            body.diff ? (
              <Diff patch={body.diff} />
            ) : body.patch ? (
              <Code code={body.patch} language="diff" />
            ) : (
              <Text color={t.muted}>No diff provided</Text>
            )
          ) : (
            lines.map((line, i) => (
              <Text key={i} color={choice === "always" && i === 0 ? t.muted : t.text}>
                {line}
              </Text>
            ))
          )}
        </ScrollBox>
        {error && <Text color={t.error}>{error}</Text>}
      </Box>
      <Box
        flexDirection={vp.cols < 80 ? "column" : "row"}
        justifyContent="space-between"
        paddingLeft={2}
        paddingRight={3}
        paddingY={1}
        gap={1}
        flexShrink={0}
        bg={t.raisedDown}
      >
        <Box flexDirection="row" gap={1}>
          {options.map((option, i) => (
            <Text
              key={option}
              bg={i === selected ? t.primaryBgFocused : undefined}
              color={i === selected ? t.primaryTextFocused : t.primaryText}
            >{` ${permissionOptionLabel(option)} `}</Text>
          ))}
        </Box>
        <KeyHints
          items={[
            ["ctrl+f", full ? "minimize" : "fullscreen"],
            ["⇆", "select"],
            ["enter", "confirm"],
          ]}
        />
      </Box>
    </Panel>
  );
}

interface Draft {
  tab: number;
  selected: number;
  answers: Record<string, FormValue | undefined>;
  custom: Record<string, string>;
  text: string;
  editing: boolean;
  external: boolean;
}
const drafts = new WeakMap<FormInfo, Draft>();
export function FormPrompt({ form }: { form: FormInfo }) {
  const store = useStore(),
    t = useTokens(),
    vp = useViewport(),
    clipboard = useClipboard();
  const [d, set] = useState<Draft>(() => {
    const values = formInitialValues(form.fields);
    const field = form.fields[0];
    return (
      drafts.get(form) ?? {
        ...values,
        tab: 0,
        selected: formSelected(field, field && values.answers[field.key]),
        text: field ? String(values.answers[field.key] ?? "") : "",
        editing: false,
        external: false,
      }
    );
  });
  const [error, fail] = useState("");
  const lock = useRef(false);
  const review = useRef<ScrollBoxHandle>(null);
  useEffect(() => {
    drafts.set(form, d);
  }, [form, d]);
  const patch = (v: Partial<Draft>) => {
    set((old) => ({ ...old, ...v }));
    fail("");
  };
  const activeFields = (answers: Draft["answers"]) => {
    const seen = new Set<string>();
    return form.fields.filter((f) => {
      const show =
        f.type === "external" ||
        (f.when ?? []).every((w) => {
          const a = answers[w.key];
          return seen.has(w.key) && a !== undefined && (w.op === "eq") === (Array.isArray(a) ? a.includes(String(w.value)) : a === w.value);
        });
      if (show) seen.add(f.key);
      return show;
    });
  };
  const fields = activeFields(d.answers),
    field = fields[d.tab];
  const single = fields.length === 1 && (fields[0]?.type === "boolean" || (fields[0]?.type === "string" && !!fields[0].options));
  const rows = formRows(field),
    multi = field?.type === "multiselect",
    custom = formCustom(field),
    textual = formTextual(field);
  if (multi)
    for (const value of Array.isArray(d.answers[field.key]) ? (d.answers[field.key] as string[]) : []) {
      if (!rows.some((r) => r.value === value) && value !== d.custom[field.key]) rows.push({ label: value, value });
    }
  const total = rows.length + +custom;
  useFocus({ id: `form:${form.id}`, autoFocus: true, isActive: !textual && !d.editing });
  const focus = useFocusManager();
  useLayoutEffect(() => {
    focus.focus(textual || d.editing ? "form-answer" : `form:${form.id}`);
  }, [form.id, field?.key, textual, d.editing]);
  const move = (dir: number, answers = d.answers, customs = d.custom) => {
    const next = activeFields(answers),
      tab = single ? 0 : (d.tab + dir + next.length + 1) % (next.length + 1),
      f = next[tab];
    patch({
      tab,
      answers,
      custom: customs,
      selected: formSelected(f, f && answers[f.key]),
      editing: false,
      external: false,
      text: f ? String(customs[f.key] ?? answers[f.key] ?? "") : "",
    });
  };
  const submit = async (answers?: Draft["answers"]) => {
    if (lock.current) return;
    const result: FormAnswer = Object.create(null);
    if (answers)
      for (const f of activeFields(answers)) {
        const value = answers[f.key];
        const problem =
          f.type === "external" ? value !== true && `External action must be acknowledged: ${formLabel(f)}` : formValidateValue(f, value);
        if (problem) {
          fail(problem);
          return;
        }
        if (value !== undefined) result[f.key] = value;
      }
    lock.current = true;
    try {
      const issue = answers ? await store.replyForm(form, result) : await store.cancelForm(form);
      if (issue) fail(issue);
    } finally {
      lock.current = false;
    }
  };
  const pick = (i: number) => {
    if (!field) return;
    if (custom && i === rows.length) {
      patch({ selected: i, editing: true, text: d.custom[field.key] ?? "" });
      return;
    }
    const row = rows[i];
    if (!row) return;
    const answers = { ...d.answers, [field.key]: multi ? formToggleMultiselect(d.answers[field.key], String(row.value)) : row.value };
    if (multi) patch({ answers, selected: i });
    else if (single) void submit(answers);
    else move(1, answers);
  };
  const commit = (dir: number, nextTab: boolean) => {
    if (!field || field.type === "external") return;
    const text = d.text.trim();
    const value = multi
      ? formSetMultiselectCustom(d.answers[field.key], d.custom[field.key], text)
      : !text
        ? undefined
        : field.type === "integer" || field.type === "number"
          ? Number(text)
          : text;
    const issue = formValidateValue(field, value);
    if (issue) {
      if (dir < 0) move(dir);
      else fail(issue);
      return;
    }
    const answers = { ...d.answers, [field.key]: value },
      customs = { ...d.custom, [field.key]: text };
    if (multi && !nextTab) patch({ answers, custom: customs, editing: false });
    else if (single) void submit(answers);
    else move(dir, answers, customs);
  };
  useInput(
    (e) => {
      const k = e.key;
      if (lock.current || (e.repeat && k === "return")) {
        e.stopPropagation();
        return;
      }
      if (textual || d.editing) {
        if (k === "escape") d.editing ? patch({ editing: false }) : void submit();
        else if ((k === "return" && !e.shift && !e.alt && !e.ctrl) || k === "tab") commit(e.shift ? -1 : 1, k === "tab");
        else if (e.ctrl && k === "c") d.text ? patch({ text: "" }) : void submit();
        else return;
      } else if (k === "escape" || (e.ctrl && ["c", "d"].includes(k))) void submit();
      else if (e.ctrl || e.meta || e.alt) return;
      else if (!field && ["up", "down", "k", "j"].includes(k)) review.current?.scrollBy(k === "up" || k === "k" ? -1 : 1);
      else if (k === "tab" || ["left", "right", "h", "l"].includes(k)) move(e.shift || k === "h" || k === "left" ? -1 : 1);
      else if (!field && k === "return") void submit(d.answers);
      else if (field?.type === "external" && (k === "c" || k === "return")) {
        if (d.external && k === "return") move(1, { ...d.answers, [field.key]: true });
        else if (k === "c") void clipboard.copy(field.url).then((ok) => (ok ? patch({ external: true }) : fail("Could not copy URL")));
        else if (typeof window !== "undefined" && /^https?:\/\//i.test(field.url)) {
          window.open(field.url, "_blank", "noopener,noreferrer");
          patch({ external: true });
        } else {
          patch({ external: true });
          fail("Open the displayed URL manually, then confirm.");
        }
      } else if (total && ["up", "k", "down", "j"].includes(k))
        patch({ selected: (d.selected + (["up", "k"].includes(k) ? -1 : 1) + total) % total });
      else if (total && (k === "return" || (multi && k === "space"))) pick(d.selected);
      else if (/^[1-9]$/.test(k) && +k <= total) pick(+k - 1);
      else if (custom && d.selected === rows.length && e.input && !e.ctrl && !e.meta && !e.alt)
        patch({ editing: true, text: (d.custom[field!.key] ?? "") + e.input });
      e.stopPropagation();
    },
    { priority: 40 },
  );
  usePaste(
    (e) => {
      if (field && custom && !d.editing) {
        e.stopPropagation();
        patch({ selected: rows.length, text: (d.custom[field.key] ?? "") + e.text, editing: true });
      }
    },
    { priority: 40 },
  );
  const hints: [string, string][] = [];
  if (!single) hints.push(["⇆", "tab"]);
  if (field && field.type !== "external" && !textual && !d.editing) hints.push(["↑↓", "select"]);
  hints.push([
    "enter",
    !field || single ? "submit" : field.type === "external" ? (d.external ? "I finished" : "open link") : multi ? "toggle" : "confirm",
  ]);
  if (field?.type === "external") hints.push(["c", "copy"]);
  hints.push(["esc", d.editing ? "close" : "dismiss"]);
  const editor = (
    <Textarea
      key={field?.key}
      id="form-answer"
      value={d.text}
      onChange={(text) => patch({ text })}
      autoFocus
      placeholder={(field?.type === "string" && field.placeholder) || (d.editing ? "Type your own answer" : "Type your answer")}
      maxRows={6}
    />
  );
  return (
    <Panel>
      <Box
        flexDirection="column"
        paddingLeft={2}
        paddingRight={3}
        paddingY={1}
        gap={1}
        maxHeight={Math.max(4, vp.rows - 5)}
        overflow="hidden"
      >
        <Text color={t.muted}>{form.title}</Text>
        {typeof form.metadata?.message === "string" && <Text>{form.metadata.message}</Text>}
        {!single && (
          <Text>
            {fields.map((f, i) => (
              <Text key={f.key} bold={i === d.tab} color={i === d.tab ? t.text : t.muted}>{`${formLabel(f).slice(0, 24)}  `}</Text>
            ))}
            <Text bold={!field}>Submit</Text>
          </Text>
        )}
        {field ? (
          field.type === "external" ? (
            <Text>
              {[
                field.title,
                field.description,
                field.url,
                d.external
                  ? "Complete the external action, then press enter to confirm."
                  : "Open or copy the URL, complete the external action, then confirm.",
              ]
                .filter(Boolean)
                .join("\n")}
            </Text>
          ) : (
            <>
              <Text>{field.description ?? formLabel(field)}</Text>
              {textual ? (
                editor
              ) : (
                <Box flexDirection="column">
                  {rows.map((r, i) => {
                    const a = d.answers[field.key],
                      checked = Array.isArray(a) ? a.includes(String(r.value)) : r.value === a;
                    return (
                      <Box key={i} flexDirection="column">
                        <Text color={i === d.selected ? t.formfieldFocused : t.formfield}>
                          <Text color={i === d.selected ? t.formfieldFocused : t.muted}>{`${i + 1}. `}</Text>
                          {multi ? `[${checked ? "✓" : " "}] ` : ""}
                          {r.label}
                          {checked && !multi ? " ✓" : ""}
                        </Text>
                        {r.description && (
                          <Text paddingLeft={multi ? 7 : 3} color={t.muted}>
                            {r.description}
                          </Text>
                        )}
                      </Box>
                    );
                  })}
                  {custom &&
                    (d.editing ? (
                      editor
                    ) : (
                      <Text
                        color={d.selected === rows.length ? t.formfieldFocused : t.formfield}
                      >{`${rows.length + 1}. ${d.custom[field.key] || "Type your own answer"}`}</Text>
                    ))}
                </Box>
              )}
            </>
          )
        ) : (
          <ScrollBox ref={review} maxHeight={Math.max(3, vp.rows - 14)} focused>
            {fields.map((f) => (
              <Text key={f.key}>
                {formLabel(f)}:{" "}
                {f.type === "external"
                  ? d.answers[f.key]
                    ? "Acknowledged"
                    : "(acknowledgement required)"
                  : (formValidateValue(f, d.answers[f.key]) ?? (formDisplayValue(f, d.answers[f.key], "(none)") || "(not answered)"))}
              </Text>
            ))}
          </ScrollBox>
        )}
      </Box>
      <Box paddingLeft={2} paddingRight={3} paddingBottom={1} flexDirection="row" justifyContent="space-between">
        <KeyHints items={hints} />
        {error && <Text color={t.error}>{error}</Text>}
      </Box>
    </Panel>
  );
}
