import { Button, ButtonProps } from "./button"
import { useRouter } from "../router"
import { RouterContextValue } from "../router/context"

export interface LinkProps extends Omit<ButtonProps, "onClick"> {
  to: Parameters<RouterContextValue["navigate"]>[0]
  params?: Parameters<RouterContextValue["navigate"]>[1]
}

export const Link = (props: LinkProps) => {
  const router = useRouter()
  return (
    <Button
      hintPosition="before"
      {...props}
      className="px-0"
      onClick={() => router.navigate(props.to, props.params)}
    />
  )
}
