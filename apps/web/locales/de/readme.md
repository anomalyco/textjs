<!-- s:32f8804e6b -->
Text.js ist ein React-Framework für Apps, die in der Browser-Konsole rendern.

<!-- s:814ee9e9d7 -->
[Dokumentation](https://textjs.org/docs) · [Lernen](https://textjs.org/learn) · [Playground](https://textjs.org/playground) · [OpenCode](https://textjs.org/opencode)

<!-- s:bc834fc57b -->
Eine Text.js-App, gerendert in der Konsole der Chrome DevTools

<!-- s:9535b10be9 -->
Schnellstart

<!-- s:c7a467af05 -->
Öffne [localhost:3000](http://localhost:3000) und [die Browser-Konsole](https://textjs.org/docs/installation#open-the-console). Text.js benötigt Bun 1.2+ oder Node.js 22+ und Chrome, Edge, Firefox oder Safari auf dem Desktop.

<!-- s:9bf34f44c9 -->
Beispiel

<!-- s:3f1f0605f9 -->
Jeder Frame erhält sein Layout mit Yoga, wird per Lauflängenkodierung in `%c`-Spans umgewandelt und mit einem einzigen `console.log` ausgegeben. Ein Frame ohne geänderte Zellen gibt nichts aus. [`ARCHITECTURE.md`](ARCHITECTURE.md) beschreibt die Rendering-Pipeline.

<!-- s:8b78543399 -->
Pakete

<!-- s:cf0456d221 -->
| Paket | Version | Beschreibung |
| --- | --- | --- |
| [`@textjs/app`](packages/app) | [![npm](https://img.shields.io/npm/v/@textjs/app)](https://www.npmjs.com/package/@textjs/app) | App Router, die `text`-CLI und Route-Handler |
| [`@textjs/react`](packages/react) | [![npm](https://img.shields.io/npm/v/@textjs/react)](https://www.npmjs.com/package/@textjs/react) | Reconciler, Komponenten und Hooks |
| [`@textjs/core`](packages/core) | [![npm](https://img.shields.io/npm/v/@textjs/core)](https://www.npmjs.com/package/@textjs/core) | Zellenpuffer, Layout und der `%c`-Konsolentreiber |
| [`@textjs/font`](packages/font) | [![npm](https://img.shields.io/npm/v/@textjs/font)](https://www.npmjs.com/package/@textjs/font) | Parser und Renderer für FIGlet-Schriften |
| [`@textjs/opencode`](packages/opencode) | [![npm](https://img.shields.io/npm/v/@textjs/opencode)](https://www.npmjs.com/package/@textjs/opencode) | Lokale Brücke zwischen textjs.org/opencode und einem OpenCode-Server |
| [`create-text-app`](packages/create-text-app) | [![npm](https://img.shields.io/npm/v/create-text-app)](https://www.npmjs.com/package/create-text-app) | Projektgenerator |
| [`eslint-plugin-textjs`](packages/eslint-plugin-textjs) | [![npm](https://img.shields.io/npm/v/eslint-plugin-textjs)](https://www.npmjs.com/package/eslint-plugin-textjs) | ESLint-Regeln für Text.js-Apps |

<!-- s:8b249e49fa -->
Auch die Editor- und Browser-Erweiterungen liegen hier:

<!-- s:cbba2b4208 -->
- [`packages/vscode-textjs`](packages/vscode-textjs): die [VS-Code-Erweiterung](https://textjs.org/docs/vscode), mit Live-Vorschau, Gerüsten für den App Router und Links zu Fehlercodes
- [`packages/devtools-extension`](packages/devtools-extension): die [Chrome-DevTools-Erweiterung](https://textjs.org/docs/devtools-extension), mit Komponentenbaum, Frame-Inspektor und Zeitleiste

<!-- s:08b48c3d0b -->
Entwicklung

<!-- s:5facd29c1d -->
Die Website läuft unter [localhost:3000](http://localhost:3000). [CONTRIBUTING.md](CONTRIBUTING.md) beschreibt die anderen Apps, die End-to-End-Skripte und den Release-Prozess.

<!-- s:47964f2d9e -->
Mitwirken

<!-- s:b236bea0a4 -->
Fehlerberichte und Pull Requests sind willkommen. Lies zuerst [CONTRIBUTING.md](CONTRIBUTING.md) und melde Sicherheitsprobleme wie in [SECURITY.md](SECURITY.md) beschrieben.

<!-- s:6c549a56db -->
Lizenz

<!-- s:a950c8684e -->
[MIT](LICENSE). Mitgelieferte Dateien von Drittanbietern behalten ihre eigenen Lizenzen: die FIGlet-Schriften in [`packages/font`](packages/font/NOTICE) (BSD 3-Clause) und die Schriften unter `apps/web` und `merch/fonts` (SIL Open Font License 1.1).
