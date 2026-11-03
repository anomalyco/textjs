<!-- s:f0ba49aa8c -->
Text.js 0.4 dodał drugie miejsce renderowania strony. Domyślnie drzewo React strony działa w karcie przeglądarki. Strona eksportująca `runtime = "server"` działa na serwerze, a przeglądarka otrzymuje jej klatki.

<!-- s:1a12ccffbb -->
`Load` to komponent typu `async function`. Na serwerze wstrzymuje renderowanie do najbliższego `<Suspense>` lub `loading.tsx`, dopóki jego obietnica się nie rozwiąże, i może bezpośrednio odczytywać pliki, bazy danych oraz moduły `node:*`. Komponenty asynchroniczne wczytują dane i nie mogą używać hooków. Otaczające je zwykłe komponenty zachowują hooki, fokus, `useInput`, `<Link>` i `useRouter()`, które działają tak samo w obu środowiskach wykonawczych.

<!-- s:f6c454b214 -->
Zawartość pobierana przez przeglądarkę

<!-- s:6764f4bb25 -->
Strona renderowana po stronie serwera nie przesyła React, Yoga ani twoich tras. Przeglądarka wczytuje odtwarzacz klatek o rozmiarze około 21 kB po kompresji gzip, który zawiera `CellBuffer` i ten sam `CssConsoleDriver`, którego używa renderer klienta. Utrzymuje tę samą częstotliwość 15 klatek na sekundę, więc klatka renderowana po stronie serwera generuje takie samo wywołanie `console.log` jak po stronie klienta.

<!-- s:c1c4090983 -->
Protokół

<!-- s:20c7e299b3 -->
Każda karta otwiera własną sesję na serwerze: korzeń React, historię routera w pamięci i bufor komórek. Jeden endpoint obsługuje oba kierunki:

<!-- s:0cce1c98cc -->
Serwer wysyła tylko wiersze, których hash zmienił się od ostatniej klatki otrzymanej przez dane połączenie. Każdy wiersz jest wysyłany jako ciągi tekstu odwołujące się do tabeli stylów, do której można tylko dopisywać. Szerokie grafemy, klastry emoji i półprzezroczyste kolory docierają bez zmian.

<!-- s:bff22f361e -->
Klatki dzieli co najmniej 66 ms, a każda jest porównywana z tym, co gniazdo ostatnio zaakceptowało. Gdy wolne połączenie przestaje odbierać dane, stany pośrednie są pomijane, a następna klatka przechodzi do najnowszego stanu.

<!-- s:f0809ea8c7 -->
Jeśli strumień zostanie przerwany, odtwarzacz łączy się ponownie z identyfikatorem sesji w nagłówku `x-textjs-live` i wznawia tę samą sesję od nowej klatki kluczowej, zachowując jej stan. Identyfikatory sesji to losowe wartości 192-bitowe przechowywane w pamięci, nigdy w adresie URL. Sesja bez połączenia przestaje renderować i jest odmontowywana po 30 sekundach.

<!-- s:2c75bd5d29 -->
Oba endpointy odrzucają żądania z innych witryn, a każde zdarzenie wejściowe jest sprawdzane według stałego schematu. Sesja przyjmuje najwyżej 64 zdarzenia na żądanie POST i około 240 na sekundę.

<!-- s:a36b73dab0 -->
Komponenty asynchroniczne i dane

<!-- s:2620366315 -->
Obietnica każdego komponentu asynchronicznego jest buforowana dla danej sesji pod kluczem złożonym z komponentu i jego propsów, więc ponowiona próba renderowania korzysta z już trwającego żądania. Pamięć podręczna jest czyszczona przy zmianie trasy i po wywołaniu `router.refresh()`:

<!-- s:64ce138e40 -->
Moduły przeznaczone tylko dla serwera mają nazwy `*.server.ts`. Budowanie kończy się błędem, jeśli kod wysyłany do przeglądarki importuje taki moduł lub wbudowany moduł `node:*`, i wskazuje moduł importujący.

<!-- s:981308ad14 -->
Częściowe prerenderowanie

<!-- s:9142a7d770 -->
Częściowe prerenderowanie działa bez serwera. `text build` renderuje teraz każdą statyczną trasę raz i umieszcza jej pierwszą klatkę bezpośrednio w kodzie HTML trasy jako mały klasyczny `<script>`, dzięki czemu konsola wyświetla zawartość przed wczytaniem jakiegokolwiek modułu.

<!-- s:d51b081ec7 -->
Powłoka to wszystko, co renderuje się synchronicznie. Granica `<Suspense>`, która nadal czeka, wyświetla zawartość zastępczą, także dla komponentów asynchronicznych, a `fetch()` nigdy nie rozwiązuje się podczas renderowania powłoki.

<!-- s:33ba4145a3 -->
Gdy JavaScript się uruchamia, renderer klienta lub odtwarzacz klatek przesyła właściwą klatkę. Ponieważ wersja 0.4 także dopisuje klatki zamiast czyścić konsolę, renderer przeprowadzający hydratację uruchamia się z `initialClear: false` i wypisuje zawartość pod powłoką, a jego kurtyna przesuwa powłokę poza widok w tym samym cyklu rysowania DevTools. Konsola jest czyszczona dokładnie raz, przez powłokę.

<!-- s:f6986897ee -->
Powłoka jest renderowana w skonfigurowanym rozmiarze `viewport`, domyślnie `120 × 36`, ponieważ proces budowania nie zna rozmiaru konsoli odwiedzającego. Przy włączonym `viewport.responsive` pierwsza klatka na żywo dopasowuje rozmiar do zadokowanej konsoli. Trasy dynamiczne nie renderują powłoki, a `ppr: false` w pliku `text.config.ts` wyłącza prerenderowanie.

<!-- s:c61865edfd -->
Wybór środowiska wykonawczego

<!-- s:aa5baec7ef -->
Środowisko wykonawcze klienta pozostaje domyślne. Naciśnięcia klawiszy są odwzorowywane w tym samym zadaniu, a aplikację można wdrożyć na dowolnym hostingu statycznym. Środowisko wykonawcze serwera pasuje do dashboardów i widoków administracyjnych odczytujących prywatne dane oraz tras, których zależności nie chcesz umieszczać w pakiecie przeglądarkowym. Jedna aplikacja może łączyć oba środowiska, a nawigacja między nimi wczytuje docelowy adres URL jako nowy dokument.

<!-- s:68f8c75df7 -->
Pełny opis znajdziesz w sekcji [Renderowanie po stronie serwera](/docs/server-rendering).
