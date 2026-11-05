<!-- s:c88a0b9074 -->
Sukces

<!-- s:232761cbc8 -->
Nie wystąpił żaden błąd.

<!-- s:0dbfdefc62 -->
Nie musisz nic robić.

<!-- s:5278892fa4 -->
Yoga nie została zainicjalizowana

<!-- s:3cc543df2e -->
Layout korzysta z Yoga, która jest dostarczana jako WebAssembly i wymaga utworzenia instancji przed pierwszą klatką. Coś synchronicznie utworzyło węzeł sceny lub korzeń, zanim zakończyło się `initYoga()`.

<!-- s:08db9c8a11 -->
Użyj asynchronicznych funkcji pomocniczych do tworzenia korzenia, które zainicjalizują Yoga za ciebie:

<!-- s:0cc02c96a3 -->
Jeśli potrzebujesz `createConsoleRootSync()` lub bezpośredniego dostępu do grafu sceny z modułu core, poczekaj na `initYoga()` raz przy uruchamianiu:

<!-- s:0f5cc351a1 -->
W aplikacjach uruchamianych przez `text dev` ten błąd nigdy nie występuje.

<!-- s:cebca37b05 -->
Renderowanie poza korzeniem konsoli

<!-- s:c3b259f977 -->
Hook lub komponent Text.js (`useInput`, `<ScrollBox>`, …) został wyrenderowany pod korzeniem React, który nie jest korzeniem konsoli, najczęściej przez `react-dom` renderujący komponent przeznaczony do konsoli.

<!-- s:6f1ee54e3e -->
Renderuj komponenty konsoli przez `renderToConsole` (lub `createConsoleRoot`), zamiast przez `react-dom`:

<!-- s:c7cb019122 -->
Aby wyświetlić ten sam interfejs na stronie, użyj `<TextCanvas>` z `@textjs/react/dom`, który tworzy własny korzeń konsoli.

<!-- s:b657e4704a -->
Nieznany element hosta

<!-- s:a8bb5bc9a5 -->
Reconciler rozpoznaje tylko dwa elementy wbudowane: `tx-box` i `tx-text`. Trafił do niego element o nazwie pisanej małymi literami, taki jak `<div>` lub `<span>`.

<!-- s:407e421c11 -->
Zamiast tego użyj eksportowanych komponentów:

<!-- s:2381168639 -->
<Box> zagnieżdżony wewnątrz <Text>

<!-- s:2e17219271 -->
`<Text>` rozmieszcza ciąg tekstu w wierszu; nie może zawierać kontenera Flexbox. Wewnątrz `<Text>` wyrenderowano `<Box>` (lub komponent, który go renderuje, taki jak `<Spacer>` lub `<Divider>`).

<!-- s:cd12727fb7 -->
Przenieś `<Box>` na zewnątrz i umieść równorzędne elementy tekstowe obok siebie w wierszu:

<!-- s:0346a73e37 -->
Zagnieżdżony `<Text>` jest dozwolony; renderuje się jako span w wierszu.

<!-- s:32864d644a -->
Renderowanie po odmontowaniu

<!-- s:c194b81d64 -->
Wywołano `root.render()` na korzeniu konsoli po `root.unmount()`. Odmontowany korzeń zwolnił swój renderer i funkcje nasłuchujące zdarzeń wejściowych.

<!-- s:4d43c601c1 -->
Utwórz nowy korzeń lub pozostaw korzeń zamontowany i wyrenderuj inne drzewo:

<!-- s:41d1a6160d -->
W testach sprawdzaj `root.unmounted` przed renderowaniem z asynchronicznych funkcji zwrotnych.

<!-- s:c5d7700094 -->
Nieznany modyfikator w kombinacji klawiszy

<!-- s:7729dd7762 -->
Każda część kombinacji przed ostatnim `+` musi być modyfikatorem: `ctrl`, `alt` (`option`), `shift`, `meta` (`cmd`) lub `mod` (`⌘` na urządzeniach Apple, `Ctrl` na pozostałych).

<!-- s:d5ba2b08ed -->
Nieznany klawisz w kombinacji klawiszy

<!-- s:a68eb32bc2 -->
Ostatnia część kombinacji musi być pojedynczym znakiem, nazwanym klawiszem (`enter`, `escape`, `tab`, `up`, `pagedown`, `space`, …) lub klawiszem funkcyjnym (`f1`–`f12`).

<!-- s:69f231367c -->
Sekwencje to naciśnięcia klawiszy oddzielone spacjami (`"g g"`). Alternatywy są oddzielone przecinkami (`"j, down"`).

<!-- s:92663abe8d -->
Pusta kombinacja klawiszy

<!-- s:aa16466cb6 -->
Kombinacja zakończyła się bez klawisza, na przykład `"ctrl+"` lub `""`.

<!-- s:13284de673 -->
Podaj klawisz. Aby przypisać sam klawisz plus, wpisz `"ctrl++"`:

<!-- s:f329e5f580 -->
Oczekiwano pojedynczego naciśnięcia klawiszy

<!-- s:95712ddbf5 -->
Naciśnięcie klawiszy to jedno konkretne naciśnięcie. Funkcja `keyEventFromCombo()` otrzymała sekwencję taką jak `"g g"` lub narzędzie MCP `press` otrzymało alternatywy takie jak `"a,b"`.

<!-- s:0348879743 -->
Utwórz jedno zdarzenie na każde naciśnięcie. Funkcja `app.press()` w testach i narzędzie MCP `press` dzielą za ciebie sekwencje oddzielone spacjami:

<!-- s:467193a3d5 -->
Brak stdout dla renderToTerminal

<!-- s:76fa9d629b -->
`renderToTerminal()` domyślnie zapisuje klatki ANSI do `process.stdout`. Uruchomiono tę funkcję w środowisku bez tego strumienia (przeglądarka, worker) i nie przekazano opcji `stdout`.

<!-- s:90c3d0ac1f -->
Uruchom ją w środowisku Bun lub Node albo przekaż strumień z możliwością zapisu:

<!-- s:d3a77e5829 -->
W przeglądarce użyj zamiast tego `renderToConsole`.

<!-- s:f201fe8e80 -->
<Image src> bez DOM

<!-- s:b9f409f560 -->
`<Image src>` dekoduje obrazy za pomocą `<img>` i elementu canvas. Nie ma tu `document` (terminal, serwer, testy), więc nie można wczytać adresu URL.

<!-- s:3c284cd278 -->
Zdekoduj obraz samodzielnie i przekaż piksele RGBA:

<!-- s:775d3d31e6 -->
Brak płótna 2D dla <Image>

<!-- s:7da15f3e88 -->
Przeglądarka odmówiła utworzenia kontekstu płótna `2d`, zwykle dlatego, że zasady lub ochrona przed fingerprintingiem wyłączają płótno albo stronie zabrakło pamięci GPU.

<!-- s:59ad35999f -->
Przekaż `pixels` zdekodowane w innym miejscu lub wyrenderuj tekst zastępczy `alt`. `<Image>` już wyświetla swój tekst `alt`, gdy ładowanie się nie powiedzie:

<!-- s:ca446b6432 -->
Nie udało się załadować <Image>

<!-- s:f11b7bffe8 -->
Żądanie obrazu nie powiodło się: błąd 404, błąd sieci lub serwer z innego źródła, który nie wysyła `Access-Control-Allow-Origin`. Piksele są odczytywane z płótna, więc obrazy z innych źródeł wymagają CORS.

<!-- s:5e5daf0ad8 -->
Udostępnij obraz z własnego źródła (`public/`) lub włącz CORS na serwerze obrazu:

<!-- s:aca80fe237 -->
Użycie poza <AppRouter>

<!-- s:0fca8db90b -->
`useRouter`, `usePathname`, `useParams`, `useSearchParams`, `useAppTheme` i `<Link>` odczytują stan udostępniany przez `<AppRouter>`. Komponent został wyrenderowany poza nim, zwykle w osobnym wywołaniu `renderToConsole` lub teście jednostkowym.

<!-- s:0dd134139b -->
Uruchom aplikację poleceniem `text dev`, `text start` lub `text run`, które montują `<AppRouter>` za ciebie. Przy ręcznym renderowaniu (testy, osadzenia) zamontuj router zamiast strony:

<!-- s:f72dd41076 -->
Brak domyślnego komponentu w pliku trasy

<!-- s:bb105b223b -->
Pliki `page`, `layout`, `loading`, `error` i `not-found` muszą eksportować komponent React przez `export default`. Ten plik nie eksportuje niczego domyślnie lub eksportuje coś, co nie jest funkcją.

<!-- s:737da9f930 -->
Handler trasy nie zwrócił Response

<!-- s:cb8f799843 -->
Handler w pliku `route.ts` zwrócił `undefined` (lub inną wartość niebędącą `Response`), zwykle z powodu braku `return` w jednej z gałęzi.

<!-- s:ec7e161fb3 -->
Zwróć `Response` z każdej gałęzi:

<!-- s:62e5198b56 -->
Brak kompilacji produkcyjnej

<!-- s:6668a2f9b4 -->
`text start` udostępnia wynik polecenia `text build`, a katalog wyjściowy (`outDir`, domyślnie `dist`) nie zawiera kompilacji.

<!-- s:498f1313ed -->
Jeśli zmieniono `outDir` w pliku `text.config.ts`, uruchom oba polecenia z tego samego katalogu głównego projektu.

<!-- s:dfda64bc1d -->
Brak katalogu app/

<!-- s:38ac920023 -->
`text run` renderuje App Router w twoim terminalu i nie mógł znaleźć katalogu tras.

<!-- s:6853e006ef -->
Uruchom polecenie z katalogu głównego projektu lub podaj katalog projektu:

<!-- s:5a6362131f -->
text run / text mcp wymagają Bun

<!-- s:773405124b -->
`text run` i `text mcp` importują bezpośrednio pliki tras `.tsx`, co wymaga natywnego modułu ładującego TypeScript w środowisku Bun. Po uruchomieniu w środowisku Node CLI uruchamia się ponownie w środowisku Bun, jeśli `bun` znajduje się w `PATH`; ten błąd oznacza, że go tam nie ma.

<!-- s:6f7a84fdc6 -->
Zainstaluj [Bun](https://bun.sh) lub uruchom polecenie bezpośrednio w środowisku Bun:

<!-- s:c6dc53e7c3 -->
`text dev`, `text build` i `text start` działają w środowisku Node.

<!-- s:89a2fef8aa -->
Nieznane polecenie CLI

<!-- s:eba41925ed -->
CLI `text` ma sześć poleceń: `dev`, `build`, `start`, `run`, `proxy` i `mcp`.

<!-- s:8399f0df32 -->
Polecenie `text deploy` nie istnieje. Zbuduj aplikację dla swojej platformy poleceniem `text build --adapter <name>` i wdróż wynik za pomocą CLI tej platformy. Zobacz [Wdrażanie](/docs/deploying).

<!-- s:ca76fd96a5 -->
Nieprawidłowy URL serwera OpenCode

<!-- s:486a7eb67b -->
`--target` (lub `OPENCODE_SERVER_URL`) musi zawierać sam adres źródła HTTP(S). Zawierał ścieżkę, zapytanie, fragment lub dane uwierzytelniające. Dane uwierzytelniające w adresach URL trafiają do logów i historii przeglądarki.

<!-- s:a2f7bb7ff8 -->
Zamiast tego ustaw hasło serwera przez `OPENCODE_PASSWORD`.

<!-- s:f606233e6c -->
Port mostu koliduje z OpenCode

<!-- s:8780127b8f -->
Most miał nasłuchiwać na tym samym porcie lokalnym co serwer OpenCode, do którego przekazuje ruch.

<!-- s:0b359d8121 -->
Most już działa

<!-- s:76e9990092 -->
Inny most (`bunx @textjs/opencode@latest proxy` lub `text proxy`) już nasłuchuje na tym porcie. Możesz się z nim połączyć zamiast uruchamiać kolejny.

<!-- s:d5c7dd3e92 -->
Połącz się z działającym mostem lub uruchom drugi na innym porcie:

<!-- s:20a5f0b929 -->
Port mostu jest zajęty

<!-- s:4fb3fcf34c -->
Na żądanym porcie nasłuchuje coś innego niż most Text.js.

<!-- s:4a35b098e4 -->
Lub znajdź inny proces: `lsof -i :4096`.

<!-- s:f694899be6 -->
Nieznany szablon

<!-- s:13309ae8df -->
`--template` musi wskazywać jeden z dołączonych szablonów: `starter`, `dashboard` lub `opencode`.

<!-- s:162e762178 -->
Katalog docelowy nie jest pusty

<!-- s:24518256d0 -->
create-text-app tworzy szkielet projektu tylko w nowym lub pustym katalogu, więc nigdy nie nadpisuje twoich plików. Katalog `.git` i foldery edytorów (`.vscode`, `.idea`) są dozwolone.

<!-- s:2d505908ff -->
Wybierz nową nazwę katalogu:

<!-- s:0c1a816fb9 -->
Nieprawidłowa nazwa projektu

<!-- s:46e6e56ab7 -->
Nazwa katalogu staje się nazwą w `package.json`, która musi być prawidłową nazwą pakietu npm: zapisaną małymi literami, odpowiednią do użycia w URL, liczącą najwyżej 214 znaków i inną niż `textjs`, `react`, `react-dom`, `node_modules` lub `favicon.ico`.

<!-- s:5aa32a2677 -->
Zablokowany host

<!-- s:7c7e94bc6b -->
`text dev` oraz `text start` nasłuchujący na adresie pętli zwrotnej (domyślnie) odpowiadają tylko na żądania kierowane do `localhost`, nazwy `*.localhost` lub adresu IP. Chroni je to przed atakami DNS rebinding. Nadeszło żądanie z innym nagłówkiem `Host`, zwykle przez tunel, odwrotne proxy lub nazwę hosta w sieci LAN.

<!-- s:8caece973a -->
Zezwól na host w `text.config.ts`. `text dev` odczytuje `vite.server.allowedHosts` narzędzia Vite, a `text start` odczytuje `server.allowedHosts`. Początkowa `.` zezwala na subdomeny:

<!-- s:2c7d7369a1 -->
`text start --host` z adresem innym niż adres pętli zwrotnej pomija tę kontrolę. Zobacz [Za proxy](/docs/deploying#behind-a-proxy).

<!-- s:5bb33b3415 -->
Nieznana opcja text.config

<!-- s:5117146873 -->
Plik `text.config.ts` wyeksportował klucz, którego Text.js nie odczytuje, zwykle z literówką (`basepath` zamiast `basePath`) lub opcję Vite na najwyższym poziomie.

<!-- s:31ae46d91d -->
Popraw pisownię lub przenieś opcje Vite do `vite`:

<!-- s:7f45c35d94 -->
`defineConfig` sprawdza typy konfiguracji i wykrywa te błędy w twoim edytorze.

<!-- s:d1de5d5931 -->
Trasy renderowane po stronie serwera wymagają stale działającego serwera

<!-- s:d06541fc12 -->
Strona eksportuje `runtime = "server"`: renderuje się na serwerze i przesyła strumieniowo klatki do każdej otwartej karty w sesji, która trwa tak długo jak karta. Hosting statyczny, Vercel Functions i Cloudflare Workers nie mogą utrzymywać tych sesji, więc `text build --adapter static|vercel|cloudflare` odrzuca aplikację zamiast dostarczać trasy, których nie da się wyrenderować.

<!-- s:27f8e0c99e -->
Wdróż aplikację na serwerze, który działa stale:

<!-- s:3ba9e63872 -->
Lub renderuj trasę w przeglądarce, usuwając eksport:

<!-- s:b39194c0e6 -->
Nieprawidłowy eksport dynamic

<!-- s:218844a290 -->
Handler trasy eksportuje `dynamic` z wartością, której Text.js nie obsługuje. Next.js akceptuje też `"error"`, co renderuje trasę statycznie i przerywa budowanie, jeśli trasa odczytuje dane żądania. Text.js nie potrafi wykrywać odczytów żądania, więc odrzuca `"error"`.

<!-- s:78a6bdcb90 -->
Użyj `"force-static"`, aby zapisać handler w pamięci podręcznej. Handler zapisany w pamięci podręcznej otrzymuje żądanie bez ciągu zapytania, nagłówków, plików cookie ani treści:

<!-- s:95d0435b57 -->
Użyj `"force-dynamic"` lub usuń eksport, jeśli handler odczytuje żądanie. Zobacz [Pamięć podręczna](/docs/caching).

<!-- s:fa8a66bf23 -->
Nie udało się załadować WebAssembly biblioteki Yoga

<!-- s:f2aaa80b0f -->
`initYoga()` ładuje WebAssembly biblioteki Yoga z pliku `.wasm` w aplikacjach Text.js (`text dev`, `text build`), w kompilacjach ustawiających warunek rozwiązywania modułów `@textjs/client` oraz gdy przekażesz `initYoga({ wasm })`. Zapytanie nie powiodło się, zwróciło status błędu lub odpowiedź nie była poprawnym WebAssembly. Błąd podaje URL oraz `Content-Type` wysłany przez serwer. Typowe przyczyny to serwer, który pod adresem URL pliku `.wasm` zwraca zastępczą stronę HTML, oraz polityka Content Security Policy bez `'wasm-unsafe-eval'` w `script-src`.

<!-- s:9de0a578e9 -->
Skonfiguruj adres URL podany w błędzie tak, aby zwracał plik z `Content-Type: application/wasm`, co pozwoli kompilować go podczas pobierania. Reguła przepisywania, która serwuje `index.html` dla nieznanych ścieżek, musi pomijać `/assets/`. Zezwól na WebAssembly w polityce Content Security Policy:

<!-- s:510b3ade73 -->
Jeśli samodzielnie montujesz konsolę i serwujesz plik z innego miejsca, przed `createConsoleRoot()` wywołaj `initYoga()` z adresem URL pliku, jego bajtami lub skompilowanym modułem `WebAssembly.Module`. Tylko pierwsze wywołanie ładuje Yoga:

<!-- s:ed5dce1787 -->
Zobacz [WebAssembly](/docs/deploying#webassembly).
