<!-- s:00c66df67a -->
Text.js 0.1 ist getaggt. Es ist die erste Version mit allen drei Schichten: `@textjs/core` zeichnet Frames in die Konsole, `@textjs/react` rendert React 19 in diese Frames, und `textjs` ergänzt einen App Router und eine CLI.

<!-- s:1aa5bba86a -->
Der App Router

<!-- s:4631fd1deb -->
Routen sind Ordner in `app/` und folgen den Konventionen des Next.js App Router. Das ist die `dashboard`-Vorlage aus `create-text-app`:

<!-- s:18fa0019a3 -->
Ein Layout umschließt jede untergeordnete Seite und behält seinen Zustand beim Navigieren bei. `<Link>` nimmt einen `shortcut` entgegen, sodass ein einzelner Tastendruck dem Link folgt, und `activeClassName` gestaltet den Link zur aktuellen Route:

<!-- s:5587be498a -->
Dynamische Segmente funktionieren genauso wie in Next.js. `[id]` wird zu einem Parameter, `[...slug]` erfasst den Rest des Pfads und `[[...slug]]` erfasst auch das übergeordnete Segment. Statische Segmente haben Vorrang vor dynamischen, und Routengruppen wie `(marketing)` organisieren Dateien, ohne die URL zu erweitern.

<!-- s:3a9a93d850 -->
`loading.tsx` und `error.tsx` umschließen ein Segment mit einer Suspense-Boundary und einer Error-Boundary. Die Fehlerkomponente erhält den Fehler und eine `reset`-Funktion:

<!-- s:142b529e3f -->
Route-Handler liegen in `app/api` und geben eine standardmäßige `Response` zurück:

<!-- s:fe0c29445c -->
Der Router hält `window.location` über `history.pushState` synchron, sodass Zurück, Vorwärts und Deep Links funktionieren, und schreibt `metadata.title` in `document.title`. Die App zeichnet in der Konsole, und die Seite enthält ein Fokus-Pad, das Eingaben erfasst.

<!-- s:6109f13d80 -->
Die CLI

<!-- s:bbc9d4be2d -->
- `text dev` startet Vite mit React Fast Refresh. Das Speichern einer Datei aktualisiert die Konsole an Ort und Stelle.
- `text build` erstellt einen Produktions-Build der App und ihrer Route-Handler.
- `text start` stellt den Build und die Route-Handler bereit.

<!-- s:1e1161891f -->
`create-text-app` erstellt ein Projektgerüst aus der Vorlage `starter` oder `dashboard`.

<!-- s:e2a33d088a -->
Der Inspektor

<!-- s:cdb3155210 -->
Drücke in einer laufenden App `` Ctrl+` `` oder `F2`, um den `[▼]`-Inspektor in der Konsole zu öffnen. Er zeigt die passende Route und ihre Parameter, die Größe des Frames, die Anzahl der Spans und die Phasenlaufzeiten sowie die Anzahl der Frames, die das Dirty Gate übersprungen hat. `W` zeichnet das Yoga-Layout als Drahtgittermodell.

<!-- s:c2600ceabc -->
Außerdem in 0.1

<!-- s:289b0a9973 -->
`@textjs/react` enthält PascalCase-Komponenten (`Box`, `Text`, `ScrollBox`, `Input`, `Textarea`, `Select`, `Tabs`, `Code`, `Markdown`, `Diff`, `Modal`, `Spinner`), `className`-Hilfsklassen im Tailwind-Stil, die in Zellen arbeiten, und themes. Das Layout läuft auf Yoga in WebAssembly.

<!-- s:8ad0f2154c -->
Die vollständige Liste steht im [Änderungsprotokoll](/changelog#v0-1-0).
