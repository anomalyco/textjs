/**
 * Blanks for the design-round option boards (merch/options/). Same studio style and cache as
 * scripts/photos.ts; blanks the store already uses are reused from there.
 *
 *   set -a; . ~/.config/textjs/openai.env; set +a
 *   bun scripts/options-blanks.ts [low|high] [id…]
 */
import { existsSync } from "node:fs";
import { cachedPath, generate, type Quality, type Request } from "./imagegen";
import { basePath, STYLE } from "./photos";

export interface OptionBase {
  id: string;
  size: Request["size"];
  prompt: string;
  /** A blank (store or options) this one edits, for the same garment from another side. */
  from?: string;
}

export const OPTION_BASES: OptionBase[] = [
  {
    id: "hoodie-back",
    size: "1024x1536",
    from: "hoodie-flat",
    prompt: "The same black hoodie, turned over to show its back, laid flat in the same position on the same black backdrop with the hood laid flat above the shoulders, photographed from directly above with identical lighting and framing. Completely blank: no text, no logos, no prints, no labels.",
  },
  {
    id: "tee-front-sleeves-down",
    size: "1024x1536",
    from: "tee-front",
    prompt: "Photograph edit. The same black t-shirt laid flat in the same place, with the same body, collar, hem, folds, lighting and framing, but both short sleeves are folded down so they hang alongside the body at a steep angle, pointing mostly downward like arms at the sides, each sleeve about 20 degrees out from vertical, the hem of each sleeve clearly visible. The backdrop stays the same matte black. Completely blank: no text, no logos, no prints, no labels.",
  },
  {
    id: "cap-stone",
    size: "1024x1536",
    from: "cap-front-2",
    prompt: "The same dad cap in the same position, pose, framing and lighting, recolored to stone: a light warm off-white natural cotton twill, with the same seams, stitching, eyelets and brim. The backdrop stays the same matte black. Completely blank: no text, no logos, no embroidery, no labels.",
  },
  {
    id: "sticker-laptop-close",
    size: "1024x1536",
    prompt: `Close-up of the closed lid of a space black aluminum laptop, photographed from directly above, straight on. The lid fills the whole frame except for its rounded front right corner at the lower right, where a little of the black backdrop shows. About 7 inches of the lid is visible across the frame. Smooth matte anodized aluminum with a very fine texture, a soft diagonal highlight from the softbox at the upper left, no logo. ${STYLE}`,
  },
  {
    id: "sticker-hand",
    size: "1024x1536",
    prompt: `Close-up of a hand holding a single blank white vinyl sticker with rounded corners between thumb and index finger, against the black backdrop. The sticker is a plain white rounded rectangle about 3 inches wide and 1 inch tall, held flat and facing the camera, with a slight soft sheen. Natural skin, short clean nails. ${STYLE}`,
  },
  {
    id: "sticker-bottle",
    size: "1024x1536",
    prompt: `A matte black stainless steel water bottle standing upright on the backdrop, photographed straight on at eye level, the bottle centered and filling most of the frame's height, smooth powder-coated surface with a soft vertical highlight. ${STYLE}`,
  },
];

export function optionBasePath(id: string, quality: Quality = "high"): string {
  const own = OPTION_BASES.find((b) => b.id === id);
  if (!own) return basePath(id, quality);
  return cachedPath(request(own, quality));
}

function request(b: OptionBase, quality: Quality): Request {
  return { prompt: b.prompt, size: b.size, quality, refs: b.from ? [optionBasePath(b.from, OPTION_BASES.some((o) => o.id === b.from) ? quality : "high")] : undefined };
}

if (import.meta.main) {
  const [q = "low", ...only] = process.argv.slice(2) as [Quality, ...string[]];
  const pending = OPTION_BASES.filter((b) => !only.length || only.includes(b.id));
  for (const b of pending.filter((x) => !x.from || !OPTION_BASES.some((o) => o.id === x.from))) await generate(request(b, q), b.id);
  for (const b of pending.filter((x) => x.from && OPTION_BASES.some((o) => o.id === x.from))) await generate(request(b, q), b.id);
  for (const b of pending) console.log(`${b.id}: ${optionBasePath(b.id, q)}${existsSync(optionBasePath(b.id, q)) ? "" : " (missing)"}`);
}

