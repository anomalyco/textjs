# Chrome Web Store submission

Everything to paste into the Chrome Web Store Developer Dashboard for Text.js DevTools 1.0.0, in the order the form asks for it. `bun run store` rebuilds every file in this folder from the current source.

| File | Use |
| :-- | :-- |
| `textjs-devtools-1.0.0.zip` | The package to upload |
| `icon-128.png` | Store icon (96px mark, 16px transparent padding) |
| `screenshot-1-frame.png` | Screenshot 1, 1280×800 |
| `screenshot-2-components.png` | Screenshot 2, 1280×800 |
| `screenshot-3-timeline.png` | Screenshot 3, 1280×800 |
| `screenshot-4-console.png` | Screenshot 4, 1280×800 |
| `promo-small.png` | Small promo tile, 440×280 |
| `promo-marquee.png` | Marquee promo tile, 1400×560 |

The screenshots are real Chromium captures of the extension in `textjs-devtools-1.0.0.zip`, loaded unpacked, inspecting `examples/dashboard` under `text dev`.

## Steps

1. Open https://chrome.google.com/webstore/devconsole and sign in with the account that owns the **Text.js** publisher. If the dashboard asks which account to use, pick that publisher.
2. Click **New item** (top right; older layouts call it **Add new item**).
3. Click **Choose file**, pick `packages/devtools-extension/store/textjs-devtools-1.0.0.zip`, then click **Upload**. The draft opens on the **Package** tab, which shows the name, version 1.0.0 and description from the manifest. Nothing on that tab is editable.
4. Open **Store listing** in the left menu and fill it in from [Store listing](#store-listing) below. Click **Save draft**.
5. Open **Privacy** and fill it in from [Privacy](#privacy) below. Click **Save draft**.
6. Open **Distribution** and fill it in from [Distribution](#distribution) below. Click **Save draft**.
7. Skip **Test instructions**, or paste the text from [Test instructions](#test-instructions) to help the reviewer.
8. Click **Submit for review** (top right). In the dialog, leave **Publish automatically after review** checked, then click **Submit**.

If **Submit for review** stays disabled, the dashboard lists the missing fields above it. The usual one is an unverified contact email under **Account**.

Review usually takes a few days. Google emails the publisher account when the item is published or rejected.

## Store listing

### Product details

**Title**: comes from the package (`Text.js DevTools`).

**Summary**: comes from the package:

```
Adds a Text.js panel to Chrome DevTools with the component tree, a cell-level frame inspector and a frame timeline.
```

**Description**: paste as plain text. The store doesn't render Markdown.

```
Text.js DevTools adds a Text.js panel to Chrome DevTools, next to Console. It inspects Text.js apps, which render in the DevTools console with console.log.

The panel has three views:

• Components: the React tree of every console root, with props, hooks, keys and the scene nodes behind them, laid out in cells. Hovering a row highlights the node in the Console.
• Frame: the current frame as a cell grid. Hover a cell to see its character, its colors and the component that painted it. Click it to select that component.
• Timeline: React, layout, paint and encode times for each frame, skipped and emitted frames, frame pacing against the 66ms minimum interval, and the number of %c spans.

The toolbar pauses and resumes output, toggles a layout wireframe, pins or fits the grid size, and copies the frame as text.

Open DevTools on a page with a Text.js app, and the Text.js panel appears once the app creates its console root. With the panel closed, the extension costs the app one property read per frame.

The extension makes no network requests and collects no data. It needs Chrome 111 or later.

Docs: https://textjs.org/docs/devtools-extension
```

**Category**: Developer Tools

**Language**: English

### Graphic assets

| Field | File |
| :-- | :-- |
| Store icon | `icon-128.png` |
| Global promo video | Leave empty |
| Screenshots | `screenshot-1-frame.png`, `screenshot-2-components.png`, `screenshot-3-timeline.png`, `screenshot-4-console.png`, in that order |
| Small promo tile | `promo-small.png` |
| Marquee promo tile | `promo-marquee.png` |

### Additional fields

| Field | Value |
| :-- | :-- |
| Official URL | None. Choosing textjs.org needs the domain verified in Google Search Console first |
| Homepage URL | `https://textjs.org/docs/devtools-extension` |
| Support URL | Leave empty. The listing shows the account's contact email, hello@textjs.org |
| Mature content | Off |

## Privacy

**Single purpose description**

```
Text.js DevTools adds one panel to Chrome DevTools for inspecting Text.js apps in the inspected tab: their React component tree, the frames they draw in the console, and how long each frame takes.
```

**Permission justification**

The manifest has no `permissions` or `host_permissions` entries, so the dashboard lists only the host access that comes from the content scripts (`http://*/*` and `https://*/*`).

Host permission justification:

```
The extension has no API permissions. Its two content scripts match http://*/* and https://*/* and run at document_start so that the Text.js hook (__TEXTJS_DEVTOOLS_HOOK__) exists before the page's own scripts run. Text.js apps register with the hook when they start, and they can be served from any host: localhost during development, or any production domain. The extension can't know those hosts in advance. On a page without a Text.js app, the scripts install the hook and stay idle: the isolated-world script connects to the service worker only after the page reports a Text.js root, and nothing is read from the page until the Text.js panel asks for it. Data from the page goes only to the DevTools panel for the same tab and never leaves the browser.
```

**Are you using remote code?** No, I am not using remote code.

(Every script is in the package. The extension pages' content security policy is `script-src 'self'; object-src 'self'`, and `test/build.test.ts` checks the bundles for `eval`, `new Function`, `importScripts`, dynamic `import()` and remote script tags.)

**Data usage**

What user data do you plan to collect from users now or in the future? Tick nothing:

- [ ] Personally identifiable information
- [ ] Health information
- [ ] Financial and payment information
- [ ] Authentication information
- [ ] Personal communications
- [ ] Location
- [ ] Web history
- [ ] User activity
- [ ] Website content

Certify all three:

- [x] I do not sell or transfer user data to third parties, outside of the approved use cases
- [x] I do not use or transfer user data for purposes that are unrelated to my item's single purpose
- [x] I do not use or transfer user data to determine creditworthiness or for lending purposes

**Privacy policy URL**

```
https://textjs.org/docs/devtools-extension#privacy
```

The form only requires a policy when an item handles user data, but the extension reads page content locally, so give the URL anyway. The **Privacy** section it links to is added in the same commit as this file. Deploy the site before submitting so the anchor exists.

## Distribution

| Field | Value |
| :-- | :-- |
| Payments | Free of charge |
| Visibility | Public |
| Distribution | All regions |

## Test instructions

Optional. Leave **Username** and **Password** empty and paste this into **Additional instructions**:

```
No account is needed. Open https://textjs.org (the site is a Text.js app), then open DevTools (Cmd+Option+I or Ctrl+Shift+I). A "Text.js" tab appears next to Console. Its Components, Frame and Timeline views inspect the site's console app. Switch to Console to see the app itself.
```
