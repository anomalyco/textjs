import { useContext } from "react"
import { RouterContext, RouterContextValue } from "./context"

export function useRouter() {
  const ctx = useContext(RouterContext)
  if (!ctx) throw new Error("useRouter must be used within Router")
  return ctx as RouterContextValue
}
