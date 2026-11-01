/** Headless Chromium rendering for proofs and mockups (PNG via screenshot, WebP via canvas). */
import { chromium, type Browser } from "playwright-core";

let browser: Browser | undefined;

export async function open(): Promise<Browser> {
  browser ??= await chromium.launch({ headless: true });
  return browser;
}

export async function close(): Promise<void> {
  await browser?.close();
  browser = undefined;
}

/** Renders `html` at `width`×`height` CSS px and returns a PNG at `scale`× device pixels. */
export async function png(html: string, width: number, height: number, scale = 1): Promise<Buffer> {
  const b = await open();
  const page = await b.newPage({ viewport: { width, height }, deviceScaleFactor: scale });
  await page.setContent(html, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  const shot = await page.screenshot({ type: "png", omitBackground: false });
  await page.close();
  return shot;
}

/** Encodes a PNG as WebP at each width (Chromium's canvas encoder; no native tools needed). */
export async function webp(pngBytes: Buffer, widths: number[], quality = 0.9): Promise<Map<number, Buffer>> {
  const b = await open();
  const page = await b.newPage();
  const src = `data:image/png;base64,${pngBytes.toString("base64")}`;
  const out = await page.evaluate(
    async ({ src, widths, quality }) => {
      const img = new Image();
      img.src = src;
      await img.decode();
      const results: Array<[number, string]> = [];
      for (const w of widths) {
        const h = Math.round((img.naturalHeight / img.naturalWidth) * w);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, w, h);
        results.push([w, canvas.toDataURL("image/webp", quality).split(",")[1] as string]);
      }
      return results;
    },
    { src, widths, quality },
  );
  await page.close();
  return new Map(out.map(([w, b64]) => [w, Buffer.from(b64, "base64")]));
}
