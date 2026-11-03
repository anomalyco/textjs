<!-- s:5c794493de -->
Renderuj drzewo React trasy na serwerze i przesyłaj jego klatki strumieniowo do konsoli. Wykonuj prerenderowanie pierwszej klatki każdej statycznej trasy do jej kodu HTML.

<!-- s:f5f9690d9e -->
Dwa środowiska wykonawcze

<!-- s:26b5b0c1e5 -->
Każda strona renderuje się w jednym z dwóch miejsc:

<!-- s:2b217df435 -->
| | Klient (domyślnie) | Serwer (`runtime = "server"`) |
| --- | --- | --- |
| Miejsce działania drzewa React | Karta przeglądarki | `text dev` / `text start` / adapter `bun` (Bun lub Node) |
| Pobierane przez przeglądarkę | Cała aplikacja: React, Yoga WASM, twoje trasy | Odtwarzacz klatek, około 21 kB gzip |
| Dostęp do danych | `fetch()` do handlerów tras | Bezpośredni: bazy danych, pliki, `node:*`, sekrety |
| Komponenty asynchroniczne | Użycie `use()` lub efektów | Obsługa komponentów `async function` |
| Opóźnienie naciśnięcia klawisza | To samo zadanie, synchronicznie | Jedna wymiana z serwerem |
| Działanie na hostingu statycznym | Tak | Nie, wymaga `text start` lub `bun dist/server.js` |

<!-- s:7b06d151a6 -->
Oba środowiska wykonawcze generują te same klatki. Odtwarzacz klatek koduje komórki tym samym `CssConsoleDriver` i utrzymuje tę samą częstotliwość około 15 kl./s, więc klatka renderowana po stronie serwera odpowiada wywołaniu `console.log` klienta bajt po bajcie.

<!-- s:70a0b18bdd -->
Włączanie

<!-- s:660b2936b0 -->
Wyeksportuj `runtime` ze strony:

<!-- s:567f4b3d2b -->
`runtime` jest odczytywany osobno dla każdej strony jako statyczny eksport ciągu znaków (adnotacja typu, `as const` lub reeksport są dozwolone; wartość obliczana nie jest). Layouty, `loading.tsx`, `error.tsx` i `not-found.tsx` renderują się tam, gdzie ich strona: layout współdzielony przez strony klienckie i serwerowe działa w obu miejscach i trafia do przeglądarki, natomiast layouty i granice segmentu zawierającego wyłącznie strony serwerowe pozostają na serwerze. Hooki, fokus, `useInput`, `<Link>` i `useRouter()` działają tak samo jak po stronie klienta.

<!-- s:43c4fa1dac -->
Wybór środowiska

<!-- s:ac38ce3c55 -->
Używaj środowiska **klienckiego** (domyślnego) dla:

<!-- s:ced9e65891 -->
- Interfejsów z intensywnym wpisywaniem, w których każde naciśnięcie klawisza musi zostać wyrenderowane w tym samym zadaniu, takich jak edytory i filtry.
- Aplikacji wdrażanych na hostingu statycznym lub w CDN.
- Narzędzi działających offline.

<!-- s:54292284aa -->
Używaj środowiska **serwerowego** dla:

<!-- s:bb8a20e6e2 -->
- Pulpitów i widoków administracyjnych odczytujących bazy danych, pliki, kolejki lub prywatne API. Dane uwierzytelniające pozostają na serwerze.
- Tras z ciężkimi zależnościami (SDK, parsery, tablice składni), których nie chcesz w paczce przeglądarkowej.
- Stron, które powinny szybko się ładować przy wolnym połączeniu. Przeglądarka pobiera odtwarzacz o rozmiarze 21 kB (gzip) zamiast całej aplikacji.

<!-- s:920f4ad7e8 -->
Możesz łączyć środowiska wykonawcze w jednej aplikacji. Nawigacja między nimi ładuje docelowy URL jako nowy dokument. Paczka przeglądarkowa zastępuje każdą stronę serwerową atrapą, więc moduły serwerowe i wszystko, co importują, nigdy nie trafiają do klienta.

<!-- s:2de98cc507 -->
Nazywaj moduły przeznaczone wyłącznie dla serwera `*.server.ts`. Budowanie kończy się błędem wskazującym moduł importujący, jeśli kod wysyłany do przeglądarki (strona kliencka lub używany przez nią layout) importuje moduł `*.server.*` lub moduł wbudowany `node:*`.

<!-- s:1c109f371d -->
[Middleware](/docs/middleware) chroni trasy serwerowe tak samo jak dokumenty: uruchamia się dla trasy docelowej przed otwarciem sesji, przed każdą nawigacją w sesji (`router.push`, Wstecz i Dalej) oraz ponownie po każdej zmianie ciasteczek sesji lub `Authorization`. Gdy miałoby przekierować, odrzucić lub przepisać żądanie, przeglądarka zamiast tego ładuje URL jako dokument, a middleware odpowiada na to żądanie.

<!-- s:44ec23073a -->
Asynchroniczne komponenty serwerowe

<!-- s:491e80d70d -->
Na serwerze każdy komponent `async function` wstrzymuje renderowanie do najbliższej granicy `<Suspense>` lub `loading.tsx`, dopóki jego obietnica nie zostanie rozwiązana:

<!-- s:155b6ae10f -->
Każda obietnica jest buforowana osobno dla sesji, z kluczem opartym na komponencie i propsach, więc ponowiona próba renderowania korzysta z już trwającego żądania. Pamięć podręczna jest czyszczona przy zmianie trasy i wywołaniu `router.refresh()`. Aby ponownie pobrać dane po wprowadzeniu danych wejściowych, wywołaj `router.refresh()`:

<!-- s:abfa753a7c -->
Propsy przekazywane do komponentów asynchronicznych powinny być serializowalne: ciągi znaków, liczby, zwykłe obiekty, tablice, `Date`, `URL`, `Map`, `Set` i elementy. Propsy funkcyjne nie są częścią klucza (przekazuj dane, nie callbacki). Każda sesja buforuje najwyżej 256 obietnic. Możesz też ręcznie opakować komponent za pomocą `serverComponent(fn)` z `@textjs/app/server-components`.

<!-- s:55cf9764ac -->
Hooki (`useState`, `useInput`, …) nie działają wewnątrz komponentu `async function`. Aby obsłużyć interakcję, wyrenderuj zwykły komponent wokół niego lub pod nim.

<!-- s:5ae438610c -->
Zasada działania

<!-- s:ec3e56dbc6 -->
- **Jedna sesja na kartę.** Każde załadowanie strony otwiera własną sesję: korzeń React, historię routera w pamięci i bufor komórek na serwerze. Identyfikatory sesji to 192-bitowe wartości losowe, które przeglądarka przechowuje wyłącznie w pamięci.
- **Różnice komórek.** Serwer wysyła tylko wiersze, których hash zmienił się od ostatniej klatki odebranej przez dane połączenie. Każdy wiersz jest wysyłany jako ciągi tekstu odnoszące się do tabeli stylów, do której można tylko dopisywać, a szerokie grafemy, klastry emoji i półprzezroczyste kolory zostają dokładnie zachowane.
- **Kontrola przepływu.** Klatki dzieli co najmniej 66 ms, a każda jest porównywana z tym, co gniazdo ostatnio przyjęło. Gdy wolne połączenie przestaje odbierać dane, stany pośrednie są pomijane, a następna klatka przechodzi od razu do najnowszego stanu.
- **Ponowne połączenia.** Jeśli strumień zostanie przerwany, odtwarzacz łączy się ponownie z identyfikatorem sesji w nagłówku `x-textjs-live` (nigdy w URL) i wznawia tę samą sesję z zachowanym stanem od nowej klatki kluczowej. Pominięte aktualizacje paska adresu są odtwarzane. Sesja bez połączenia przestaje renderować i jest odmontowywana po 30 sekundach; jeśli serwer już jej nie pamięta, odtwarzacz otwiera nową.
- **Historia.** Wstecz i Dalej przesuwają obie historie o tę samą liczbę wpisów, a `router.back()` na serwerze przesuwa też historię przeglądarki.
- **Bezpieczeństwo.** Oba endpointy odrzucają żądania z innych witryn (`Sec-Fetch-Site` i `Origin`; `X-Forwarded-Host` jest uwzględniany tylko z `server.trustProxy`). Żądania POST z danymi wejściowymi wymagają treści JSON i nagłówka `x-textjs-live`. Każde zdarzenie jest walidowane według stałego schematu, a cele nawigacji muszą być ścieżkami w twoim originie. Renderowane mogą być tylko strony z manifestu `app/`. Sesje są powiązane z ciasteczkami, z którymi je otwarto.
- **Limity.** Najwyżej 64 zdarzenia na POST i około 240 na sekundę na sesję (`429` po przekroczeniu), 5-sekundowy limit czasu przesłania treści, 32 sesje na adres klienta oraz `maxSessions` na proces (najpierw usuwana jest sesja najdłużej pozostająca bez połączenia).

<!-- s:981308ad14 -->
Częściowe prerenderowanie

<!-- s:294fed5642 -->
`text build` renderuje każdą statyczną trasę raz, w skonfigurowanym rozmiarze `viewport`, i osadza pierwszą klatkę w kodzie HTML trasy jako mały, klasyczny `<script>`. Konsola wyświetla ją, zanim załaduje się jakikolwiek moduł:

<!-- s:7eb15c9cc8 -->
1. **Statyczna powłoka.** Wszystko, co renderuje się synchronicznie. Każda granica `<Suspense>`, która nadal czeka, pokazuje treść zastępczą, w tym dla asynchronicznych komponentów serwerowych (które nie uruchamiają się podczas renderowania powłoki), `use()` i modułów ładowanych leniwie. `fetch()` nigdy nie kończy się podczas renderowania powłoki, więc dane ładowane w efektach też pozostają w stanie ładowania.
2. **Dynamiczne luki.** Gdy uruchomi się JavaScript, renderer klienta lub odtwarzacz klatek przesyła strumieniowo właściwą klatkę. Jest ona dopisywana pod powłoką, a własna kurtyna klatki hydratacyjnej usuwa powłokę z widoku w tym samym cyklu rysowania DevTools. Powłoka zapisuje czas swojego wyświetlenia, więc pierwsza klatka hydratacyjna przeczekuje okno DevTools po czyszczeniu, zamiast trafić na wolną ścieżkę.

<!-- s:94c6827f2c -->
Podczas ładowania tylko powłoka czyści konsolę. Renderer hydratacyjny uruchamia się w trybie dopisywania (`initialClear: false`), więc nic nie miga, a powłoka wyświetla się tylko na ścieżce, dla której została wyrenderowana. Trasy dynamiczne (`[id]`, `force-dynamic`) nie renderują powłoki.

<!-- s:1eef464bae -->
Wyłącz tę funkcję przez `ppr: false` w `text.config.ts`. Prerenderowanie uruchamia twoje komponenty podczas budowania, więc nie używaj w kodzie najwyższego poziomu modułów obiektów globalnych dostępnych tylko w przeglądarce. Trasa, która podczas prerenderowania zgłasza wyjątek, wywołuje `redirect()` / `notFound()` lub nawiguje, nie otrzymuje powłoki (ekran błędu nigdy nie jest zapisywany w HTML), a proces budowania podaje przyczynę.

<!-- s:c50a022df3 -->
Powłoka jest renderowana w rozmiarze `viewport.width × viewport.height` (domyślnie `120 × 36`), ponieważ proces budowania nie może znać rozmiaru konsoli odwiedzającego; klatka hydratacyjna dopasowuje się następnie do rzeczywistej konsoli. Powłoka to osadzony `<script>`: jeśli polityka Content Security Policy zabrania skryptów osadzonych, zezwól na niego za pomocą hasha lub ustaw `ppr: false`.

<!-- s:ff96d35008 -->
Wdrażanie

<!-- s:e8a05a5448 -->
`text build` zapisuje następujące pliki:

<!-- s:8e75669ec0 -->
| Plik | Przeznaczenie |
| --- | --- |
| `index.html`, `<route>/index.html` | Trasy klienckie z ich powłokami. Działają na dowolnym hostingu statycznym. |
| `assets/player-[hash].js` | Odtwarzacz klatek. |
| `.text/server/live.mjs` | Trasy serwerowe, App Router i renderer konsoli. |
| `.text/pages/…`, `.text/live.html` | Dokumenty tras serwerowych. |
| `.text/ansi/…` | Pierwsze klatki dla [curl i innych klientów terminalowych](/docs/curl). |

<!-- s:5782e0e345 -->
`text start` i [adapter `bun`](/docs/deploying#bun) serwują je wszystkie. Trasy serwerowe wymagają długotrwałego procesu: adaptery `static`, `vercel` i `cloudflare` kończą budowanie błędem (`TX030`).
