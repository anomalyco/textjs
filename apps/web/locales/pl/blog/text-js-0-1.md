<!-- s:00c66df67a -->
Wersja Text.js 0.1 ma już tag. To pierwsza wersja ze wszystkimi trzema warstwami: `@textjs/core` rysuje klatki w konsoli, `@textjs/react` renderuje React 19 w tych klatkach, a `textjs` dodaje App Router i CLI.

<!-- s:1aa5bba86a -->
App Router

<!-- s:4631fd1deb -->
Trasy to foldery w `app/`, zgodnie z konwencjami App Router we frameworku Next.js. Oto szablon `dashboard` z `create-text-app`:

<!-- s:18fa0019a3 -->
Layout otacza każdą stronę poniżej niego i zachowuje swój stan podczas nawigacji. `<Link>` przyjmuje `shortcut`, więc pojedynczy klawisz otwiera link, a `activeClassName` nadaje styl linkowi do bieżącej trasy:

<!-- s:5587be498a -->
Segmenty dynamiczne działają tak samo jak we frameworku Next.js. `[id]` staje się parametrem, `[...slug]` przechwytuje resztę ścieżki, a `[[...slug]]` pasuje również do rodzica. Segmenty statyczne mają pierwszeństwo przed dynamicznymi, a grupy tras takie jak `(marketing)` porządkują pliki bez dodawania czegokolwiek do adresu URL.

<!-- s:3a9a93d850 -->
`loading.tsx` i `error.tsx` otaczają segment granicą Suspense i granicą błędów. Komponent błędu otrzymuje błąd i funkcję `reset`:

<!-- s:142b529e3f -->
Handlery tras znajdują się w `app/api` i zwracają standardowy obiekt `Response`:

<!-- s:fe0c29445c -->
Router synchronizuje `window.location` przez `history.pushState`, więc działają przyciski „Wstecz”, „Dalej” i linki do konkretnych tras, a `metadata.title` jest zapisywane do `document.title`. Aplikacja rysuje w konsoli, a strona zawiera panel fokusu, który zbiera dane wejściowe.

<!-- s:6109f13d80 -->
CLI

<!-- s:bbc9d4be2d -->
- `text dev` uruchamia Vite z React Fast Refresh. Zapisanie pliku aktualizuje konsolę w miejscu.
- `text build` zapisuje produkcyjny build aplikacji i jej handlerów tras.
- `text start` serwuje build i handlery tras.

<!-- s:1e1161891f -->
`create-text-app` tworzy szkielet projektu na podstawie szablonu `starter` lub `dashboard`.

<!-- s:e2a33d088a -->
Inspektor

<!-- s:cdb3155210 -->
Naciśnij `` Ctrl+` `` lub `F2` w działającej aplikacji, aby otworzyć inspektor `[▼]` w konsoli. Pokazuje on dopasowaną trasę i jej parametry, rozmiar klatki, liczbę spanów i czasy faz oraz liczbę klatek pominiętych przez mechanizm dirty gate. `W` rysuje layout Yoga jako model szkieletowy.

<!-- s:c2600ceabc -->
Pozostałe nowości w 0.1

<!-- s:289b0a9973 -->
`@textjs/react` zawiera komponenty z nazwami w PascalCase (`Box`, `Text`, `ScrollBox`, `Input`, `Textarea`, `Select`, `Tabs`, `Code`, `Markdown`, `Diff`, `Modal`, `Spinner`), klasy narzędziowe `className` w stylu Tailwind, które działają na komórkach, oraz motywy. Layout oblicza silnik Yoga w WebAssembly.

<!-- s:8ad0f2154c -->
Pełna lista znajduje się w [historii zmian](/changelog#v0-1-0).
