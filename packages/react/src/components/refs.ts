import { useCallback, type Ref, type RefObject } from "react";

/** Combine an internal ref object with an optional user ref. */
export function useMergedRef<T>(inner: RefObject<T | null>, outer: Ref<T> | undefined): (node: T | null) => void {
  return useCallback(
    (node: T | null) => {
      inner.current = node;
      if (typeof outer === "function") {
        const cleanup = outer(node);
        if (typeof cleanup === "function") return () => {
          inner.current = null;
          cleanup();
        };
      } else if (outer) (outer as RefObject<T | null>).current = node;
      return undefined;
    },
    [inner, outer],
  );
}
