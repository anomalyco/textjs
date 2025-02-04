import { Textjs } from "./textjs"
import { handleHMRUpdate } from "./hmr"

const app = new Textjs()
app.render()

if (import.meta.hot) {
  import.meta.hot.on("vite:afterUpdate", async () => {
    await handleHMRUpdate()
    await app.render()
  })
}
