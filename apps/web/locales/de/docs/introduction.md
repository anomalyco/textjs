<!-- s:b3d5e86364 -->
Text.js ist ein React-Framework für Apps, die mit `console.log` in der DevTools-Konsole rendern.

<!-- s:34bf1ea7dd -->
Die Vorschau ist live. Klicke darauf und drücke `↑`.

<!-- s:0bccbd98be -->
Funktionsumfang

<!-- s:d3708efc68 -->
- **React 19**: nebenläufiges Rendering, Suspense und Fehlergrenzen.
- **App Router**: Layouts, Seiten, dynamische Segmente und Route-Handler.
- **Yoga-Layout**: flexbox in WebAssembly, auf ganzzahlige Zellen ausgerichtet.
- **Turbolog**: ein `console.log`-Aufruf pro geändertem Frame.
- **Konsolen-UI**: Die Seite enthält nur ein Fokusfeld und ein verborgenes Eingabefeld.

<!-- s:5ae438610c -->
Funktionsweise

<!-- s:75f47f9f8c -->
Der Zustand fließt nach unten: React, dann das Layout, dann ein Zellenpuffer, dann die Konsole.

<!-- s:25c55610d2 -->
Unveränderte Frames werden übersprungen, sodass Apps im Leerlauf nichts protokollieren.

<!-- s:3a5d9cbc49 -->
Nächste Schritte

<!-- s:b849362c77 -->
- [Installation](/docs/installation): Erstelle deine erste App.
- [Routing](/docs/routing): Seiten, Layouts und Navigation.
- [Turbolog](/docs/turbolog-engine): Wie Frames kodiert werden.
- [OpenCode](/docs/opencode): Eine mit Text.js entwickelte Agenten-TUI.
