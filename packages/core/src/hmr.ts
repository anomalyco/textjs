import { reconciler } from "./reconciler"

export async function handleHMRUpdate() {
  // Tell React reconciler to check for updates
  reconciler.injectIntoDevTools({
    bundleType: 1,
    version: "1.0.0",
    rendererPackageName: "textjs",
  })
}
