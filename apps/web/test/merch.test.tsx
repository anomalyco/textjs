import { afterAll, describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { RouteView } from "../src/App";
import { render, ROUTES } from "../src/entry-server";
import { cart } from "../src/merch/cart";
import { fourthwall, linkOut, MERCH, saleOf, shopify } from "../src/merch/config";
import { fourthwallVariants, type FourthwallProduct } from "../src/merch/fourthwall";
import { MerchPage } from "../src/merch/Merch";
import { PRODUCTS, productPath } from "../src/merch/products";
import { matchRoute, resetLocation, titleFor } from "../src/router";
import { Footer } from "../src/site/Chrome";

const ROOT = join(import.meta.dir, "..");

describe("merch routes", () => {
  afterAll(() => resetLocation("/"));

  test("match the index and every product, and 404 anything else", () => {
    expect(matchRoute("/merch")).toEqual({ name: "merch", slug: "" });
    expect(matchRoute("/merch/")).toEqual({ name: "merch", slug: "" });
    for (const p of PRODUCTS) expect(matchRoute(productPath(p.slug))).toEqual({ name: "merch", slug: p.slug });
    expect(matchRoute("/merch/nope")).toEqual({ name: "not-found" });
    expect(matchRoute("/merch/logo-tee/extra")).toEqual({ name: "not-found" });
    expect(matchRoute("/merch/frame-tee")).toEqual({ name: "not-found" });
    expect(titleFor({ name: "merch", slug: "" })).toBe("Merch | Text.js");
    expect(titleFor({ name: "merch", slug: "console-tee" })).toBe("console.log Tee | Text.js Merch");
  });

  test("are prerendered, linked from the footer and listed in the sitemap", () => {
    const paths = ROUTES.map((r) => r.path);
    const sitemap = readFileSync(join(ROOT, "public/sitemap.xml"), "utf8");
    for (const p of ["/merch", ...PRODUCTS.map((x) => productPath(x.slug))]) {
      expect(paths).toContain(p);
      expect(sitemap).toContain(`https://textjs.org${p}<`);
    }
    expect(renderToStaticMarkup(<Footer />)).toContain('href="/merch"');
    for (const r of ROUTES.filter((x) => x.path.startsWith("/merch"))) expect(r.description.length).toBeGreaterThan(40);
  });

  test("the index prerenders every product with sized images", async () => {
    const html = await render("/merch");
    expect(html).toContain("<h1>Merch</h1>");
    for (const p of PRODUCTS) {
      expect(html).toContain(`href="${productPath(p.slug)}"`);
      expect(html).toContain(p.name);
    }
    // Everything Fourthwall makes reads Coming soon; the Keycap Set and Notebook read Later.
    expect(html.match(/merch-flag">Coming soon</g)?.length).toBe(14);
    expect(html.match(/merch-flag">Later</g)?.length).toBe(2);
    // Every image reserves its box before it loads.
    for (const tag of html.match(/<img [^>]*>/g) ?? []) if (tag.includes(".webp")) expect(tag).toMatch(/width="1024" height="1280"/);
    expect(html).toContain('class="footer"');
    expect(html).not.toContain("▲");
  });

  test("product pages prerender the gallery, sizes and a closed buy box with no data collection", async () => {
    for (const p of PRODUCTS) {
      const html = await render(productPath(p.slug));
      expect(html).toContain(`<h1>${p.name}</h1>`);
      expect(html).toContain('aria-roledescription="carousel"');
      if (saleOf(p.slug).drop === "launch") {
        expect(html).toMatch(/<button[^>]*disabled[^>]*>Coming soon<\/button>/);
        expect(html).toContain(`href="${MERCH.notify.href}"`);
      } else {
        expect(html).toMatch(/<button[^>]*disabled[^>]*>Later<\/button>/);
        expect(html).toContain("Planned for a later drop.");
      }
      for (const s of p.sizes) expect(html).toContain(`value="${s}"`);
      if (p.sizes.length === 0) expect(html).toContain("One size");
      expect(html).not.toContain("<form");
      expect(html).not.toMatch(/type="(email|text|tel)"/);
      expect(html).not.toContain("▲");
    }
    const tee = await render("/merch/console-tee");
    expect(tee).toContain("small ▼ on the left sleeve");
    for (const s of ["XS", "3XL"]) expect(tee).toContain(`value="${s}"`);
  });
});

describe("merch catalog", () => {
  test("the collection lists the final round: three tees, two hoodies, two caps, five stickers, the PSA tee and sticker, keycaps and a notebook", () => {
    expect(PRODUCTS.map((p) => p.slug)).toEqual(["logo-tee", "block-tee", "console-tee", "console-hoodie", "mark-hoodie", "console-cap", "mark-cap", "sticker-mark", "sticker-wordmark", "sticker-console", "sticker-keys", "sticker-percent-c", "psa-tee", "psa-sticker", "keycaps", "notebook"]);
    expect(PRODUCTS.map((p) => p.number)).toEqual(PRODUCTS.map((_, i) => String(i + 1).padStart(3, "0")));
  });

  test("every product has a number, price, copy and 4:5 images that exist", () => {
    const numbers = new Set<string>();
    for (const p of PRODUCTS) {
      expect(p.number).toMatch(/^\d{3}$/);
      numbers.add(p.number);
      expect(p.price).toBeGreaterThan(0);
      expect(p.description.length).toBeGreaterThan(0);
      expect(p.details.length).toBeGreaterThan(0);
      expect(p.images.length).toBeGreaterThanOrEqual(2);
      if (p.sizeGuide) expect(p.sizeGuide.rows.length).toBe(p.sizes.length);
      for (const img of p.images) {
        expect(img.alt.length).toBeGreaterThan(0);
        for (const src of [img.small, img.large]) expect(existsSync(join(ROOT, "src/merch/images", src.split("/").pop() as string))).toBe(true);
      }
    }
    expect(numbers.size).toBe(PRODUCTS.length);
  });

  test("copy avoids the AI tells the style guide bans", () => {
    const copy = PRODUCTS.flatMap((p) => [...p.description, ...p.details, ...p.care, p.fit ?? ""]).join("\n");
    expect(copy).not.toContain("—");
    for (const word of ["seamless", "effortless", "elevate", "crafted", "premium", "simply", "just "]) expect(copy.toLowerCase()).not.toContain(word);
  });
});

describe("checkout providers", () => {
  const tee = { M: "11111111-1111-4111-8111-111111111111", L: "22222222-2222-4222-8222-222222222222" };
  const fw = fourthwall({ shopDomain: "textjs-shop.fourthwall.com", variants: { "logo-tee": tee, "mark-cap": { "": "33333333-3333-4333-8333-333333333333" } } });

  test("Fourthwall builds direct checkout links and refuses lines it can't sell", () => {
    expect(fw.cart).toBe(true);
    expect(fw.sells({ slug: "logo-tee", size: "M" })).toBe(true);
    expect(fw.sells({ slug: "logo-tee", size: "XS" })).toBe(false);
    expect(fw.checkoutUrl([{ slug: "logo-tee", size: "M", quantity: 2 }, { slug: "mark-cap", size: "", quantity: 1 }])).toBe(
      `https://textjs-shop.fourthwall.com/cart/checkout?products=${tee.M}:2,33333333-3333-4333-8333-333333333333:1&currency=USD`,
    );
    expect(fw.checkoutUrl([{ slug: "logo-tee", size: "XS", quantity: 1 }])).toBeNull();
    expect(fw.checkoutUrl([])).toBeNull();
    // Only variant UUIDs: anything else could smuggle extra query parameters into the link.
    const bad = fourthwall({ shopDomain: "x.fourthwall.com", variants: { cap: { "": "abc&coupon=FREE" } } });
    expect(bad.sells({ slug: "cap", size: "" })).toBe(false);
  });

  test("Shopify cart permalinks stay available as a fallback", () => {
    const p = shopify({ domain: "textjs.myshopify.com", variants: { "frame-tee": { M: "4400000000001" } } });
    expect(p.checkoutUrl([{ slug: "frame-tee", size: "M", quantity: 2 }])).toBe("https://textjs.myshopify.com/cart/4400000000001:2");
  });

  test("link-out sends one product to its page", () => {
    const p = linkOut({ name: "Example", urls: { cap: "https://example.com/cap" } });
    expect(p.cart).toBe(false);
    expect(p.checkoutUrl([{ slug: "cap", size: "", quantity: 1 }])).toBe("https://example.com/cap");
    expect(p.checkoutUrl([{ slug: "hoodie", size: "M", quantity: 1 }])).toBeNull();
  });

  test("the store ships closed, with everything but the keycaps and notebook in the first drop", () => {
    expect(MERCH.provider).toBeNull();
    expect(MERCH.notify.href.startsWith("/")).toBe(true);
    expect(PRODUCTS.filter((p) => saleOf(p.slug).drop === "later").map((p) => p.slug)).toEqual(["keycaps", "notebook"]);
    for (const p of PRODUCTS) expect(saleOf(p.slug).preorder).toBeUndefined();
  });

  test("a configured provider opens the first drop and leaves later items closed", () => {
    const index = renderToStaticMarkup(<MerchPage slug="" provider={fw} />);
    expect(index).not.toContain("Coming soon");
    expect(index).not.toContain("Pre-order");
    expect(index.match(/merch-flag">Later</g)?.length).toBe(2);
    expect(index).toContain("Cart, 0 items");
    const teePage = renderToStaticMarkup(<MerchPage slug="logo-tee" provider={fw} />);
    expect(teePage).toMatch(/<button[^>]*>Add to cart<\/button>/);
    expect(teePage).toContain(`${saleOf("logo-tee").shipping} Checkout on Fourthwall.`);
    // Sizes without a variant are shown as sold out.
    expect(teePage).toMatch(/class="merch-size is-out"><input type="radio" disabled="" name="[^"]+" value="XS"\/>/);
    expect(teePage).toMatch(/class="merch-size"><input type="radio" name="[^"]+" value="M"\/>/);
    expect(renderToStaticMarkup(<MerchPage slug="mark-cap" provider={fw} />)).toMatch(/<button[^>]*>Add to cart<\/button>/);
    // A first-drop product with no variant yet stays closed.
    expect(renderToStaticMarkup(<MerchPage slug="console-cap" provider={fw} />)).toMatch(/<button[^>]*disabled[^>]*>Coming soon<\/button>/);
    const keycaps = renderToStaticMarkup(<MerchPage slug="keycaps" provider={fw} />);
    expect(keycaps).toMatch(/<button[^>]*disabled[^>]*>Later<\/button>/);
    expect(keycaps).not.toContain("is-out");
  });

  test("the Fourthwall sync maps catalog variants by slug and size", () => {
    const v = (id: string, size: string | undefined, value: number) => ({ id, unitPrice: { value, currency: "USD" }, attributes: { description: `Black, ${size ?? "One size"}`, size: size ? { name: size } : undefined } });
    const catalog: FourthwallProduct[] = [
      { slug: "text-js-logo-tee", name: "Logo Tee", variants: [v("t-m", "M", 40), v("t-l", "L", 40)] },
      { slug: "mark-cap", name: "▼ Cap", variants: [v("c", undefined, 30)] },
    ];
    const { variants, warnings } = fourthwallVariants(catalog, { "logo-tee": "text-js-logo-tee" });
    expect(variants["logo-tee"]).toEqual({ M: "t-m", L: "t-l" });
    expect(variants["mark-cap"]).toEqual({ "": "c" });
    expect(warnings).toContain("logo-tee: size XS not on Fourthwall");
    expect(warnings.some((w) => w.startsWith("mark-cap: Fourthwall price 30"))).toBe(true);
    expect(warnings).toContain('mark-hoodie: no Fourthwall product with slug "mark-hoodie"');
  });

  test("the cart merges lines and drops them at zero", () => {
    cart.clear();
    cart.add({ slug: "logo-tee", size: "M" });
    cart.add({ slug: "logo-tee", size: "M" });
    cart.add({ slug: "mark-cap", size: "" });
    expect(cart.get()).toEqual([
      { slug: "logo-tee", size: "M", quantity: 2 },
      { slug: "mark-cap", size: "", quantity: 1 },
    ]);
    cart.setQuantity({ slug: "logo-tee", size: "M" }, 0);
    expect(cart.get()).toEqual([{ slug: "mark-cap", size: "", quantity: 1 }]);
    cart.clear();
  });
});

describe("merch page", () => {
  test("RouteView renders the store", () => {
    const html = renderToStaticMarkup(<RouteView route={{ name: "merch", slug: "notebook" }} />);
    expect(html).toContain("251 numbered pages");
    expect(html).toContain("More from the collection");
  });
});
