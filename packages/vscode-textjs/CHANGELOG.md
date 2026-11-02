# Changelog

## 1.2.0

- Chinese, Japanese and Korean IMEs and dead keys work in the preview. With a `text dev` server from `@textjs/app` 1.1.0 or earlier, committed text is sent as key presses or a paste
- Windows: matches dev servers whose project path uses a short 8.3 name
- The preview draws frames in Cascadia Mono before Consolas, so charts fit on Windows

## 1.1.0

- Detects projects that depend on `@textjs/app`, and snippets import from `@textjs/app` (renamed from `@textjs/next`)
- Status bar and error-link copy no longer assume Chrome's console shortcut

## 1.0.0

- Live Preview (live mirror of `text dev` and headless rendering) with keyboard input
- Dev server commands, App Router scaffolding, snippets
- `TX###` hovers and links, status bar item
