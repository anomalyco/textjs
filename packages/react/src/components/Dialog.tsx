import { useState, type ReactNode } from "react";
import type { Dimension } from "@textjs/core";
import { useInput } from "../hooks";
import { useTheme } from "../theme";
import { Box } from "./Box";
import { Button } from "./controls";
import { Modal } from "./Modal";
import { Text } from "./Text";

export interface DialogProps {
  open?: boolean;
  title?: string;
  /** Muted text under the title. */
  description?: ReactNode;
  /** Right-aligned row under the body, usually `<Button>`s. */
  actions?: ReactNode;
  onClose?: () => void;
  width?: Dimension;
  children?: ReactNode;
}

/** A `<Modal>` with a description and an actions row. */
export function Dialog({ open = true, title, description, actions, onClose, width = 56, children }: DialogProps): ReactNode {
  const theme = useTheme();
  return (
    <Modal open={open} title={title} onClose={onClose} width={width}>
      <Box flexDirection="column" rowGap={1} flexShrink={0}>
        {description !== undefined ? <Text color={theme.muted}>{description}</Text> : null}
        {children}
        {actions !== undefined ? (
          <Box flexDirection="row" justifyContent="flex-end" columnGap={1} flexShrink={0}>
            {actions}
          </Box>
        ) : null}
      </Box>
    </Modal>
  );
}

export interface ConfirmProps {
  open?: boolean;
  title?: string;
  message?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Style the confirm button as dangerous and focus Cancel first. */
  destructive?: boolean;
  onConfirm?: () => void;
  onCancel?: () => void;
  width?: Dimension;
}

/** A yes / no dialog: ←/→ or Tab move between buttons, `y` / `n` answer directly, Esc cancels. */
export function Confirm({ open = true, ...props }: ConfirmProps): ReactNode {
  if (!open) return null;
  return <ConfirmLayer {...props} />;
}

function ConfirmLayer({
  title = "Are you sure?",
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  onConfirm,
  onCancel,
  width = 52,
}: Omit<ConfirmProps, "open">): ReactNode {
  const theme = useTheme();
  const [choice, setChoice] = useState<"confirm" | "cancel">(destructive ? "cancel" : "confirm");
  return (
    <Modal title={title} onClose={onCancel} width={width} footer="y / n">
      <ConfirmKeys choice={choice} setChoice={setChoice} onConfirm={onConfirm} onCancel={onCancel} />
      <Box flexDirection="column" rowGap={1} flexShrink={0}>
        {message !== undefined ? <Text color={theme.muted}>{message}</Text> : null}
        <Box flexDirection="row" justifyContent="flex-end" columnGap={1} flexShrink={0}>
          <Button focused={choice === "cancel"} variant="ghost" onPress={onCancel}>
            {cancelLabel}
          </Button>
          <Button focused={choice === "confirm"} variant={destructive ? "danger" : "primary"} onPress={onConfirm}>
            {confirmLabel}
          </Button>
        </Box>
      </Box>
    </Modal>
  );
}

function ConfirmKeys({
  choice,
  setChoice,
  onConfirm,
  onCancel,
}: {
  choice: "confirm" | "cancel";
  setChoice: (c: "confirm" | "cancel") => void;
  onConfirm?: () => void;
  onCancel?: () => void;
}): ReactNode {
  useInput((e) => {
    if (e.key === "left" || e.key === "right" || e.key === "tab" || e.key === "h" || e.key === "l") {
      setChoice(choice === "confirm" ? "cancel" : "confirm");
      e.stopPropagation();
    } else if (e.key === "y" && !e.ctrl && !e.meta) {
      e.stopPropagation();
      onConfirm?.();
    } else if (e.key === "n" && !e.ctrl && !e.meta) {
      e.stopPropagation();
      onCancel?.();
    }
  });
  return null;
}
