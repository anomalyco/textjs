import { afterAll, describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { RouteView } from "../src/App";
import { render, ROUTES } from "../src/entry-server";
import { cart } from "../src/merch/cart";
import { linkOut, MERCH, shopify } from "../src/merch/config";
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
    expect(matchRoute("/merch/frame-tee/extra")).toEqual({ name: "not-found" });
    expect(titleFor({ name: "merch", slug: "" })).toBe("Merch | Text.js");
    expect(titleFor({ name: "merch", slug: "frame-tee" })).toBe("Frame Tee | Text.js Merch");
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
    expect(html.match(/Coming soon/g)?.length).toBe(PRODUCTS.length);
    // Every image reserves its box before it loads.
    for (const tag of html.match(/<img [^>]*>/g) ?? []) if (tag.includes(".webp")) expect(tag).toMatch(/width="1200" height="1500"/);
    expect(html).toContain('class="footer"');
    expect(html).not.toContain("▲");
  });

  test("product pages prerender the gallery, sizes and a closed buy box with no data collection", async () => {
    for (const p of PRODUCTS) {
      const html = await render(productPath(p.slug));
      expect(html).toContain(`<h1>${p.name}</h1>`);
      expect(html).toContain('aria-roledescription="carousel"');
      expect(html).toContain("Coming soon");
      expect(html).toMatch(/<button[^>]*disabled[^>]*>Coming soon<\/button>/);
      expect(html).toContain(`href="${MERCH.notify.href}"`);
      for (const s of p.sizes) expect(html).toContain(`value="${s}"`);
      if (p.sizes.length === 0) expect(html).toContain("One size");
      expect(html).not.toContain("<form");
      expect(html).not.toMatch(/type="(email|text|tel)"/);
      expect(html).not.toContain("▲");
    }
    const tee = await render("/merch/frame-tee");
    expect(tee).toContain("Size guide");
    expect(tee).toContain("104\u00a0×\u00a032 cells");
  });
});

describe("merch catalog", () => {
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
  const variants = { "frame-tee": { M: "4400000000001", L: "4400000000002" }, cap: { "": "4400000000003" } };

  test("Shopify builds cart permalinks and refuses lines it can't sell", () => {
    const p = shopify({ domain: "textjs.myshopify.com", variants });
    expect(p.cart).toBe(true);
    expect(p.sells({ slug: "frame-tee", size: "M" })).toBe(true);
    expect(p.sells({ slug: "frame-tee", size: "XS" })).toBe(false);
    expect(p.checkoutUrl([{ slug: "frame-tee", size: "M", quantity: 2 }, { slug: "cap", size: "", quantity: 1 }])).toBe("https://textjs.myshopify.com/cart/4400000000001:2,4400000000003:1");
    expect(p.checkoutUrl([{ slug: "frame-tee", size: "XS", quantity: 1 }])).toBeNull();
    expect(p.checkoutUrl([])).toBeNull();
  });

  test("link-out sends one product to its page", () => {
    const p = linkOut({ name: "Example", urls: { cap: "https://example.com/cap" } });
    expect(p.cart).toBe(false);
    expect(p.checkoutUrl([{ slug: "cap", size: "", quantity: 1 }])).toBe("https://example.com/cap");
    expect(p.checkoutUrl([{ slug: "hoodie", size: "M", quantity: 1 }])).toBeNull();
  });

  test("the store ships closed", () => {
    expect(MERCH.provider).toBeNull();
    expect(MERCH.notify.href.startsWith("/")).toBe(true);
  });

  test("a configured provider swaps Coming soon for Add to cart and a cart button", () => {
    const provider = shopify({ domain: "textjs.myshopify.com", variants });
    const index = renderToStaticMarkup(<MerchPage slug="" provider={provider} />);
    expect(index).not.toContain("Coming soon");
    expect(index).toContain("Cart, 0 items");
    const tee = renderToStaticMarkup(<MerchPage slug="frame-tee" provider={provider} />);
    expect(tee).toContain("Add to cart");
    expect(tee).toContain("Checkout on Shopify.");
    // Sizes without a variant are shown as sold out.
    expect(tee).toMatch(/class="merch-size is-out"><input type="radio" disabled="" name="[^"]+" value="XS"\/>/);
    expect(tee).toMatch(/class="merch-size"><input type="radio" name="[^"]+" value="M"\/>/);
    const hoodie = renderToStaticMarkup(<MerchPage slug="hoodie" provider={provider} />);
    expect(hoodie).toContain("Coming soon");
  });

  test("the cart merges lines and drops them at zero", () => {
    cart.clear();
    cart.add({ slug: "frame-tee", size: "M" });
    cart.add({ slug: "frame-tee", size: "M" });
    cart.add({ slug: "cap", size: "" });
    expect(cart.get()).toEqual([
      { slug: "frame-tee", size: "M", quantity: 2 },
      { slug: "cap", size: "", quantity: 1 },
    ]);
    cart.setQuantity({ slug: "frame-tee", size: "M" }, 0);
    expect(cart.get()).toEqual([{ slug: "cap", size: "", quantity: 1 }]);
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
