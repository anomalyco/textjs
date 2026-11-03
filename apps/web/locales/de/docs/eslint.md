<!-- s:df706c7a4d -->
`eslint-plugin-textjs` erkennt Text.js-Fehler im Editor: DOM-Tags in Konsolenkomponenten, Boxen innerhalb von Text, Glyphen, die Menlo fehlen, verirrte `console.log`-Aufrufe und App Router-Exporte, die stillschweigend ignoriert werden.

<!-- s:0ecddf15e1 -->
Einrichtung

<!-- s:5d60a92733 -->
Das Plugin unterstützt ESLint 9 und 10 mit Flat Config. Die Regeln sind syntaktisch und benötigen weder Typinformationen noch `parserOptions.project`. Jeder Parser, der TypeScript und JSX versteht, funktioniert.

<!-- s:b69abcef52 -->
Konfigurationen

<!-- s:9cfe4adde3 -->
| Konfiguration | Aktivierte Regeln |
| :-- | :-- |
| `textjs.configs.recommended` | Jede Korrektheitsregel als Fehler; Konsolen-, Timer- und Frame-Taktungsregeln als Warnungen |
| `textjs.configs.strict` | Alles als Fehler, dazu `prefer-use-keymap` als Warnung |

<!-- s:6c9781312c -->
Wähle stattdessen Regeln einzeln aus:

<!-- s:ec6eb92cf0 -->
Konsolendateien

<!-- s:04573fe453 -->
Die meisten Regeln gelten nur für Dateien, die in die Konsole rendern: Dateien, die eine Komponente oder einen Hook (`Box`, `Text`, `useInput`, …) aus `@textjs/app` oder `@textjs/react` importieren. Dateien, die `react-dom` oder `@textjs/react/dom` importieren, sind Seitencode und bleiben unberührt, sodass eine Website DOM-Seiten und Konsolen-Apps in einem Projekt kombinieren kann. Der Import einer Hilfsfunktion wie `tokenize` oder `parseMarkdown` macht eine Datei nicht zur Konsolendatei.

<!-- s:96e9c86b58 -->
Die App Router-Regeln richten sich nach dem Dateinamen (`page.tsx`, `layout.tsx`, `route.ts`, …) innerhalb jedes `app/`-Verzeichnisses, einschließlich `src/app/`. Wenn deines anders heißt, übergib `{ appDir: "routes" }` an `valid-route-module`, `valid-metadata` und `route-handler-exports`.

<!-- s:b66542635d -->
Regeln

<!-- s:c1b57ad8e2 -->
| Regel | Empfohlen | Korrektur |
| :-- | :-- | :-- |
| [`no-dom-elements`](#no-dom-elements) | Fehler | Vorschlag |
| [`no-box-in-text`](#no-box-in-text) | Fehler | |
| [`no-unsupported-glyphs`](#no-unsupported-glyphs) | Fehler | automatische Korrektur, Vorschlag |
| [`no-console-in-components`](#no-console-in-components) | Warnung | Vorschlag |
| [`prefer-use-interval`](#prefer-use-interval) | Warnung | Vorschlag |
| [`no-sub-frame-timers`](#no-sub-frame-timers) | Warnung | |
| [`prefer-use-keymap`](#prefer-use-keymap) | nur strict | |
| [`valid-route-module`](#valid-route-module) | Fehler | |
| [`valid-metadata`](#valid-metadata) | Fehler | |
| [`route-handler-exports`](#route-handler-exports) | Fehler | Vorschlag |

<!-- s:a565f817ed -->
`no-dom-elements`

<!-- s:deb9e3c0ec -->
`<div>`, `<span>`, benutzerdefinierte Elemente und andere DOM-Tags gibt es in der Konsole nicht. Der Reconciler kennt nur seine eigenen Host-Knoten und löst bei allem anderen `TX003` aus.

<!-- s:bd7c3e0318 -->
Der Vorschlag ersetzt das Tag durch die passendste Komponente (`div` → `Box`, `span`/`p` → `Text`, `strong` → `Text bold`, `a` → `Link`, `input` → `Input`, `hr` → `Divider`, …) und fügt den Import hinzu.

<!-- s:a40be5da85 -->
`no-box-in-text`

<!-- s:4ec768c301 -->
`<Text>` ist eine Folge formatierter Spans; sie kann keine Box enthalten. Das Verschachteln von `<Box>` oder einer Komponente mit einer Box als Wurzel (`<ScrollBox>`, `<Input>`, `<Code>`, `<ProgressBar>`, `<Divider>`, …) löst beim Rendern `TX004` aus. Diese Regel erkennt das stattdessen im Editor, auch innerhalb von `&&`, ternären Ausdrücken, Fragmenten und `.map()`.

<!-- s:9390fe5b6b -->
`no-unsupported-glyphs`

<!-- s:bf8fe52c9e -->
Text.js ordnet jedes Zeichen in einem festen Zellraster an. Glyphen, die Menlo, der DevTools-Konsolenschrift auf macOS, fehlen, werden in einer Ersatzschrift dargestellt, die breiter als eine Zelle ist, sodass sich jede nachfolgende Zelle verschiebt.

<!-- s:a58a59c2f8 -->
- **Braille** (U+2800–U+28FF, die klassischen Frames von Terminal-Spinnern): Verwende Block- oder Quadrantenzeichen (`▘▝▗▖`), `<Spinner variant="dots">` oder `marker="quadrant"` bei Diagrammen. Setze `{ allowBraille: true }` für Apps, die nur mit `text run` in einem Terminal laufen.
- **Verschiedene Symbole und Pfeile** (U+2B00–U+2BFF, etwa das kleine Quadrat U+2B1D): Vorschläge bieten das Menlo-Äquivalent an (`·`, `●`, `←`).
- **Emoji-Darstellung bei einzelligen Symbolen** (`▶` oder `↩` gefolgt von U+FE0F): Der Variationsselektor macht daraus zweizellige Emoji, während das Raster eine Zelle reserviert. Die automatische Korrektur entfernt ihn.

<!-- s:8c0c49dfb7 -->
Breite Emoji (`🚀`, `✅`) sind unproblematisch: Text.js misst sie als zwei Zellen.

<!-- s:f838b005d1 -->
`no-console-in-components`

<!-- s:593ea6ea72 -->
Jeder Frame ist ein `console.log`. Deine eigenen Logs landen zwischen Frames, werden vom nächsten weggescrollt und sind in der am unteren Rand fixierten Ansicht verborgen. `console.clear()` löscht die App selbst.

<!-- s:0011d5dcff -->
Zeige Nachrichten in der UI mit `useToast()` oder einer Log-`<ScrollBox>` an, oder untersuche den Zustand im `[▼]` Dev Overlay (`` Ctrl+` ``). Mit `logger` schreibt der Vorschlag `console.warn(…)` in `log.warn(…)` um. Testdateien und Render-Aufrufe von `@textjs/app/testing` werden übersprungen.

<!-- s:6838ca349d -->
`prefer-use-interval`

<!-- s:7d34b88f36 -->
Ein direktes `setInterval` in einer Komponente benötigt einen Effekt, eine Aufräumfunktion und eine Ref, um veralteten Zustand zu vermeiden. `useInterval` übernimmt alle drei Aufgaben, und `null` stoppt es.

<!-- s:894ec09a45 -->
Für Animationen folgt `useAnimationFrame` der Frame-Taktung des Renderers und stoppt, solange die Ausgabe pausiert ist. Siehe [Hilfs-Hooks](/docs/utility-hooks).

<!-- s:0d541fb900 -->
`no-sub-frame-timers`

<!-- s:a27426b886 -->
Text.js gibt höchstens alle 66 ms einen Frame aus (etwa 15 fps). Ein Intervall von 16 ms rendert viermal pro ausgegebenem Frame; die zusätzlichen Frames werden zusammengefasst und verbrauchen nur CPU-Zeit. Meldet `setInterval`/`useInterval`-Verzögerungen unter `minInterval` (Standard `66`) und `useAnimationFrame` mit `fps` über 15.

<!-- s:bc8950c5dd -->
`prefer-use-keymap`

<!-- s:fbcb0ae458 -->
`e.key` von Hand zu vergleichen funktioniert, aber die Tastenkürzel bleiben unsichtbar. `useKeymap` zeigt beschriftete Tastenbelegungen in `<KeyHelp>`, `<KeyHints>` (Belegungen mit `hint: true`) und der Befehlspalette an, verarbeitet Sequenzen wie `g g` und stoppt die Weitergabe bei passenden Tasten. Meldet `useInput`-Handler, die zwei oder mehr Tastenliterale (`minKeys`) vergleichen, und überspringt Handler, die `e.input` für Texteingaben lesen.

<!-- s:05d39412dc -->
Siehe [Tastenkürzel](/docs/keyboard).

<!-- s:3ee3017e0f -->
`valid-route-module`

<!-- s:d470bf26bc -->
- `page`-, `layout`-, `loading`-, `error`- und `not-found`-Dateien müssen eine Komponente als Standardexport bereitstellen (`TX015`).
- `export const dynamic` muss `"auto"`, `"force-static"` oder `"force-dynamic"` sein (`TX031`). Text.js unterstützt `"error"` aus Next.js nicht. Der Wert wird aus Seiten, Layouts und Route-Handlern gelesen. Schreibe ihn in Seiten und Layouts als reines String-Literal: `text build` liest ihn aus dem Quellcode, ohne das Modul auszuführen.

<!-- s:263d4a01aa -->
`valid-metadata`

<!-- s:1d3a134d04 -->
Metadata wird aus den Layouts und anschließend aus der Seite (oder `not-found`) zusammengeführt. Die Regel meldet, was der Router stillschweigend ignorieren würde:

<!-- s:fe9ebcbc0c -->
- `metadata` oder `generateMetadata` in `loading`- oder `error`-Dateien
- beide Exporte in einer Datei
- `async generateMetadata`: Der Aufruf erfolgt synchron, daher setzt ein Promise nie den Titel
- `title`, das weder ein String noch `{ default, template?, absolute? }` ist, oder ein falsch geschriebener Schlüssel
- `title.template` ohne `%s` oder in einer Seite, wo es keine Wirkung hat
- eine `description`, die kein String ist

<!-- s:c8c401c5e0 -->
`route-handler-exports`

<!-- s:877bcc12b1 -->
`route.ts`-Dateien beantworten nur die HTTP-Methoden, die sie exportieren: `GET`, `HEAD`, `POST`, `PUT`, `PATCH`, `DELETE` und `OPTIONS`. Kleingeschriebenes `get` oder `Post` wird nie aufgerufen (Anfragen erhalten `405`); der Vorschlag benennt es um. Gemeldet werden Standardexporte, Handler, die keine Funktionen sind, und andere Exporte, mit Ausnahme der [Routensegment-Konfiguration](/docs/caching) `dynamic` und `revalidate`. Verschiebe gemeinsam genutzten Code nach `lib/` oder liste zusätzliche Namen mit `{ allow: [...] }` auf.
