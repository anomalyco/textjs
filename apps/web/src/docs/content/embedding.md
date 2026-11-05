`text build --embed` builds your app so another site can add it with one script tag, such as a marketing page, a docs site, a WordPress or Webflow page, or a React 18 app. Visitors who open DevTools get your app in the console. Other visitors download `embed.js` (about 3 kB with gzip) and nothing else, unless the page has a `<text-console>`.

Embeds are experimental. `text build --embed`, the `embed` option, `<text-console>` and the `@textjs/app/experimental` exports may change in a minor release. See [Breaking changes](/docs/support-policy#breaking-changes).

## Add an app to a site

Build the app:

```bash
text build --embed
```

Upload `dist/` to any static host or CDN, or copy it into the site's `public/` folder, then add one tag to the site's pages:

```html
<script type="module" src="https://console.example.com/embed.js"></script>
```

`embed.js` loads its other files relative to its own URL, so `dist/` works from any path or origin. It holds only `embed.js` and `assets/`, with no `index.html` or `404.html` that could replace the site's own. An app whose first route [renders on the server](#server-rendered-routes), or that has route handlers or middleware, needs `text start` or the `bun` adapter instead.

To show visitors where the app is, add [`<text-console>`](#text-console) anywhere in the page. Any element with `data-textjs-engage` starts the app when pressed, too:

```html
<button type="button" data-textjs-engage>Open in the console</button>
```

To try it locally, run `text dev --embed`. It serves `/embed.js` with a fresh first frame on each request, and a preview page at `/` (`/__textjs/embed` with `standalone`) that loads it the way another site would. A site on another local port can load `http://localhost:3000/embed.js` too.

## Configuration

`text build --embed` is the same as `embed: true` in `text.config.ts`. Pass an object to change the defaults:

```ts@text.config.ts
import { defineConfig } from "@textjs/app";

export default defineConfig({
  embed: {
    initialPath: "/status",
  },
});
```

| Option | Default | Description |
| :-- | :-- | :-- |
| `initialPath` | `"/"` | The route the console opens at. Must start with `/` |
| `globalName` | `"text"` | The global the app installs its console API under once it starts. `false` installs none |
| `initialClear` | `false` | Clear the page's console before the first frame. By default, what the page logged earlier stays above the app |
| `standalone` | `false` | Also build the app's own pages (`index.html`), as `text build` does without `embed` |
| `allowOrigins` | `[]` | Sites whose pages may run server-rendered routes from this server. See [Server-rendered routes](#server-rendered-routes) |
| `credentials` | `false` | Send browser credentials for this server with live session requests from `allowOrigins`, instead of dropping cookies and `Authorization`. Needs exact origins |

`viewport.width × viewport.height` (default 120 × 36) is the size of the first frame. `title`, `hints` and `action` are `<text-console>`'s defaults. `embed.js` has no prerendered first frame with `ppr: false`, or when `middleware.ts` could match `initialPath`, since anyone can download `embed.js`. A mirror stays blank until the app paints.

## How it behaves

- **Nothing else loads until [console intent](/docs/hooks-and-repl#loading-on-console-intent-experimental).** `embed.js` logs the prerendered first frame, then waits. The app loads when DevTools is docked (on load or later), when the visitor presses a DevTools shortcut on the page (F12, Ctrl+Shift+J, I, C or K, or ⌘⌥J, I, C or K on a Mac), or when they press a `<text-console>` or a `[data-textjs-engage]` element. After that, reloads in the same tab start it at once. DevTools in its own window doesn't change the page's size, so visitors who opened it from a menu see the first frame until they press one of those elements.
- **On touch screens, the app doesn't start.** On a device matching `(hover: none) and (pointer: coarse)`, `embed.js` logs nothing and adds no listeners. The only file it loads is `<text-console>`'s, for a mirror.
- **Keys reach the app only after the visitor engages it.** To engage it, they press a `<text-console>` or a `[data-textjs-engage]` element, or click the page (not a link, button or field) to bring focus back from DevTools. Typing in the page's own fields or in a `[data-textjs-bypass]` element never reaches the app, and the wheel always scrolls the page.
- **The page's URL, history and title never change.** Routes, `<Link>` and `useRouter()` navigate inside the console. In client-rendered apps, absolute URLs open in a new tab.
- **A Text.js app on the page takes priority.** When it starts, a running embed unmounts, stops reading keys and removes its global. An embed that loads while another app holds the console logs one warning and doesn't start.
- **The embed bundles its own React 19.** It has no `react-dom` or bare imports, so the page's React version, an import map for `react` and React DevTools don't affect it.

## What loads when

| File | Loads | gzip |
| :-- | :-- | --: |
| `embed.js` | With the page | 2.9 kB |
| `assets/text-console-[hash].js` | When the page has a `<text-console>` | 4.0 kB |
| `assets/embed-client-[hash].js` and `assets/yoga-[hash].wasm` | On console intent | 112.8 kB + 29.0 kB |
| `assets/embed-player-[hash].js` | On console intent, instead of the client, for a [server-rendered route](#server-rendered-routes) | 22.7 kB |
| `assets/bidi-[hash].js` | The first time the app shows right-to-left text (see [Loading the bidi engine](/docs/internationalization#loading-the-bidi-engine)) | 10.1 kB |

Sizes are for a bordered status box at 120 × 36. `text build --embed` prints your app's. `assets/embed-[hash].js` is a copy of `embed.js` under a name that never changes (see [Deploys](#deploys)).

## `<text-console>`

`embed.js` defines `<text-console>` and loads its file only when one is on the page. It uses Shadow DOM, so the page's CSS doesn't reach inside, and a `style-src 'self'` policy needs no changes.

```html
<text-console></text-console>
<text-console mirror></text-console>
<text-console chrome></text-console>
```

Without attributes it's a one-line bar. It shows the browser's shortcut for opening the console, then asks for a click, then lists the app's keys, which light up as they reach the app. In Safari, the first step says to turn on "Show features for web developers" in Safari's settings.

With `mirror`, it shows the app's frame on the page: the prerendered first frame before anything else loads, then the running app. Pressing it starts the app and sends it the visitor's keys, so the app works with DevTools closed. `chrome` draws a DevTools window around the mirror and implies `mirror`.

| Attribute | Description |
| :-- | :-- |
| `mirror` | Show the app's frames |
| `chrome` | Show the frames in a DevTools window |
| `title` | The bar's title (default: `title` in `text.config.ts`) |
| `hints` | The keys to list, as `"← →:switch region, Enter:open"` (default: `hints` in `text.config.ts`) |
| `action` | What to do first, shown as "Click here and …" (default: `action` in `text.config.ts`, or press the first hint) |

On touch screens, a mirror shows the first frame without starting the app, and the bar is hidden. The element's text is in English.

### Reserving its space

`text build --embed` prints one line of CSS for your app's grid. Paste it into the page's stylesheet. It sizes `<text-console>` before the element's file loads, so nothing on the page moves when the file arrives. For the default 120 × 36 grid, the line is:

```css
text-console{display:block;min-height:58px}text-console:is([mirror],[chrome]){position:relative;box-sizing:content-box;min-height:0;max-width:885px;aspect-ratio:885/522}text-console[chrome]{padding-top:43px}@media (hover:none) and (pointer:coarse){text-console:not([mirror],[chrome]){display:none}}
```

The bar is 58px tall. A mirror keeps the grid's aspect ratio, up to its natural width (885px at 120 columns), and `chrome` adds 43px. The size doesn't depend on fonts. `reserveCss(cols, rows)` from `@textjs/app/experimental` returns the same line.

A mirror above the fold is usually the page's largest element, so it sets the page's Largest Contentful Paint (LCP). Its first frame draws after `embed.js` and then the element's file load, one after the other. The rest of the page paints as it would without the embed. A mirror further down the page doesn't affect LCP. On a page with its own deferred scripts, such as a React app, `<script type="module" async src="…">` runs `embed.js` without waiting for them, so a mirror above the fold draws sooner.

### Styling

To center a mirror, give it auto inline margins:

```css
text-console {
  margin-inline: auto;
}
```

It's dark by default. Set `color-scheme: light` for light colors, or set the two colors every other shade is mixed from. `::part(frame)` styles the frame itself. `chrome` keeps DevTools' own background.

```css
text-console {
  --text-console-bg: #fafafa;
  --text-console-fg: #171717;
}

text-console::part(frame) {
  border-radius: 0;
}
```

## Server-rendered routes

When `initialPath` is a route with `export const runtime = "server"`, `embed.js` loads the frame player instead of the client runtime. It streams frames from the server `embed.js` came from, so run `text start` or the `bun` adapter. Other adapters fail the build. See [Server rendering](/docs/server-rendering).

A page on another site can open a live session only when its origin is in `allowOrigins`:

```ts@text.config.ts
import { defineConfig } from "@textjs/app";

export default defineConfig({
  embed: {
    initialPath: "/status",
    allowOrigins: ["https://www.example.com", "https://*.example.com"],
  },
});
```

- A session only answers the origin that opened it.
- By default, Text.js drops the cookies and `Authorization` header of sessions from other sites, so [middleware](/docs/middleware) sees a signed-out visitor. `credentials: true` keeps them, and needs exact origins. The browser sends them when the page and the server share a registrable domain (`www.example.com` and `console.example.com`) and the cookie covers the server (`Domain=example.com`, or set on `console.example.com`). From other sites it sends only cookies set with `SameSite=None; Secure`, and browsers that block third-party cookies send none.
- A live session sends `OPTIONS` preflights to `/__textjs/live` as soon as it connects, and when it reconnects. Preflights carry no cookies or `Authorization`, so middleware that matches that path must let `OPTIONS` requests through without signing in.
- Behind a reverse proxy or CDN, set `server.trustProxy` (see [Behind a proxy](/docs/deploying#behind-a-proxy)). Without it, every visitor has the proxy's address, so they all share one per-client session limit.

`text dev` accepts pages on `localhost`, `127.0.0.1` and `[::1]` at any port without `allowOrigins`, unless `credentials` is set.

## Hosting

`text start` and the `bun`, `vercel` and `cloudflare` adapters serve an embed build with these headers. The `static` adapter writes them to `_headers`, which Cloudflare Pages and Netlify read. On any other host, such as a storage bucket or the site's own `public/` folder, set them yourself:

| Path | Headers |
| :-- | :-- |
| `/embed.js` | `Cache-Control: public, max-age=0, must-revalidate` |
| `/assets/*` | `Cache-Control: public, max-age=31536000, immutable` |
| Both, when the site is on another origin | `Access-Control-Allow-Origin: *` and `Cross-Origin-Resource-Policy: cross-origin` |

Browsers fetch module scripts and WebAssembly with CORS, so files on another origin need `Access-Control-Allow-Origin`. Serve `yoga-[hash].wasm` as `application/wasm`, compressed (see [WebAssembly](/docs/deploying#webassembly)).

### Deploys

`embed.js` is revalidated on every page load, so new visitors get a new deploy at once. A tab that loaded the previous `embed.js` still imports the previous build's files when the visitor opens the console, possibly hours later. Keep the previous deploy's `assets/` online: copy new files over old ones instead of syncing with deletion, and remove old files after a day or two. To pin a build, put its `assets/embed-[hash].js` in the tag. That build's files must stay online too.

When the files are gone, `embed.js` logs one warning that asks the visitor to reload, and doesn't start or reload the page itself.

### Content Security Policy

`embed.js` needs no inline scripts or styles. Add these to the host page's policy, with `'self'` in place of the origin when `dist/` is on the same origin:

| Directive | Value | For |
| :-- | :-- | :-- |
| `script-src` | `https://console.example.com` | `embed.js` and its chunks |
| `script-src` | `'wasm-unsafe-eval'` | Yoga, in client-rendered apps |
| `connect-src` | `https://console.example.com` | `yoga-[hash].wasm`, and `/__textjs/live` for server-rendered routes |
| `img-src` | `data:` | Only a `<text-console mirror>` whose app draws `<Image>` or `<Pixels>` |

## Loading the app yourself

`@textjs/app/experimental` exports the parts `embed.js` is built from, for pages that load an app their own way:

| Export | Description |
| :-- | :-- |
| `startEmbed(paint, boot, src, element?)` | What `embed.js` runs: log the first frame, wait for console intent, then call `boot` |
| `bootEmbedClient(options)` | Start a client-rendered app with in-memory routing and keyboard input gated for the page |
| `bootEmbedPlayer(options)` | Start the frame player for a server-rendered route |
| `createHostInput(options)` | Keyboard input that follows the rules above |
| `createTextConsoleMount(config)` | Returns a `mount(element, shell?)` function for `<text-console>` |
| `reserveCss(cols, rows)` | The CSS that reserves `<text-console>`'s space |

`ENGAGE_SELECTOR` and `BYPASS_SELECTOR` are the selectors for elements that start the app and elements that keep their own keys.
