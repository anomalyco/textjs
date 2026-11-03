<!-- s:5a6798e6a5 -->
Heute veröffentlichen wir Text.js 1.0, das Konsolen-Framework für das Web.

<!-- s:e4787165f5 -->
Text.js rendert React-19-Apps in der Chrome-DevTools-Konsole, mit Layouts, Routing, Fokus, Eingaben, Formularen, Diagrammen und gestreamtem Markdown, gezeichnet mit `console.log`.

<!-- s:48b184a262 -->
Neuerungen in 1.0

<!-- s:7f7f2a9a76 -->
- **Der App Router.** `layout.tsx`, `page.tsx`, `[param]`, `loading.tsx`, `error.tsx`, `not-found.tsx` und `api/*/route.ts`, synchronisiert mit `window.location`. Er folgt den Konventionen des Next.js App Router.
- **Turbolog.** Yoga flexbox ordnet ein Zellenraster an, ein `CellBuffer` auf Basis typisierter Arrays hält es vor, und ein Lauflängen-Encoder wandelt es in einen einzigen Aufruf von `console.log(format, ...css)` um. Frames im Leerlauf erzeugen keine Konsolenaufrufe.
- **Ein Komponentenbaukasten.** `Box`, `Text`, `ScrollBox`, `Input`, `Select`, `Tabs`, `Markdown`, `Diff`, eine virtualisierte `List`, `Table`, `Tree`, Diagramme, Dialoge, Toasts und eine `Ctrl+K`-Befehlspalette aus `useKeymap`.
- **Angehängte Frames.** Frames werden unter dem vorherigen angehängt, sodass die Konsole zwischen Frames nicht kurz leer aufblitzt. Mehr dazu unter [Turbolog: Das Aufblitzen beseitigen](/blog/turbolog-eliminating-the-flash).
- **Text von rechts nach links.** Hebräisch und Arabisch werden in visueller Reihenfolge mit arabischer Zeichenformung gerendert, durch eine Implementierung von UAX #9, die alle 770.241 Testfälle aus `BidiTest.txt` besteht. Siehe [Text von rechts nach links in der Konsole](/blog/right-to-left-text).
- **Eine responsive Konsole.** Text.js passt sich dem angedockten DevTools-Panel an, einschließlich Seitenzoom und einer umbrechenden Symbolleiste. Im abgedockten Zustand greift es auf `120×36` zurück.
- **`text run`.** Dieselbe App-Router-App rendert in einem echten Terminal.
- **Werkzeuge für Agenten und Editoren.** `text mcp` stellt deine App Coding-Agenten über das Model Context Protocol bereit, und die Text.js-DevTools-Erweiterung fügt neben „Konsole“ ein Panel hinzu. `eslint-plugin-textjs` und eine VS Code-Erweiterung gehören ebenfalls zu 1.0.

<!-- s:b71c4a16bc -->
Eine Umbenennung

<!-- s:b47aa37902 -->
Das Framework-Paket heißt jetzt `@textjs/next`. Der Name `textjs` war auf npm vergeben. Aktualisiere deine Imports:

<!-- s:e4005009f1 -->
**Update, 1.0.2:** Das Paket heißt jetzt `@textjs/app`, und `@textjs/next` ist veraltet. Führe zum Wechseln `bun remove @textjs/next && bun add @textjs/app` aus und importiere aus `@textjs/app`.

<!-- s:5b35a47b90 -->
Zahlen

<!-- s:2ee54da34c -->
Auf einem dicht gefüllten `100×32`-Dashboard (46 Textknoten, 149 `%c`-Spans), gemessen mit `packages/core/test/perf.test.ts`:

<!-- s:9729def172 -->
| Frame | Mittelwert |
| :-- | --: |
| Vollständiges Neuzeichnen (Layout, Zeichnen, Kodieren) | 0,163 ms |
| Änderung einer Zeile (Tippen) | 0,011 ms |
| Leerlauf | 0,000 ms, 0 Konsolenaufrufe |

<!-- s:2fee8c4c3d -->
Bei einem unveränderten Frame kehrt die Funktion zurück, bevor sie einen String alloziert, daher messen Frames im Leerlauf 0,000 ms.

<!-- s:a0fa47c98f -->
Ausprobieren

<!-- s:aeb9cc2b5d -->
Öffne [textjs.org](/) und drücke ⌘⌥J (Ctrl+Shift+J unter Windows und Linux). Die Website führt eine Text.js-App in deiner Konsole aus, mit einer Ansicht pro Seite. Der [Playground](/playground) bietet ein Dashboard, gestreamtes Markdown und Snake. [OpenCode](/opencode) verbindet sich mit deinem lokalen OpenCode-Server.

<!-- s:31dd2e762c -->
Die vollständige Liste der Änderungen findest du im [Änderungsprotokoll](/changelog), den Quellcode auf [GitHub](https://github.com/anomalyco/textjs).
