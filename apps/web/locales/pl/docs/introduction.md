<!-- s:b3d5e86364 -->
Text.js to framework React do tworzenia aplikacji renderowanych w konsoli DevTools za pomocą `console.log`.

<!-- s:34bf1ea7dd -->
Podgląd działa na żywo. Kliknij go i naciśnij `↑`.

<!-- s:0bccbd98be -->
Zawartość

<!-- s:d3708efc68 -->
- **React 19**: renderowanie współbieżne, Suspense i granice błędów.
- **App Router**: layouty, strony, segmenty dynamiczne i handlery tras.
- **Layout Yoga**: flexbox w WebAssembly, wyrównany do komórek o całkowitych współrzędnych.
- **Turbolog**: jedno wywołanie `console.log` na zmienioną klatkę.
- **Interfejs konsoli**: strona zawiera tylko panel fokusu i ukryte pole wejściowe.

<!-- s:5ae438610c -->
Zasada działania

<!-- s:75f47f9f8c -->
Stan przepływa w dół: React, potem layout, potem bufor komórek, potem konsola.

<!-- s:25c55610d2 -->
Niezmienione klatki są pomijane, więc bezczynne aplikacje niczego nie wypisują w konsoli.

<!-- s:3a5d9cbc49 -->
Następne kroki

<!-- s:b849362c77 -->
- [Instalacja](/docs/installation): utwórz swoją pierwszą aplikację.
- [Routing](/docs/routing): strony, layouty i nawigacja.
- [Turbolog](/docs/turbolog-engine): sposób kodowania klatek.
- [OpenCode](/docs/opencode): interfejs TUI agenta zbudowany przy użyciu Text.js.
