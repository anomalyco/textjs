import { useSyncExternalStore } from "react";
import { siteStore, type SiteState } from "./store";

/** Subscribe to the shared site store (works in react-dom and in the console renderer). */
export function useSite(): SiteState {
  return useSyncExternalStore(siteStore.subscribe, siteStore.getSnapshot, siteStore.getSnapshot);
}
