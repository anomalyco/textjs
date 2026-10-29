import { startContentRelay, type RelayWindow } from "./content-relay";

startContentRelay(window as unknown as RelayWindow, chrome.runtime);
