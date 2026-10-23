import { startPageBridge, type BridgeWindow } from "./page-bridge";

startPageBridge(window as unknown as BridgeWindow);
