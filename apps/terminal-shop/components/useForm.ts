import { useRef, useState } from "react";
import { usePaste } from "@textjs/app";
import { formKey, formLines, initForm, insert, type FieldDef, type FormState } from "../lib/form";
import { isPrintable, useKeys } from "../lib/keys";
import { useShop } from "../lib/store";
import type { Line } from "../lib/ui";
import { useBlink } from "./chrome";

export interface UseFormOptions {
  groups: FieldDef[][];
  initial?: Record<string, string>;
  active: boolean;
  onSubmit: (values: Record<string, string>) => void;
  /** Keys handled before the form (e.g. `esc`); return `true` to consume. */
  onKey?: (key: string) => boolean;
  masked?: string[];
}

export function useForm(opts: UseFormOptions): { state: FormState; reset: (values?: Record<string, string>) => void; lines: (width: number, columns?: number) => Line[] } {
  const store = useShop();
  const [state, setState] = useState<FormState>(() => initForm(opts.groups, opts.initial));
  const ref = useRef(state);
  ref.current = state;
  const cursorOn = useBlink(530);

  useKeys(
    (key, e) => {
      if (opts.onKey?.(key)) return true;
      if (key === "esc" || key === "ctrl+c") return false;
      const { state: next, event } = formKey(opts.groups, ref.current, key, isPrintable(e) ? e.input : "");
      ref.current = next;
      setState(next);
      if (event.type === "error") store.setError(event.message);
      else if (event.type === "submit") {
        store.setError(null);
        opts.onSubmit(event.values);
      }
      return true;
    },
    { priority: 10, isActive: opts.active },
  );

  usePaste(
    (e) => {
      const next = insert(ref.current, opts.groups, e.text.trim());
      ref.current = next;
      setState(next);
      e.stopPropagation();
    },
    { priority: 10, isActive: opts.active },
  );

  return {
    state,
    reset: (values) => {
      const next = initForm(opts.groups, values ?? opts.initial);
      ref.current = next;
      setState(next);
    },
    lines: (width, columns) => formLines(opts.groups, state, cursorOn, width, columns, { masked: opts.masked }),
  };
}
