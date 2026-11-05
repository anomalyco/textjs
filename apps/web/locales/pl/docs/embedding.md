<!-- s:7e7d3cb07e -->
`text build --embed` buduje aplikację tak, aby inna witryna mogła dodać ją jednym tagiem skryptu, na przykład strona marketingowa, witryna z dokumentacją, strona WordPress lub Webflow albo aplikacja React 18. Odwiedzający, którzy otworzą DevTools, zobaczą twoją aplikację w konsoli. Pozostali pobierają `embed.js` (około 3 kB po kompresji gzip) i nic więcej, chyba że strona zawiera `<text-console>`.

<!-- s:2aa1d07d89 -->
Osadzanie jest eksperymentalne. `text build --embed`, opcja `embed`, `<text-console>` i eksporty `@textjs/app/experimental` mogą się zmienić w wydaniu minor. Zobacz [Zmiany niezgodne wstecz](/docs/support-policy#breaking-changes).

<!-- s:6d2aa784de -->
Dodawanie aplikacji do witryny

<!-- s:f296ccaeef -->
Zbuduj aplikację:

<!-- s:2198c52791 -->
Prześlij `dist/` na dowolny hosting statyczny lub CDN albo skopiuj go do folderu `public/` witryny, a następnie dodaj jeden tag do jej stron:

<!-- s:aa94ef1985 -->
`embed.js` ładuje pozostałe pliki względem własnego adresu URL, więc `dist/` działa pod dowolną ścieżką i z dowolnego źródła. Zawiera tylko `embed.js` i `assets/`, bez plików `index.html` ani `404.html`, które mogłyby zastąpić pliki witryny. Aplikacja z [trasami renderowanymi po stronie serwera](#server-rendered-routes), handlerami tras lub middleware wymaga serwera zamiast samego przesłania plików statycznych. Adaptery `vercel` i `cloudflare` uruchamiają handlery tras i middleware, a trasy renderowane po stronie serwera wymagają `text start` lub adaptera `bun`.

<!-- s:5c139759a2 -->
Aby pokazać odwiedzającym, gdzie jest aplikacja, dodaj [`<text-console>`](#text-console) w dowolnym miejscu strony. Każdy element z `data-textjs-engage` również uruchamia aplikację po naciśnięciu:

<!-- s:6a70ec16e1 -->
Aby wypróbować to lokalnie, uruchom `text dev --embed`. Udostępnia `/embed.js` ze świeżą pierwszą klatką przy każdym żądaniu oraz stronę podglądu pod `/` (`/__textjs/embed` przy `standalone`), która ładuje go tak jak inna witryna. Witryna na innym lokalnym porcie też może załadować `http://localhost:3000/embed.js`.

<!-- s:37f210b46a -->
Konfiguracja

<!-- s:aa9630bf92 -->
`text build --embed` działa tak samo jak `embed: true` w `text.config.ts`. Przekaż obiekt, aby zmienić wartości domyślne:

<!-- s:fbe8efc9f4 -->
| Opcja | Wartość domyślna | Opis |
| :-- | :-- | :-- |
| `initialPath` | `"/"` | Trasa, na której otwiera się konsola. Musi zaczynać się od `/` |
| `globalName` | `"text"` | Nazwa zmiennej globalnej, pod którą aplikacja udostępnia swoje API konsoli po uruchomieniu. `false` nie tworzy żadnej |
| `initialClear` | `false` | Wyczyść konsolę strony przed pierwszą klatką. Domyślnie wcześniejsze wpisy strony pozostają nad aplikacją |
| `standalone` | `false` | Zbuduj też własne strony aplikacji (`index.html`), tak jak robi to `text build` bez `embed` |
| `allowOrigins` | `[]` | Witryny, których strony mogą uruchamiać trasy renderowane po stronie serwera z tego serwera. Zobacz [Trasy renderowane po stronie serwera](#server-rendered-routes) |
| `credentials` | `false` | Wysyłaj dane uwierzytelniające przeglądarki dla tego serwera z żądaniami sesji na żywo z `allowOrigins`, zamiast usuwać ciasteczka i `Authorization`. Wymaga dokładnych źródeł |

<!-- s:12a3d28167 -->
`viewport.width × viewport.height` (domyślnie 120 × 36) to rozmiar pierwszej klatki. `title`, `hints` i `action` to wartości domyślne `<text-console>`. `embed.js` nie zawiera prerenderowanej pierwszej klatki przy `ppr: false` ani gdy `middleware.ts` może pasować do `initialPath`, ponieważ każdy może pobrać `embed.js`. Podgląd pozostaje pusty, dopóki aplikacja czegoś nie narysuje.

<!-- s:7ca27066c7 -->
Sposób działania

<!-- s:1fe89ec57c -->
- **Nic więcej się nie ładuje do czasu [sygnału zamiaru użycia konsoli](/docs/hooks-and-repl#loading-on-console-intent-experimental).** `embed.js` wypisuje prerenderowaną pierwszą klatkę, a potem czeka. Aplikacja ładuje się, gdy DevTools jest zadokowane (przy ładowaniu lub później), gdy odwiedzający naciśnie na stronie skrót klawiszowy DevTools (F12, Ctrl+Shift+J, I, C lub K albo ⌘⌥J, I, C lub K na komputerze Mac) albo gdy naciśnie element `<text-console>` lub `[data-textjs-engage]`. Od tej chwili ponowne załadowanie w tej samej karcie uruchamia ją od razu. DevTools we własnym oknie nie zmienia rozmiaru strony, więc odwiedzający, którzy otworzyli je z menu, widzą pierwszą klatkę, dopóki nie nacisną jednego z tych elementów.
- **Na ekranach dotykowych aplikacja się nie uruchamia.** Na urządzeniu pasującym do `(hover: none) and (pointer: coarse)` skrypt `embed.js` niczego nie wypisuje i nie dodaje nasłuchiwania zdarzeń. Jedyny ładowany przez niego plik to plik `<text-console>`, potrzebny do podglądu.
- **Klawisze docierają do aplikacji dopiero po jej aktywowaniu przez odwiedzającego.** Aby ją aktywować, odwiedzający naciska element `<text-console>` lub `[data-textjs-engage]` albo klika stronę (nie link, przycisk ani pole), aby przenieść fokus z DevTools. Wpisywanie we własnych polach strony lub w elemencie `[data-textjs-bypass]` nigdy nie dociera do aplikacji, a kółko myszy zawsze przewija stronę.
- **Adres URL, historia i tytuł strony nigdy się nie zmieniają.** Trasy, `<Link>` i `useRouter()` nawigują wewnątrz konsoli. W aplikacjach renderowanych po stronie klienta bezwzględne adresy URL otwierają się w nowej karcie.
- **Aplikacja Text.js na stronie ma pierwszeństwo.** Gdy się uruchamia, działająca osadzona aplikacja odmontowuje się, przestaje odczytywać klawisze i usuwa swoją zmienną globalną. Osadzona aplikacja, która ładuje się, gdy inna aplikacja zajmuje konsolę, wypisuje jedno ostrzeżenie i się nie uruchamia.
- **Osadzona aplikacja zawiera własną kopię React 19.** Nie ma `react-dom` ani importów bez ścieżki, więc wersja React strony, mapa importów dla `react` i React DevTools nie mają na nią wpływu.

<!-- s:5bd6dcbe49 -->
Kolejność ładowania plików

<!-- s:631a37c837 -->
| Plik | Moment ładowania | gzip |
| :-- | :-- | --: |
| `embed.js` | Wraz ze stroną | 2,9 kB |
| `assets/text-console-[hash].js` | Gdy strona zawiera `<text-console>` | 4,0 kB |
| `assets/embed-client-[hash].js` i `assets/yoga-[hash].wasm` | Po sygnale zamiaru użycia konsoli | 112,8 kB + 29,0 kB |
| `assets/embed-player-[hash].js` | Po sygnale zamiaru użycia konsoli, zamiast klienta, dla [trasy renderowanej po stronie serwera](#server-rendered-routes) | 22,7 kB |
| `assets/bidi-[hash].js` | Gdy aplikacja po raz pierwszy wyświetla tekst od prawej do lewej (zobacz [Ładowanie silnika bidi](/docs/internationalization#loading-the-bidi-engine)) | 10,1 kB |

<!-- s:d86aa9b2e1 -->
Rozmiary dotyczą pola stanu z obramowaniem przy 120 × 36. `text build --embed` wypisuje rozmiary twojej aplikacji. `assets/embed-[hash].js` to kopia `embed.js` pod nazwą, która nigdy się nie zmienia (zobacz [Wdrożenia](#deploys)).

<!-- s:c6266b6378 -->
`<text-console>`

<!-- s:7156621f10 -->
`embed.js` definiuje `<text-console>` i ładuje jego plik tylko wtedy, gdy taki element znajduje się na stronie. Używa Shadow DOM, więc CSS strony nie dociera do wnętrza, a polityka `style-src 'self'` nie wymaga zmian.

<!-- s:9ceead3eca -->
Bez atrybutów jest to jednowierszowy pasek. Pokazuje skrót klawiszowy przeglądarki otwierający konsolę, następnie prosi o kliknięcie, a potem wyświetla klawisze aplikacji, które podświetlają się, gdy docierają do aplikacji. W przeglądarce Safari pierwszy krok mówi, aby włączyć „Pokazuj funkcje dla deweloperów witryn” w ustawieniach Safari.

<!-- s:899e0c7fe3 -->
Z `mirror` pokazuje klatkę aplikacji na stronie: prerenderowaną pierwszą klatkę, zanim załaduje się cokolwiek innego, a następnie działającą aplikację. Naciśnięcie uruchamia aplikację i przesyła do niej klawisze odwiedzającego, więc aplikacja działa przy zamkniętym DevTools. `chrome` rysuje okno DevTools wokół podglądu i włącza też `mirror`.

<!-- s:fefcb3e495 -->
| Atrybut | Opis |
| :-- | :-- |
| `mirror` | Wyświetlanie klatek aplikacji |
| `chrome` | Wyświetlanie klatek w oknie DevTools |
| `title` | Tytuł paska (domyślnie: `title` w `text.config.ts`) |
| `hints` | Klawisze do wyświetlenia, w postaci `"← →:switch region, Enter:open"` (domyślnie: `hints` w `text.config.ts`) |
| `action` | Pierwsza czynność, wyświetlana jako „Kliknij tutaj i …” (domyślnie: `action` w `text.config.ts` lub naciśnięcie klawisza z pierwszej podpowiedzi) |

<!-- s:392012169b -->
Na ekranach dotykowych podgląd pokazuje pierwszą klatkę bez uruchamiania aplikacji, a pasek jest ukryty. Tekst elementu jest po angielsku.

<!-- s:13ff4ec1f4 -->
Rezerwowanie miejsca

<!-- s:0f4e2c234d -->
`text build --embed` wypisuje jeden wiersz CSS dla siatki twojej aplikacji. Wklej go do arkusza stylów strony. Ustala rozmiar `<text-console>`, zanim załaduje się plik elementu, więc nic na stronie nie przesuwa się po pobraniu pliku. Dla domyślnej siatki 120 × 36 jest to wiersz:

<!-- s:a2d2741417 -->
Pasek ma 58 px wysokości. Podgląd zachowuje proporcje siatki aż do jej naturalnej szerokości (885 px przy 120 kolumnach), a `chrome` dodaje 43 px. Rozmiar nie zależy od fontów. `reserveCss(cols, rows)` z `@textjs/app/experimental` zwraca ten sam wiersz.

<!-- s:a1260c10c3 -->
Podgląd widoczny bez przewijania jest zwykle największym elementem strony, więc wyznacza jej Largest Contentful Paint (LCP). Jego pierwsza klatka jest rysowana po załadowaniu `embed.js`, a następnie pliku elementu, jednego po drugim. Reszta strony jest rysowana tak samo jak bez osadzonej aplikacji. Podgląd umieszczony niżej na stronie nie wpływa na LCP. Na stronie z własnymi odroczonymi skryptami, takiej jak aplikacja React, `<script type="module" async src="…">` uruchamia `embed.js` bez czekania na nie, więc podgląd widoczny bez przewijania rysuje się wcześniej.

<!-- s:4206a424a5 -->
Style

<!-- s:834fbf40e6 -->
Aby wyśrodkować podgląd, ustaw automatyczne marginesy w osi inline:

<!-- s:6dde2b2766 -->
Domyślnie jest ciemny. Ustaw `color-scheme: light`, aby użyć jasnych kolorów, lub ustaw dwa kolory, z których mieszane są pozostałe odcienie. `::part(frame)` określa styl samej klatki. `chrome` zachowuje własne tło DevTools.

<!-- s:f5e077273b -->
Trasy renderowane po stronie serwera

<!-- s:eb293d9fb4 -->
Gdy `initialPath` jest trasą z `export const runtime = "server"`, `embed.js` ładuje odtwarzacz klatek zamiast środowiska uruchomieniowego klienta. Przesyła strumieniowo klatki z serwera, z którego pochodzi `embed.js`, więc uruchom `text start` lub adapter `bun`. Inne adaptery przerywają budowanie błędem. Zobacz [Renderowanie po stronie serwera](/docs/server-rendering).

<!-- s:e2bdd4dbb7 -->
Strona w innej witrynie może otworzyć sesję na żywo tylko wtedy, gdy jej źródło znajduje się w `allowOrigins`:

<!-- s:6ec7048857 -->
- Sesja odpowiada tylko źródłu, które ją otworzyło.
- Domyślnie Text.js usuwa ciasteczka i nagłówek `Authorization` sesji z innych witryn, więc [middleware](/docs/middleware) widzi niezalogowanego odwiedzającego. `credentials: true` zachowuje je i wymaga dokładnych źródeł. Przeglądarka wysyła je, gdy strona i serwer mają wspólną domenę rejestrowalną (`www.example.com` i `console.example.com`), a ciasteczko obejmuje serwer (`Domain=example.com` lub ustawione na `console.example.com`). Z innych witryn wysyła tylko ciasteczka ustawione z `SameSite=None; Secure`, a przeglądarki blokujące ciasteczka stron trzecich nie wysyłają żadnych.
- Sesja na żywo wysyła żądania wstępne `OPTIONS` do `/__textjs/live` zaraz po połączeniu i przy ponownym połączeniu. Żądania wstępne nie zawierają ciasteczek ani `Authorization`, więc middleware pasujące do tej ścieżki musi przepuszczać żądania `OPTIONS` bez logowania.
- Za odwrotnym proxy lub CDN ustaw `server.trustProxy` (zobacz [Za proxy](/docs/deploying#behind-a-proxy)). Bez tego każdy odwiedzający ma adres proxy, więc wszyscy współdzielą jeden limit sesji na klienta.

<!-- s:f739524722 -->
`text dev` akceptuje strony na `localhost`, `127.0.0.1` i `[::1]` na dowolnym porcie bez `allowOrigins`, chyba że ustawiono `credentials`.

<!-- s:d5df7bf60f -->
Hosting

<!-- s:4bef54c1c0 -->
`text start` oraz adaptery `bun`, `vercel` i `cloudflare` udostępniają osadzoną kompilację z tymi nagłówkami. Adapter `static` zapisuje je do `_headers`, który odczytują Cloudflare Pages i Netlify. Na każdym innym hostingu, takim jak zasobnik plików lub własny folder `public/` witryny, ustaw je samodzielnie:

<!-- s:be81a4c5ec -->
| Ścieżka | Nagłówki |
| :-- | :-- |
| `/embed.js` | `Cache-Control: public, max-age=0, must-revalidate` |
| `/assets/*` | `Cache-Control: public, max-age=31536000, immutable` |
| Obie, gdy witryna ma inne źródło | `Access-Control-Allow-Origin: *` i `Cross-Origin-Resource-Policy: cross-origin` |

<!-- s:21eb7dc287 -->
Przeglądarki pobierają skrypty modułowe i WebAssembly z użyciem CORS, więc pliki z innego źródła wymagają `Access-Control-Allow-Origin`. Udostępniaj `yoga-[hash].wasm` jako `application/wasm`, z kompresją (zobacz [WebAssembly](/docs/deploying#webassembly)).

<!-- s:1bb976fcdc -->
Wdrożenia

<!-- s:01b888e293 -->
`embed.js` jest ponownie walidowany przy każdym wczytaniu strony, więc nowi odwiedzający od razu otrzymują nowe wdrożenie. Karta, która wczytała poprzedni `embed.js`, nadal importuje pliki poprzedniego buildu, gdy odwiedzający otworzy konsolę, nawet kilka godzin później. Zachowaj `assets/` poprzedniego wdrożenia online: kopiuj nowe pliki na stare zamiast synchronizować je z usuwaniem i usuń stare pliki po dniu lub dwóch. Aby przypiąć build, umieść jego `assets/embed-[hash].js` w tagu. Pliki tego buildu również muszą pozostać online.

<!-- s:b748b07652 -->
Gdy plików już nie ma, `embed.js` zapisuje jedno ostrzeżenie z prośbą o ponowne wczytanie strony i nie uruchamia aplikacji ani sam nie wczytuje ponownie strony.

<!-- s:fce19037b3 -->
Polityka bezpieczeństwa treści

<!-- s:de8e30a920 -->
`embed.js` nie wymaga skryptów ani stylów inline. Dodaj poniższe wpisy do polityki strony osadzającej, zastępując źródło wartością `'self'`, gdy `dist/` znajduje się w tym samym źródle:

<!-- s:2da4077ce0 -->
| Dyrektywa | Wartość | Zastosowanie |
| :-- | :-- | :-- |
| `script-src` | `https://console.example.com` | `embed.js` i jego fragmenty |
| `script-src` | `'wasm-unsafe-eval'` | Yoga, w aplikacjach renderowanych po stronie klienta |
| `connect-src` | `https://console.example.com` | `yoga-[hash].wasm` oraz `/__textjs/live` dla tras renderowanych po stronie serwera |
| `img-src` | `data:` | Tylko element `<text-console mirror>`, którego aplikacja rysuje `<Image>` lub `<Pixels>` |

<!-- s:4ce5dcc4cb -->
Samodzielne wczytywanie aplikacji

<!-- s:03e56a60b4 -->
`@textjs/app/experimental` eksportuje części, z których zbudowany jest `embed.js`, dla stron wczytujących aplikację na własny sposób:

<!-- s:238cbf53ee -->
| Eksport | Opis |
| :-- | :-- |
| `startEmbed(paint, boot, src, element?)` | Działanie `embed.js`: zapisanie pierwszej klatki w konsoli, oczekiwanie na zamiar użycia konsoli, a następnie wywołanie `boot` |
| `bootEmbedClient(options)` | Uruchomienie aplikacji renderowanej po stronie klienta z routingiem w pamięci i warunkową obsługą klawiatury na stronie |
| `bootEmbedPlayer(options)` | Uruchomienie odtwarzacza klatek dla trasy renderowanej po stronie serwera |
| `createHostInput(options)` | Obsługa klawiatury zgodna z powyższymi zasadami |
| `createTextConsoleMount(config)` | Zwrócenie funkcji `mount(element, shell?)` dla `<text-console>` |
| `reserveCss(cols, rows)` | CSS rezerwujący miejsce dla `<text-console>` |

<!-- s:f15b990353 -->
`ENGAGE_SELECTOR` i `BYPASS_SELECTOR` to selektory elementów uruchamiających aplikację oraz elementów zachowujących własną obsługę klawiszy.
