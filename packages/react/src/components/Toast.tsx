import { useMemo, useSyncExternalStore, type ReactNode } from "react";
import { useRuntime, type RootRuntime } from "../context";
import { TxBox } from "../host";
import { reconciler } from "../reconciler";
import { useTheme, type TextTheme } from "../theme";
import { Spinner } from "./Spinner";
import { Text } from "./Text";

export type ToastVariant = "default" | "success" | "warning" | "error" | "info" | "loading";

export interface ToastOptions {
  /** Reuse an id to update a toast in place. */
  id?: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
  /** Auto-dismiss after ms (default `4000`; loading toasts stay until updated). `Infinity` keeps it. */
  duration?: number;
}

export interface ToastRecord extends Required<Omit<ToastOptions, "description">> {
  description?: string;
  createdAt: number;
}

type ToastInput = string | ToastOptions;
type VariantFn = (title: string, options?: Omit<ToastOptions, "title" | "variant">) => string;

export interface ToastApi {
  (input: ToastInput): string;
  success: VariantFn;
  error: VariantFn;
  warning: VariantFn;
  info: VariantFn;
  loading: VariantFn;
  /** Dismiss one toast, or all of them. */
  dismiss(id?: string): void;
  /** Show a loading toast that resolves into success / error. */
  promise<T>(
    promise: Promise<T>,
    messages: { loading: string; success: string | ((value: T) => string); error: string | ((error: unknown) => string) },
  ): Promise<T>;
}

let nextToastId = 1;

/** Per-root toast queue. */
export class ToastStore {
  private toasts: readonly ToastRecord[] = [];
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly listeners = new Set<() => void>();

  readonly subscribe = (l: () => void): (() => void) => {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  };

  readonly getSnapshot = (): readonly ToastRecord[] => this.toasts;

  private emit(): void {
    for (const l of this.listeners) l();
  }

  show(input: ToastInput): string {
    const o: ToastOptions = typeof input === "string" ? { title: input } : input;
    const id = o.id ?? `toast-${nextToastId++}`;
    const variant = o.variant ?? "default";
    const duration = o.duration ?? (variant === "loading" ? Infinity : 4000);
    const existing = this.toasts.find((t) => t.id === id);
    const record: ToastRecord = { id, title: o.title, description: o.description, variant, duration, createdAt: existing?.createdAt ?? Date.now() };
    this.toasts = existing ? this.toasts.map((t) => (t.id === id ? record : t)) : [...this.toasts, record];
    const old = this.timers.get(id);
    if (old !== undefined) clearTimeout(old);
    this.timers.delete(id);
    if (Number.isFinite(duration)) this.timers.set(id, setTimeout(() => this.dismiss(id), duration));
    this.emit();
    return id;
  }

  dismiss(id?: string): void {
    const ids = id === undefined ? this.toasts.map((t) => t.id) : [id];
    for (const i of ids) {
      const t = this.timers.get(i);
      if (t !== undefined) clearTimeout(t);
      this.timers.delete(i);
    }
    const next = id === undefined ? [] : this.toasts.filter((t) => t.id !== id);
    if (next.length === this.toasts.length) return;
    this.toasts = next;
    this.emit();
  }
}

const stores = new WeakMap<RootRuntime, ToastStore>();

function storeFor(rt: RootRuntime): ToastStore {
  let s = stores.get(rt);
  if (!s) {
    s = new ToastStore();
    stores.set(rt, s);
  }
  return s;
}

/** Imperative toasts for the current root. Render one `<Toaster />` anywhere to display them. */
export function useToast(): ToastApi {
  const rt = useRuntime();
  return useMemo(() => {
    const store = storeFor(rt);
    const variant =
      (v: ToastVariant): VariantFn =>
      (title, options = {}) =>
        store.show({ ...options, title, variant: v });
    const api = ((input: ToastInput) => store.show(input)) as ToastApi;
    api.success = variant("success");
    api.error = variant("error");
    api.warning = variant("warning");
    api.info = variant("info");
    api.loading = variant("loading");
    api.dismiss = (id) => store.dismiss(id);
    api.promise = async (promise, messages) => {
      const id = store.show({ title: messages.loading, variant: "loading" });
      try {
        const value = await promise;
        store.show({ id, title: typeof messages.success === "function" ? messages.success(value) : messages.success, variant: "success" });
        return value;
      } catch (error) {
        store.show({ id, title: typeof messages.error === "function" ? messages.error(error) : messages.error, variant: "error" });
        throw error;
      }
    };
    return api;
  }, [rt]);
}

export type ToasterPosition = "top-left" | "top-center" | "top-right" | "bottom-left" | "bottom-center" | "bottom-right";

export interface ToasterProps {
  position?: ToasterPosition;
  /** Most toasts shown at once (default `3`); older ones wait. */
  max?: number;
  /** Toast width in cells (default `36`). */
  width?: number;
  zIndex?: number;
}

const ICONS: Record<Exclude<ToastVariant, "loading">, string> = {
  default: "•",
  success: "✓",
  warning: "!",
  error: "✕",
  info: "i",
};

function iconColor(theme: TextTheme, v: ToastVariant): string {
  return v === "success" ? theme.success : v === "warning" ? theme.warning : v === "error" ? theme.danger : v === "info" ? theme.info : theme.accent;
}

/** Renders toasts from `useToast()` in a corner, above modals. */
export function Toaster({ position = "bottom-right", max = 3, width = 36, zIndex = 60 }: ToasterProps): ReactNode {
  const rt = useRuntime();
  const theme = useTheme();
  const store = storeFor(rt);
  const toasts = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  if (toasts.length === 0) return null;
  const top = position.startsWith("top");
  const shown = toasts.slice(-max);
  const ordered = top ? [...shown].reverse() : shown;
  const align = position.endsWith("left") ? "flex-start" : position.endsWith("center") ? "center" : "flex-end";
  const layer = (
    <TxBox
      position="absolute"
      top={0}
      left={0}
      right={0}
      bottom={0}
      zIndex={zIndex}
      flexDirection="column"
      justifyContent={top ? "flex-start" : "flex-end"}
      alignItems={align}
      paddingX={2}
      paddingY={1}
      rowGap={0}
      wireframeLabel="toaster"
    >
      {ordered.map((t) => (
        <TxBox
          key={t.id}
          flexDirection="column"
          width={width}
          flexShrink={0}
          border="rounded"
          borderColor={theme.border}
          bg={theme.elevated}
          paddingX={1}
        >
          <TxBox flexDirection="row" height={1} flexShrink={0}>
            {t.variant === "loading" ? (
              <Spinner color={theme.accent} />
            ) : (
              <Text color={iconColor(theme, t.variant)} bold wrap="nowrap" flexShrink={0}>
                {ICONS[t.variant]}
              </Text>
            )}
            <Text color={theme.fg} bold wrap="truncate-end" flexGrow={1} flexShrink={1}>
              {` ${t.title}`}
            </Text>
          </TxBox>
          {t.description ? (
            <Text color={theme.muted} wrap="wrap" paddingLeft={2}>
              {t.description}
            </Text>
          ) : null}
        </TxBox>
      ))}
    </TxBox>
  );
  return reconciler.createPortal(layer, rt.container, null, null) as ReactNode;
}
