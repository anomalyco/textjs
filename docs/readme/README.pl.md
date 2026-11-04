<!-- Built from README.md by apps/web/scripts/i18n/readme.ts. Edit README.md, then run `bun run i18n:translate` in apps/web. -->

<div align="center">

# ▼ Text.js

Text.js to framework React do aplikacji renderowanych w konsoli przeglądarki.

<!-- i18n:languages -->
[English](../../README.md) · [Bahasa Indonesia](README.id.md) · [Deutsch](README.de.md) · [Español](README.es.md) · [Français](README.fr.md) · [Italiano](README.it.md) · Polski · [Português (Brasil)](README.pt-BR.md) · [Tiếng Việt](README.vi.md) · [Türkçe](README.tr.md) · [Русский](README.ru.md) · [हिन्दी](README.hi.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md)
<!-- /i18n:languages -->

[Dokumentacja](https://textjs.org/pl/docs) · [Nauka](https://textjs.org/pl/learn) · [Playground](https://textjs.org/pl/playground) · [OpenCode](https://textjs.org/pl/opencode)

<img src="../../brand/share/2-console-frame.png" alt="A Text.js app rendered in the Chrome DevTools console" width="720" />

</div>

## Szybki start

```bash
bunx create-text-app@latest
cd my-app && bun install && bun dev
```

Otwórz [localhost:3000](http://localhost:3000) i [otwórz konsolę przeglądarki](https://textjs.org/pl/docs/installation#open-the-console). Text.js wymaga środowiska Bun 1.2+ lub Node.js 22+ oraz przeglądarki Chrome, Edge, Firefox lub Safari na komputerze.

## Przykład

```tsx
// app/page.tsx
import { useState } from "react";
import { Box, Text, useInput } from "@textjs/app";

export default function Page() {
  const [count, setCount] = useState(0);

  useInput((e) => {
    if (e.key === "up") setCount((c) => c + 1);
    if (e.key === "down") setCount((c) => c - 1);
  });

  return (
    <Box className="flex-col border rounded p-1">
      <Text bold>▼ Hello, console</Text>
      <Text color="muted">count = {count}</Text>
    </Box>
  );
}
```

Layout każdej klatki jest obliczany przez Yoga, kodowany metodą długości serii do spanów `%c` i wypisywany jednym wywołaniem `console.log`. Klatka bez zmienionych komórek niczego nie wypisuje. Plik [`ARCHITECTURE.md`](../../ARCHITECTURE.md) opisuje potok renderowania.

## Pakiety

| Pakiet | Wersja | Opis |
| --- | --- | --- |
| [`@textjs/app`](../../packages/app) | [![npm](https://img.shields.io/npm/v/@textjs/app)](https://www.npmjs.com/package/@textjs/app) | App Router, CLI `text` i handlery tras |
| [`@textjs/react`](../../packages/react) | [![npm](https://img.shields.io/npm/v/@textjs/react)](https://www.npmjs.com/package/@textjs/react) | Reconciler, komponenty i hooki |
| [`@textjs/core`](../../packages/core) | [![npm](https://img.shields.io/npm/v/@textjs/core)](https://www.npmjs.com/package/@textjs/core) | Bufor komórek, layout i sterownik konsoli `%c` |
| [`@textjs/font`](../../packages/font) | [![npm](https://img.shields.io/npm/v/@textjs/font)](https://www.npmjs.com/package/@textjs/font) | Parser i renderer fontów FIGlet |
| [`@textjs/opencode`](../../packages/opencode) | [![npm](https://img.shields.io/npm/v/@textjs/opencode)](https://www.npmjs.com/package/@textjs/opencode) | Lokalny most między textjs.org/opencode a serwerem OpenCode |
| [`create-text-app`](../../packages/create-text-app) | [![npm](https://img.shields.io/npm/v/create-text-app)](https://www.npmjs.com/package/create-text-app) | Generator projektów |
| [`eslint-plugin-textjs`](../../packages/eslint-plugin-textjs) | [![npm](https://img.shields.io/npm/v/eslint-plugin-textjs)](https://www.npmjs.com/package/eslint-plugin-textjs) | Reguły ESLint dla aplikacji Text.js |

Tutaj znajdują się też rozszerzenia edytora i przeglądarki:

- [`packages/vscode-textjs`](../../packages/vscode-textjs): [rozszerzenie VS Code](https://textjs.org/pl/docs/vscode) z podglądem na żywo, generowaniem szkieletu App Router i linkami do kodów błędów
- [`packages/devtools-extension`](../../packages/devtools-extension): [rozszerzenie Chrome DevTools](https://textjs.org/pl/docs/devtools-extension) z drzewem komponentów, inspektorem klatek i osią czasu

## Prace nad projektem

```bash
bun install
bun test packages/
bun run typecheck
bun run --cwd apps/web dev
```

Strona działa pod adresem [localhost:3000](http://localhost:3000). Plik [CONTRIBUTING.md](../../CONTRIBUTING.md) opisuje pozostałe aplikacje, skrypty end-to-end i proces wydawania wersji.

## Współtworzenie

Zgłoszenia błędów i pull requesty są mile widziane. Najpierw przeczytaj [CONTRIBUTING.md](../../CONTRIBUTING.md), a problemy z bezpieczeństwem zgłaszaj zgodnie z opisem w [SECURITY.md](../../SECURITY.md).

## Licencja

[MIT](../../LICENSE). Dołączone pliki innych autorów zachowują własne licencje: fonty FIGlet w [`packages/font`](../../packages/font/NOTICE) (BSD 3-Clause) oraz fonty w `apps/web` i `merch/fonts` (SIL Open Font License 1.1).
