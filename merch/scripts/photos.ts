/**
 * Product photography for the store. Stage one asks the image model for blank products (no text
 * or marks, which image models garble); stage two composites the real artwork onto them with
 * scripts/composite.ts. Prompts are fixed strings and outputs are cached by content hash in
 * photos/cache/, so a re-run only calls the API for prompts that changed.
 *
 *   set -a; . ~/.config/textjs/openai.env; set +a
 *   bun scripts/photos.ts bases [low|high]    # generate (or reuse) every blank
 *   bun scripts/photos.ts render [shot…]      # composite, write masters and site images
 *   bun scripts/photos.ts pin                 # copy the blanks and edits in use to photos/blanks/ (committed)
 */
import { existsSync, mkdirSync, rmSync, symlinkSync } from "node:fs";
import { join } from "node:path";
import { cachedPath, generate, type Quality, type Request } from "./imagegen";

export const STYLE =
  "Professional e-commerce studio product photograph for a minimalist premium apparel brand. Seamless matte black paper backdrop with soft, even falloff, a large overhead softbox from the upper left, a subtle rim light and a natural soft contact shadow. Medium format camera, sharp focus, true-to-life texture and color. Generous negative space around the product. The product is completely blank: no text, no letters, no logos, no prints, no embroidery, no labels, no tags, no graphics, no watermark.";

const MACRO =
  "Macro product photograph, shallow depth of field falling off at the edges, soft raking light from the upper left, true-to-life texture and color. Completely blank: no text, no letters, no logos, no prints, no labels, no graphics, no watermark.";

export interface Base {
  id: string;
  prompt: string;
  size: Request["size"];
  /** Another base this one edits (same garment, new angle), for consistency. */
  from?: string;
  seed?: number;
}

export const BASES: Base[] = [
  {
    id: "tee-front",
    size: "1024x1536",
    prompt: `A heavyweight garment-dyed black cotton crew neck t-shirt, boxy relaxed fit, short sleeves, high ribbed collar, laid flat and neatly arranged on the backdrop, photographed from directly above, natural soft folds. ${STYLE}`,
  },
  {
    id: "tee-back",
    size: "1024x1536",
    from: "tee-front",
    prompt: "The same black t-shirt, turned over to show its back, laid flat on the same black backdrop, photographed from directly above with identical lighting. The back neckline sits higher than the front. Completely blank: no text, no logos, no prints, no labels.",
  },
  {
    id: "tee-pair",
    size: "1024x1536",
    prompt: `Two identical heavyweight black cotton crew neck t-shirts laid flat on the backdrop, photographed from directly above. One shows its back and sits toward the upper right; the other shows its front and sits toward the lower left, overlapping the first. Boxy relaxed fit, short sleeves, high ribbed collars, natural soft folds. ${STYLE}`,
  },
  {
    id: "tee-detail",
    size: "1024x1536",
    prompt: `Close-up of the upper back of a black heavyweight garment-dyed cotton t-shirt laid flat, the fabric fills the whole frame, the ribbed back collar runs along the top edge, visible jersey knit texture and a few gentle folds. ${MACRO}`,
  },
  {
    id: "tee-label",
    size: "1024x1536",
    prompt: `Close-up from directly above of the collar of a black heavyweight cotton t-shirt laid flat. The front of the shirt is folded down and away so the inside of the back neck panel is visible: a smooth, flat area of plain black jersey directly below the ribbed collar and its neat double-needle seam. That area is blank, with no label and no tag. ${MACRO}`,
  },
  {
    id: "hoodie-front",
    size: "1024x1536",
    prompt: `A heavyweight black cotton fleece pullover hoodie, ghost mannequin product photo, front view. The hood is up and holds its shape on an invisible head, its opening facing forward and showing the dark lining inside, with a center seam over the crown. Kangaroo pocket, ribbed cuffs and hem, dropped shoulders, relaxed fit, no drawstrings. ${STYLE}`,
  },
  {
    id: "hoodie-flat",
    size: "1024x1536",
    prompt: `A heavyweight black cotton fleece pullover hoodie laid flat on the backdrop and photographed from directly above, the hood laid flat above the shoulders, sleeves folded neatly at the sides, kangaroo pocket, ribbed cuffs and hem, no drawstrings, natural soft folds. ${STYLE}`,
  },
  {
    id: "fleece-macro",
    size: "1024x1536",
    prompt: `Close-up of the chest of a black heavyweight cotton fleece sweatshirt, the smooth knit face of the fabric fills the frame with a soft fold near the bottom. ${MACRO}`,
  },
  {
    id: "stitch-texture",
    size: "1024x1024",
    prompt: "Macro photograph of a solid area of black satin-stitch machine embroidery: tightly packed parallel glossy polyester thread stitches running diagonally, filling the entire frame edge to edge with no border, no shape and no background, evenly lit from the upper left. No text.",
  },
  {
    id: "cap-front",
    size: "1024x1536",
    prompt: `A black unstructured six-panel cotton chino twill dad cap with a low profile crown and a pre-curved brim, three-quarter front view from the left, resting on the backdrop, front panels smooth and blank. ${STYLE}`,
  },
  {
    id: "cap-front-2",
    size: "1024x1536",
    prompt: `A black unstructured six-panel cotton chino twill dad cap with a low profile crown and a pre-curved brim, resting on the backdrop, seen from the front and slightly to the left so the two front panels and their center seam face the camera, the brim pointing toward the camera and a little to the left, front panels smooth and blank. ${STYLE}`,
  },
  {
    id: "cap-back",
    size: "1024x1536",
    from: "cap-front",
    prompt: "The same black cap, rotated to show its back: the adjustable self-fabric strap with an antique brass slide buckle and the arched opening above it, on the same backdrop with identical lighting. The panel above the strap opening is blank. No text, no logos.",
  },
  {
    id: "twill-macro",
    size: "1024x1536",
    prompt: `Close-up of the front panel of a black cotton chino twill cap, the diagonal twill weave fills the frame, a curved panel seam with neat topstitching runs down the middle. ${MACRO}`,
  },
  {
    id: "sticker-sheet",
    size: "1024x1536",
    prompt: `A single blank glossy black rectangular card with small rounded corners, A5 portrait proportions (148 by 210 millimeters), lying flat on the backdrop, rotated a few degrees clockwise, photographed from above at a gentle angle, crisp edges, a faint soft reflection and a soft contact shadow. ${STYLE}`,
  },
  {
    id: "sticker-laptop",
    size: "1024x1536",
    prompt: `The closed lid of a matte space black aluminum laptop, photographed from directly above and straight on, the lid fills most of the frame with its long edges horizontal and a little negative space around it, smooth dark anodized surface with soft studio reflections, no logo on the lid. ${STYLE}`,
  },
  {
    id: "keycaps",
    size: "1024x1536",
    prompt: `Three blank black PBT keycaps in Cherry profile sitting in a neat row on the backdrop, photographed from the front and slightly above: two wider 1.25u modifier keycaps on the left and one standard 1u keycap on the right. Matte textured plastic, sculpted tops, crisp edges, no legends or symbols on any keycap. ${STYLE}`,
  },
  {
    id: "keyboard",
    size: "1024x1536",
    prompt: `A complete compact black 60 percent mechanical keyboard with a standard ANSI layout lying on the backdrop, photographed from above at a 35 degree angle, the whole keyboard visible and filling most of the width of the frame, matte black blank PBT Cherry profile keycaps, every keycap blank with no legends or symbols, a wide spacebar in the bottom row. ${STYLE}`,
  },
  {
    id: "notebook",
    size: "1024x1536",
    prompt: `A black A5 hardcover notebook with a fine textured cover, a black elastic closure band running vertically near the right edge, cream page edges and two thin black ribbon bookmarks, lying on the backdrop rotated a few degrees, photographed from above at a gentle angle, blank cover. ${STYLE}`,
  },
  {
    id: "notebook-macro",
    size: "1024x1536",
    prompt: `Close-up of the front cover of a black hardcover notebook, the fine textured cover material fills the frame, with the cream page edges and the black elastic band along the right edge. ${MACRO}`,
  },
  {
    id: "notebook-open",
    size: "1024x1536",
    prompt: `A black A5 hardcover notebook lying open and flat on the backdrop, photographed from directly above, the open spread fills most of the width of the frame, spine running vertically through the center, two cream pages with a fine 5 millimeter dot grid printed in light gray, a black ribbon bookmark lying across the right page, blank pages with no writing. ${STYLE}`,
  },
];

const byId = new Map(BASES.map((b) => [b.id, b]));

export function request(id: string, quality: Quality): Request {
  const b = byId.get(id);
  if (!b) throw new Error(`no base ${id}`);
  return { prompt: b.prompt, size: b.size, quality, seed: b.seed, refs: b.from ? [cachedPath(request(b.from, quality))] : undefined };
}

/** Committed copies of the blanks and edits the shots use (photos/cache is local and ignored). */
export const PINNED = join(import.meta.dir, "..", "photos", "blanks");

/** The blank for `id`: the local cache if present, otherwise the committed copy. */
export function basePath(id: string, quality: Quality = "high"): string {
  let cached = "";
  try {
    cached = cachedPath(request(id, quality));
  } catch {
    // An edit whose source blank isn't cached locally: fall through to the pinned copy.
  }
  if (cached && existsSync(cached)) return cached;
  const pinned = join(PINNED, `${id}.webp`);
  if (existsSync(pinned)) return pinned;
  return cached;
}

async function bases(quality: Quality, only: string[]): Promise<void> {
  const ordered = [...BASES].sort((a, b) => Number(Boolean(a.from)) - Number(Boolean(b.from)));
  const pending = ordered.filter((b) => !only.length || only.includes(b.id));
  // Independent prompts in parallel; edits after the base they edit.
  const first = pending.filter((b) => !b.from);
  const queue = [...first];
  const failures: string[] = [];
  await Promise.all(
    Array.from({ length: 4 }, async () => {
      for (let b = queue.shift(); b; b = queue.shift()) {
        try {
          await generate(request(b.id, quality), b.id);
        } catch (e) {
          failures.push(String(e));
        }
      }
    }),
  );
  if (failures.length) console.error(failures.join("\n"));
  for (const b of pending.filter((x) => x.from)) {
    if (failures.length && pending.some((p) => p.id === b.from)) continue;
    await generate(request(b.id, quality), b.id);
  }
  const dir = join(import.meta.dir, "..", "photos", quality);
  mkdirSync(dir, { recursive: true });
  // photos/<quality>/<id>.png points at the cached file, for review.
  for (const b of pending) {
    const link = join(dir, `${b.id}.png`);
    rmSync(link, { force: true });
    if (existsSync(cachedPath(request(b.id, quality)))) symlinkSync(cachedPath(request(b.id, quality)), link);
  }
  console.log(pending.map((b) => `${b.id}: ${cachedPath(request(b.id, quality))}`).join("\n"));
}

if (import.meta.main) {
  const [cmd, ...args] = process.argv.slice(2);
  if (cmd === "bases") {
    const q = (args[0] ?? "low") as Quality;
    await bases(q, args.slice(1));
  } else if (cmd === "pin") {
    const { pin } = await import("./shots");
    await pin();
  } else if (cmd === "render") {
    const { render } = await import("./shots");
    await render(args);
  } else {
    throw new Error("usage: photos.ts bases [low|high] [id…] | render [shot…] | pin");
  }
}
