<!-- s:aca2697522 -->
Turbolog zamienia każdy commit React na jedno wywołanie `console.log` albo nie wykonuje żadnego, jeśli żadna komórka się nie zmieniła.

<!-- s:d01b048a1d -->
Cele

<!-- s:53b8b34f5a -->
1. **Jedno wywołanie na zmienioną klatkę.**
2. **Zero wywołań w bezczynności.** Niezmieniona klatka kończy przetwarzanie przed zbudowaniem ciągu znaków.
3. **Niewiele argumentów stylu.** 149 spanów `%c` na 3200 komórek gęstego panelu `100×32`.

<!-- s:e284ac0068 -->
Potok

<!-- s:28cb69fc5d -->
CellBuffer

<!-- s:55cc83174a -->
Klatka jest przechowywana w płaskich tablicach typowanych na znaki, kolory i atrybuty, alokowanych raz.

<!-- s:6215aa69f7 -->
Bramka zmian

<!-- s:617da960c4 -->
Dla każdego wiersza obliczany jest hash. Jeśli nic się nie zmieniło, sterownik kończy działanie wcześniej:

<!-- s:524a0717a4 -->
Podmiana klatek

<!-- s:3c7194b785 -->
Turbolog dopisuje klatki i czyści konsolę tylko przy pierwszej klatce, po `invalidate()`, w bezczynności po zgromadzeniu 100 klatek oraz przy 300 klatkach. DevTools usuwa wyczyszczone komunikaty od razu, ale rysuje nowe z ograniczeniem częstotliwości do 50 ms, więc czyszczenie przy każdej klatce powoduje miganie pustej konsoli. Dopisane klatki podmieniają się w ramach jednego rysowania, a span zasłaniający o zerowej szerokości ukrywa poprzednią klatkę. Przewiń w górę, aby zobaczyć wcześniejsze klatki.

<!-- s:7845be2cbb -->
Tempo wyświetlania klatek jest ograniczone do około 15 fps. Szybsze klatki resetują ogranicznik częstotliwości DevTools i są odrzucane.

<!-- s:a36177ad5b -->
Kodowanie długości serii

<!-- s:d4079278eb -->
Pasujące komórki łączą się w jeden span `%c`. Spany przechodzą przez znaki nowego wiersza, a ciągi CSS są internowane.

<!-- s:7fe20496b0 -->
Szczegóły dotyczące Chromium

<!-- s:ff8301db1f -->
- Dosłowny znak `%` jest zapisywany jako `%%`.
- Adresy URL i tekst `path:line` otrzymują znak word joiner, aby DevTools nie zmieniało ich stylu.
- Spany używają wyłącznie nieskróconych właściwości CSS. DevTools kopiuje każdą rozwiniętą właściwość do każdego wiersza.
- Spany są dostrojone tak, aby tła przylegały do siebie bez przerw.

<!-- s:41e36e3179 -->
Firefox i Safari

<!-- s:8b2f3136a1 -->
Chromium układa każdy wiersz spanu `%c` jako blok liniowy. Firefox i Safari zachowują spany jako elementy liniowe, więc ignorują pionowe marginesy i zawijają długie wiersze. `CssConsoleDriver` wykrywa przeglądarkę przez sprawdzanie obsługi funkcji CSS i dla tych dwóch konsol ustawia wysokość wiersza na 14 px bez marginesów, wyłącza zawijanie za pomocą `text-wrap-mode: nowrap` i wypycha wcześniejsze klatki poza widok zasłoną `line-height: 100vh`. Dopasowanie do konsoli pozostawia miejsce na kolumnę odnośników do źródła w przeglądarce Firefox. Safari umieszcza Menlo na początku listy fontów, ponieważ strony tej przeglądarki nie mogą używać zainstalowanego przez użytkownika fontu SF Mono, którym może posługiwać się Web Inspector. Przekaż `browser` do `createConsoleRoot`, aby samodzielnie wybrać konsolę.

<!-- s:66b07a5809 -->
Testy wydajności

<!-- s:7eebf99828 -->
`packages/core/test/perf.test.ts` na gęstym panelu `100×32`, średnia z 1000 klatek (Apple M5 Pro, Bun 1.4.4):

<!-- s:342771dd1f -->
| Klatka | Czas | Spany `%c` |
| :-- | --: | --: |
| Pełne odrysowanie (layout, rysowanie, kodowanie) | **0,163 ms** | 149 |
| Edycja jednego wiersza | **0,011 ms** | 149 |
| Bezczynność | **0,000 ms** | 0 |

<!-- s:8c3bf89160 -->
Strona [Status](/status) uruchamia ten sam potok w twojej przeglądarce. Uruchom `text.stats()` w DevTools podczas działania dema z [Playground](/playground).
