import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { plural, t } from "../i18n/t";
import { A } from "../router";
import { CloseIcon } from "../site/icons";
import { useScrollLock } from "../site/Sheet";
import { cart, useCart } from "./cart";
import { MERCH, onSale, saleOf, type CartLine, type CheckoutProvider } from "./config";
import { formatPrice, getProduct, IMAGE_HEIGHT, IMAGE_WIDTH, PRODUCTS, productPath, type Product, type ProductImage } from "./products";
import "./merch.css";

export function MerchPage({ slug, provider = MERCH.provider }: { slug: string; provider?: CheckoutProvider | null }): ReactNode {
  const product = slug ? getProduct(slug) : undefined;
  const [cartOpen, setCartOpen] = useState(false);
  useEffect(() => setCartOpen(false), [slug]);
  const bag = provider?.cart ? <CartButton onClick={() => setCartOpen(true)} /> : null;
  return (
    <div className="merch">
      {product ? <ProductView key={product.slug} product={product} provider={provider} bag={bag} onAdded={() => setCartOpen(true)} /> : <Collection provider={provider} bag={bag} />}
      {provider?.cart ? <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} provider={provider} /> : null}
    </div>
  );
}

// ── Collection ─────────────────────────────────────────────────────────────────

function Collection({ provider, bag }: { provider: CheckoutProvider | null; bag: ReactNode }): ReactNode {
  return (
    <div className="merch-container">
      <header className="merch-head">
        <div>
          <h1>{t("Store")}</h1>
          <p>{provider ? t("Made to order.") : t("Made to order. Coming soon.")}</p>
        </div>
        {bag}
      </header>
      <ul className="merch-grid" aria-label={t("Products")}>
        {PRODUCTS.map((p, i) => (
          <li key={p.slug}>
            <ProductCard product={p} flag={flagFor(p, provider)} eager={i < 3} priority={i === 0} />
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The label on a product image, vercel.store style: Coming soon or Pre-order. */
function flagFor(p: Product, provider: CheckoutProvider | null): string | null {
  if (!onSale(provider, p.slug, p.sizes)) return t("Coming soon");
  return saleOf(p.slug).preorder ? t("Pre-order") : null;
}

function ProductCard({
  product: p,
  flag,
  eager = false,
  priority = false,
  compact = false,
}: {
  product: Product;
  flag: string | null;
  eager?: boolean;
  priority?: boolean;
  compact?: boolean;
}): ReactNode {
  const [first, second] = p.images as [ProductImage, ProductImage | undefined];
  const [showAlt, setShowAlt] = useState(false);
  const sizes = compact ? "(min-width: 1000px) 320px, calc(50vw - 24px)" : "(min-width: 1000px) 448px, calc(50vw - 24px)";
  return (
    <A
      href={productPath(p.slug)}
      className="merch-card"
      onPointerEnter={(e) => {
        if (e.pointerType === "mouse") setShowAlt(true);
      }}
      onFocus={() => setShowAlt(true)}
    >
      <div className="merch-card-media">
        <Img image={first} sizes={sizes} eager={eager} priority={priority} alt="" />
        {second && showAlt ? <Img image={second} sizes={sizes} eager alt="" className="merch-card-alt" /> : null}
        {flag ? <span className="merch-flag">{flag}</span> : null}
      </div>
      <div className="merch-card-meta">
        <span className="merch-num">{p.number}</span>
        <span className="merch-name">{p.name}</span>
        <span className="merch-price">{formatPrice(p.price)}</span>
      </div>
      <div className="merch-card-sub">{p.color}</div>
    </A>
  );
}

function Img({
  image,
  sizes,
  alt,
  eager = false,
  priority = false,
  className,
}: {
  image: ProductImage;
  sizes: string;
  alt: string;
  eager?: boolean;
  priority?: boolean;
  className?: string;
}): ReactNode {
  return (
    <img
      src={image.large}
      srcSet={`${image.small} 600w, ${image.large} ${IMAGE_WIDTH}w`}
      sizes={sizes}
      width={IMAGE_WIDTH}
      height={IMAGE_HEIGHT}
      alt={alt}
      loading={eager ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : undefined}
      decoding={priority ? "sync" : "async"}
      className={className}
    />
  );
}

// ── Product ────────────────────────────────────────────────────────────────────

function ProductView({ product: p, provider, bag, onAdded }: { product: Product; provider: CheckoutProvider | null; bag: ReactNode; onAdded: () => void }): ReactNode {
  const [size, setSize] = useState<string | null>(null);
  const more = PRODUCTS.filter((o) => o.slug !== p.slug).slice(0, 4);
  return (
    <>
      <div className="merch-container merch-pdp">
        <Gallery product={p} />
        <div className="merch-info">
          <div className="merch-info-top">
            <nav aria-label={t("Breadcrumb")} className="merch-crumbs">
              <A href="/store">{t("Store")}</A>
              <span aria-hidden="true">/</span>
              <span aria-current="page">{p.name}</span>
            </nav>
            {bag}
          </div>
          <div className="merch-title">
            <h1>{p.name}</h1>
            <span className="merch-price">{formatPrice(p.price)}</span>
          </div>
          <p className="merch-sub">
            <span>{p.number}</span>
            <span>{p.color}</span>
          </p>
          <SizePicker product={p} provider={provider} value={size} onChange={setSize} />
          <BuyBox product={p} provider={provider} size={size} onAdded={onAdded} />
          <section className="merch-section" aria-labelledby="merch-description">
            <h2 id="merch-description">{t("Description")}</h2>
            {p.description.map((d) => (
              <p key={d}>{d}</p>
            ))}
          </section>
          <section className="merch-section" aria-labelledby="merch-details">
            <h2 id="merch-details">{t("Details")}</h2>
            <ul>
              {p.details.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          </section>
          <section className="merch-section" aria-labelledby="merch-care">
            <h2 id="merch-care">{t("Care")}</h2>
            <ul>
              {p.care.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          </section>
          {p.sizeGuide ? <SizeGuideTable product={p} /> : null}
        </div>
      </div>
      <section className="merch-container merch-more" aria-labelledby="merch-more">
        <h2 id="merch-more">{t("More from the collection")}</h2>
        <ul className="merch-grid merch-grid-compact">
          {more.map((o) => (
            <li key={o.slug}>
              <ProductCard product={o} flag={flagFor(o, provider)} compact />
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

function Gallery({ product: p }: { product: Product }): ReactNode {
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [extraLoaded, setExtraLoaded] = useState(false);
  const count = p.images.length;
  const warmExtra = (): void => setExtraLoaded(true);

  const go = (i: number): void => {
    setExtraLoaded(true);
    const el = track.current;
    const next = (i + count) % count;
    setIndex(next);
    // physical: scroll offsets, in a gallery kept LTR so its arrows, keys and swipes agree
    el?.scrollTo({ left: next * el.clientWidth, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const onScroll = (): void => {
      setExtraLoaded(true);
      setIndex(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)));
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="merch-gallery" dir="ltr" onPointerEnter={warmExtra} onTouchStart={warmExtra} onFocus={warmExtra}>
      <div className="merch-stage">
        <div
          ref={track}
          className="merch-track"
          role="region"
          aria-roledescription="carousel"
          aria-label={`${p.name} images`}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") go(index + 1);
            else if (e.key === "ArrowLeft") go(index - 1);
            else return;
            e.preventDefault();
          }}
        >
          {p.images.map((image, i) => (
            <div key={image.large} className="merch-slide" role="group" aria-roledescription="slide" aria-label={`${i + 1} of ${count}`}>
              {i === 0 || extraLoaded ? (
                <Img image={image} sizes="(min-width: 1000px) 624px, min(640px, calc(100vw - 32px))" eager={i === 0} priority={i === 0} alt={image.alt} />
              ) : null}
            </div>
          ))}
        </div>
        {count > 1 ? (
          <>
            <button type="button" className="merch-arrow merch-arrow-prev" onClick={() => go(index - 1)} aria-label={t("Previous image")}>
              <Chevron dir="left" />
            </button>
            <button type="button" className="merch-arrow merch-arrow-next" onClick={() => go(index + 1)} aria-label={t("Next image")}>
              <Chevron dir="right" />
            </button>
          </>
        ) : null}
      </div>
      {count > 1 ? (
        <div className="merch-thumbs">
          {p.images.map((image, i) => (
            <button key={image.small} type="button" className="merch-thumb" aria-label={t("Show image {n} of {count}", { n: i + 1, count })} aria-current={i === index ? "true" : undefined} onClick={() => go(i)}>
              <img src={image.small} width={IMAGE_WIDTH} height={IMAGE_HEIGHT} alt="" loading="lazy" decoding="async" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function Chevron({ dir }: { dir: "left" | "right" }): ReactNode {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <path d={dir === "left" ? "M10 3L5 8l5 5" : "M6 3l5 5-5 5"} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SizePicker({ product: p, provider, value, onChange }: { product: Product; provider: CheckoutProvider | null; value: string | null; onChange: (size: string) => void }): ReactNode {
  const name = useId();
  if (p.sizes.length === 0)
    return (
      <div className="merch-field">
        <span className="merch-label">{t("Size")}</span>
        <p className="merch-onesize">{t("One size")}</p>
        {p.fit ? <p className="merch-fit">{p.fit}</p> : null}
      </div>
    );
  return (
    <fieldset className="merch-field">
      <legend className="merch-label">{t("Size")}</legend>
      <div className="merch-sizes">
        {p.sizes.map((s) => {
          const out = provider !== null && onSale(provider, p.slug, p.sizes) && !provider.sells({ slug: p.slug, size: s });
          return (
            <label key={s} className={`merch-size${out ? " is-out" : ""}`}>
              <input type="radio" name={name} value={s} checked={value === s} onChange={() => onChange(s)} disabled={out} />
              <span>{s}</span>
              {out ? <span className="sr-only">{t(" (sold out)")}</span> : null}
            </label>
          );
        })}
      </div>
      {p.fit ? <p className="merch-fit">{p.fit}</p> : null}
    </fieldset>
  );
}

function BuyBox({ product: p, provider, size, onAdded }: { product: Product; provider: CheckoutProvider | null; size: string | null; onAdded: () => void }): ReactNode {
  const [hint, setHint] = useState(false);
  useEffect(() => setHint(false), [size]);
  const sale = saleOf(p.slug);
  if (!provider || !onSale(provider, p.slug, p.sizes)) {
    return (
      <div className="merch-buy">
        <button type="button" className="btn btn-secondary btn-lg merch-buy-btn" disabled>
          {t("Coming soon")}
        </button>
      </div>
    );
  }
  const label = sale.preorder ? t("Pre-order") : provider.cart ? t("Add to cart") : t("Buy");
  const needsSize = p.sizes.length > 0 && size === null;
  const line = { slug: p.slug, size: p.sizes.length ? (size ?? "") : "", quantity: 1 };
  const status = hint ? (
    <p id="merch-status" className="merch-status" role="status">
      {t("Select a size.")}
    </p>
  ) : (
    <p id="merch-status" className="merch-status">
      {sale.shipping ? `${sale.shipping} ` : ""}
      {t("Checkout on {provider}.", { provider: provider.name })}
    </p>
  );
  if (provider.cart) {
    return (
      <div className="merch-buy">
        <button
          type="button"
          className="btn btn-primary btn-lg merch-buy-btn"
          aria-describedby="merch-status"
          onClick={() => {
            if (needsSize) return setHint(true);
            cart.add(line);
            onAdded();
          }}
        >
          {label}
        </button>
        {status}
      </div>
    );
  }
  const href = needsSize ? null : provider.checkoutUrl([line]);
  return (
    <div className="merch-buy">
      {href ? (
        <a href={href} className="btn btn-primary btn-lg merch-buy-btn" aria-describedby="merch-status">
          {label}
        </a>
      ) : (
        <button type="button" className="btn btn-primary btn-lg merch-buy-btn" aria-describedby="merch-status" onClick={() => setHint(true)}>
          {label}
        </button>
      )}
      {status}
    </div>
  );
}

function SizeGuideTable({ product: p }: { product: Product }): ReactNode {
  const g = p.sizeGuide;
  if (!g) return null;
  return (
    <details className="merch-guide">
      <summary>{t("Size guide")}</summary>
      <table>
        <thead>
          <tr>
            <th scope="col">{t("Size")}</th>
            {g.columns.map((c) => (
              <th key={c} scope="col">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {p.sizes.map((s, i) => (
            <tr key={s}>
              <th scope="row">{s}</th>
              {(g.rows[i] ?? []).map((v, j) => (
                <td key={g.columns[j]}>{v}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p>{g.note}</p>
    </details>
  );
}

// ── Cart ───────────────────────────────────────────────────────────────────────

function CartButton({ onClick }: { onClick: () => void }): ReactNode {
  const count = useCart().reduce((n, l) => n + l.quantity, 0);
  return (
    <button type="button" className="merch-bag" onClick={onClick} aria-label={plural(count, { one: "Cart, {count} item", other: "Cart, {count} items" })}>
      <span>{t("Cart")}</span>
      <span className="merch-bag-count">{count}</span>
    </button>
  );
}

function CartDrawer({ open, onClose, provider }: { open: boolean; onClose: () => void; provider: CheckoutProvider }): ReactNode {
  const lines = useCart();
  const panel = useRef<HTMLDivElement>(null);
  const title = useId();
  useScrollLock(open);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "Tab" && panel.current) {
        const focusable = panel.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled])");
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (!first || !last) return;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    requestAnimationFrame(() => panel.current?.focus({ preventScroll: true }));
    return () => {
      window.removeEventListener("keydown", onKey);
      if (previous && document.contains(previous)) previous.focus({ preventScroll: true });
    };
  }, [open]);

  if (!open || typeof document === "undefined") return null;
  const items = lines.flatMap((l) => {
    const product = getProduct(l.slug);
    return product ? [{ line: l, product }] : [];
  });
  const subtotal = items.reduce((n, { line, product }) => n + line.quantity * product.price, 0);
  const checkout = provider.checkoutUrl(items.map(({ line }) => line));
  return createPortal(
    <div className="merch-drawer-layer" data-console-bypass="">
      <div className="sheet-scrim" onClick={onClose} aria-hidden="true" />
      <div ref={panel} className="merch-drawer" role="dialog" aria-modal="true" aria-labelledby={title} tabIndex={-1}>
        <div className="merch-drawer-head">
          <h2 id={title}>{t("Cart")}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label={t("Close cart")}>
            <CloseIcon />
          </button>
        </div>
        {items.length === 0 ? (
          <p className="merch-drawer-empty">{t("Your cart is empty.")}</p>
        ) : (
          <ul className="merch-lines">
            {items.map(({ line, product }) => (
              <CartRow key={`${line.slug}:${line.size}`} line={line} product={product} />
            ))}
          </ul>
        )}
        <div className="merch-drawer-foot">
          <div className="merch-subtotal">
            <span>{t("Subtotal")}</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          <p className="merch-status">{t("Shipping and taxes at checkout.")}</p>
          {checkout && items.length > 0 ? (
            <a href={checkout} className="btn btn-primary btn-lg merch-buy-btn">
              {t("Check out")}
            </a>
          ) : (
            <button type="button" className="btn btn-primary btn-lg merch-buy-btn" disabled>
              {t("Check out")}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function CartRow({ line, product }: { line: CartLine; product: Product }): ReactNode {
  const image = product.images[0] as ProductImage;
  const label = line.size ? t("{name}, size {size}", { name: product.name, size: line.size }) : product.name;
  return (
    <li className="merch-line">
      <img src={image.small} width={IMAGE_WIDTH} height={IMAGE_HEIGHT} alt="" />
      <div className="merch-line-body">
        <div className="merch-line-top">
          <A href={productPath(product.slug)}>{product.name}</A>
          <span>{formatPrice(product.price * line.quantity)}</span>
        </div>
        <p className="merch-line-sub">
          {product.color}
          {line.size ? ` · ${line.size}` : ""}
        </p>
        <div className="merch-qty">
          <button type="button" onClick={() => cart.setQuantity(line, line.quantity - 1)} aria-label={t("Remove one {item}", { item: label })}>
            −
          </button>
          <span aria-label={t("Quantity {n}", { n: line.quantity })}>{line.quantity}</span>
          <button type="button" onClick={() => cart.setQuantity(line, line.quantity + 1)} aria-label={t("Add one {item}", { item: label })}>
            +
          </button>
        </div>
      </div>
    </li>
  );
}
