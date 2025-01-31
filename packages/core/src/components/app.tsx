import { KeyboardContext, KeyboardManager } from "../keyboard"
import { Router } from "../router"

export default function App({
  keyboardManager,
}: {
  keyboardManager: KeyboardManager
}) {
  return (
    <KeyboardContext.Provider value={keyboardManager}>
      <Router />
    </KeyboardContext.Provider>
  )
}
