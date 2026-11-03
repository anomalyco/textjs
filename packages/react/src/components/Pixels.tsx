import { useCallback, type ReactNode } from "react";
import type { CellBuffer, ComputedRect, LayoutProps, PackedColor } from "@textjs/core";
import {
  drawPixels,
  type PixelFit,
  type PixelRenderMode,
  type PixelSample,
  type PixelSource,
} from "@textjs/core/experimental";
import { TxBox } from "../host";

export interface PixelsProps extends Omit<LayoutProps, "width" | "height"> {
  source: PixelSource;
  /** Bump to repaint after writing new pixels into `source.data` (the array is read in place). */
  frame: number;
  /** Width in cells (default: fill the box). */
  width?: number;
  /** Height in rows. */
  height?: number;
  /** `"contain"` (default) letterboxes at the source aspect, `"fill"` stretches. */
  fit?: PixelFit;
  /** Width ÷ height of one source pixel as displayed (Doom's 320×200 is shown at 4:3, so each pixel is 1.2× taller than wide: `5 / 6`). */
  pixelAspect?: number;
  /**
   * Snap every pixel to the nearest of these packed colors. Shrinks indexed-PNG payloads in sprite
   * mode and produces longer `%c` runs in half-block mode.
   */
  palette?: readonly PackedColor[];
  /** Sampling filter for half-block fallback (`"nearest"` default, or `"average"` box filter). */
  sample?: PixelSample;
  /**
   * `"auto"` (default) renders a full-resolution pixelated sprite where supported (Chromium, and
   * Firefox per its console's style rules (not benchmarked)) and falls back to `▀` half-blocks in
   * Safari, ANSI terminals and plain-text exports. Pass `"halfblock"` to pin half-block cells everywhere.
   */
  renderMode?: PixelRenderMode;
}

/** A live pixel framebuffer (games, emulators, video, shaders). Static images belong in `<Image>`. */
export function Pixels({
  source,
  frame,
  width,
  height,
  fit = "contain",
  pixelAspect = 1,
  palette,
  sample = "nearest",
  renderMode = "auto",
  ...layout
}: PixelsProps): ReactNode {
  // `frame` is a dependency so a new frame is a new paint function, which damages the box.
  const paint = useCallback(
    (buf: CellBuffer, r: Readonly<ComputedRect>) => {
      drawPixels(buf, {
        x: r.contentX,
        y: r.contentY,
        width: r.contentWidth,
        height: r.contentHeight,
        source,
        fit,
        pixelAspect,
        palette,
        sample,
        renderMode,
      });
    },
    [source, frame, fit, pixelAspect, palette, sample, renderMode],
  );
  return <TxBox width={width} height={height} flexGrow={width === undefined ? 1 : 0} flexShrink={width === undefined ? 1 : 0} minWidth={1} minHeight={1} {...layout} customPaint={paint} />;
}
