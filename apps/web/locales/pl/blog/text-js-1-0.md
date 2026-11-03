<!-- s:5a6798e6a5 -->
Dziś wydajemy Text.js 1.0, konsolowy framework dla aplikacji webowych.

<!-- s:e4787165f5 -->
Text.js renderuje aplikacje React 19 w konsoli DevTools przeglądarki Chrome, rysując layouty, routing, fokus, pola wprowadzania danych, formularze, wykresy i strumieniowany Markdown za pomocą `console.log`.

<!-- s:48b184a262 -->
Nowości w 1.0

<!-- s:7f7f2a9a76 -->
- **App Router.** `layout.tsx`, `page.tsx`, `[param]`, `loading.tsx`, `error.tsx`, `not-found.tsx` i `api/*/route.ts`, zsynchronizowane z `window.location`. Zgodny z konwencjami App Router frameworka Next.js.
- **Turbolog.** Yoga flexbox układa siatkę komórek, `CellBuffer` oparty na tablicy typowanej ją przechowuje, a koder długości serii zamienia ją w pojedyncze wywołanie `console.log(format, ...css)`. Klatki bez zmian nie wywołują konsoli.
- **Zestaw komponentów.** `Box`, `Text`, `ScrollBox`, `Input`, `Select`, `Tabs`, `Markdown`, `Diff`, wirtualizowana lista `List`, `Table`, `Tree`, wykresy, okna dialogowe, powiadomienia i paleta poleceń `Ctrl+K` z hooka `useKeymap`.
- **Dopisywane klatki.** Klatki są dopisywane poniżej poprzedniej, więc konsola nie miga pustką między klatkami. Więcej o tym we wpisie [Turbolog: eliminowanie migania](/blog/turbolog-eliminating-the-flash).
- **Tekst od prawej do lewej.** Tekst hebrajski i arabski jest renderowany w porządku wizualnym z kształtowaniem znaków arabskich dzięki implementacji UAX #9, która przechodzi wszystkie 770 241 przypadków testowych `BidiTest.txt`. Zobacz [Tekst od prawej do lewej w konsoli](/blog/right-to-left-text).
- **Responsywna konsola.** Text.js dopasowuje się do zadokowanego panelu DevTools, uwzględniając powiększenie strony i zawijanie paska narzędzi. Po oddokowaniu używa rozmiaru `120×36`.
- **`text run`.** Ta sama aplikacja App Router renderuje się w prawdziwym terminalu.
- **Narzędzia dla agentów i edytorów.** `text mcp` udostępnia twoją aplikację agentom programistycznym przez Model Context Protocol, a rozszerzenie Text.js DevTools dodaje panel obok panelu „Konsola”. `eslint-plugin-textjs` i rozszerzenie do VS Code również wchodzą w skład wersji 1.0.

<!-- s:b71c4a16bc -->
Jedna zmiana nazwy

<!-- s:b47aa37902 -->
Pakiet frameworka to teraz `@textjs/next`. Nazwa `textjs` była zajęta w npm. Zaktualizuj importy:

<!-- s:e4005009f1 -->
**Aktualizacja, 1.0.2:** pakiet to teraz `@textjs/app`, a `@textjs/next` jest przestarzały. Aby przejść na nowy pakiet, uruchom `bun remove @textjs/next && bun add @textjs/app` i importuj z `@textjs/app`.

<!-- s:5b35a47b90 -->
Liczby

<!-- s:2ee54da34c -->
Na gęsto wypełnionym pulpicie `100×32` (46 węzłów tekstowych, 149 spanów `%c`), zmierzone za pomocą `packages/core/test/perf.test.ts`:

<!-- s:9729def172 -->
| Klatka | Średnia |
| :-- | --: |
| Pełne odrysowanie (layout, rysowanie, kodowanie) | 0,163 ms |
| Edycja jednego wiersza (pisanie) | 0,011 ms |
| Bez zmian | 0,000 ms, 0 wywołań konsoli |

<!-- s:2fee8c4c3d -->
Obsługa niezmienionej klatki kończy się przed alokacją ciągu znaków, więc zmierzony czas dla klatek bez zmian wynosi 0,000 ms.

<!-- s:a0fa47c98f -->
Wypróbuj

<!-- s:aeb9cc2b5d -->
Otwórz [textjs.org](/) i naciśnij ⌘⌥J (Ctrl+Shift+J w systemach Windows i Linux). Witryna uruchamia aplikację Text.js w twojej konsoli, po jednym widoku na stronę. W [Playground](/playground) znajdziesz pulpit, strumieniowany Markdown i grę Snake. [OpenCode](/opencode) łączy się z twoim lokalnym serwerem OpenCode.

<!-- s:31dd2e762c -->
Pełna lista zmian znajduje się w [historii zmian](/changelog), a kod źródłowy w serwisie [GitHub](https://github.com/anomalyco/textjs).
