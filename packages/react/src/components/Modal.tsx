import { useContext, useLayoutEffect, useMemo, useRef, type ReactNode } from "react";
import type { Dimension, Length, SceneNodeProps } from "@textjs/core";
import { createScope, ScopeContext, useRuntime } from "../context";
import { mergeStyleProps, TxBox } from "../host";
import { reconciler } from "../reconciler";
import { useTheme } from "../theme";

export interface ModalProps {
  /** Render the modal (default `true`); unmounting also closes it. */
  open?: boolean;
  title?: string;
  /** Bottom border caption (default `"esc close"` when `onClose` is set). */
  footer?: string;
  width?: Dimension;
  height?: Dimension;
  maxWidth?: Length;
  maxHeight?: Length;
  /** Called on Escape. */
  onClose?: () => void;
  closeOnEscape?: boolean;
  /** Backdrop dim strength 0..1 (default `0.68`). */
  backdropDim?: number;
  zIndex?: number;
  /** Render in place instead of portaling to the root layer. */
  inline?: boolean;
  className?: string;
  style?: Partial<SceneNodeProps>;
  children?: ReactNode;
}

/**
 * Centered overlay that dims everything beneath it and traps focus + input:
 * while open, `useInput` handlers and Tab order outside the modal are inert.
 */
export function Modal({
  open = true,
  title,
  footer,
  width = "60%",
  height,
  maxWidth,
  maxHeight = "90%",
  onClose,
  closeOnEscape = true,
  backdropDim = 0.68,
  zIndex = 50,
  inline = false,
  className,
  style,
  children,
}: ModalProps): ReactNode {
  if (!open) return null;
  return (
    <ModalLayer
      title={title}
      footer={footer}
      width={width}
      height={height}
      maxWidth={maxWidth}
      maxHeight={maxHeight}
      onClose={onClose}
      closeOnEscape={closeOnEscape}
      backdropDim={backdropDim}
      zIndex={zIndex}
      inline={inline}
      className={className}
      style={style}
    >
      {children}
    </ModalLayer>
  );
}

function ModalLayer(props: Omit<ModalProps, "open">): ReactNode {
  const { title, footer, width, height, maxWidth, maxHeight, onClose, closeOnEscape, backdropDim, zIndex, inline, className, style, children } = props;
  const rt = useRuntime();
  const theme = useTheme();
  const parent = useContext(ScopeContext);
  const scope = useMemo(() => createScope(parent, true), [parent]);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useLayoutEffect(() => rt.focus.pushTrap(scope), [rt, scope]);

  useLayoutEffect(() => {
    if (!closeOnEscape) return;
    return rt.input.register(
      "key",
      (e) => {
        if (e.key === "escape" && onCloseRef.current) {
          e.stopPropagation();
          onCloseRef.current();
        }
      },
      { scope, priority: -1 },
    );
  }, [rt, scope, closeOnEscape]);

  const panel = mergeStyleProps(theme, className, style, {
    flexDirection: "column",
    width,
    height,
    maxWidth,
    maxHeight,
    border: "rounded",
    borderColor: theme.borderFocus,
    bg: theme.elevated,
    fg: theme.fg,
    paddingX: 2,
    paddingY: 1,
    title,
    titleColor: theme.fg,
    bottomTitle: footer ?? (onClose ? "esc close" : undefined),
    bottomTitleColor: theme.subtle,
    bottomTitleAlign: "right",
    overflow: "hidden",
  });

  const layer = (
    <ScopeContext value={scope}>
      <TxBox
        position="absolute"
        top={0}
        left={0}
        right={0}
        bottom={0}
        zIndex={zIndex}
        backdropDim={backdropDim}
        alignItems="center"
        justifyContent="center"
        flexDirection="column"
        wireframeLabel="modal"
      >
        <TxBox {...panel}>{children}</TxBox>
      </TxBox>
    </ScopeContext>
  );
  if (inline) return layer;
  return reconciler.createPortal(layer, rt.container, null, null) as ReactNode;
}
