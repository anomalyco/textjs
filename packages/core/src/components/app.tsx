import { createKeyboardManager, KeyboardContext } from "../keyboard"
import { Router } from "../router"

const keyboardManager = createKeyboardManager()

export default function App() {
  return (
    <KeyboardContext.Provider value={keyboardManager}>
      <Router />
    </KeyboardContext.Provider>
  )
}
