<!-- s:8f3fd7167d -->
Rozszerzenie Text.js do VS Code pokazuje klatkę konsoli obok kodu. Odwzorowuje aplikację działającą pod `text dev` lub samodzielnie renderuje otwarty plik, gdy nic nie działa. Dodaje też generowanie szkieletów App Router, snippety i linki do kodów błędów `TX###`.

<!-- s:98304b8243 -->
Instalacja

<!-- s:80e247d2f7 -->
Zainstaluj [Text.js](https://marketplace.visualstudio.com/items?itemName=textjs.vscode-textjs) z Visual Studio Marketplace. W VS Code otwórz widok „Rozszerzenia” (`⌘⇧X`) i wyszukaj `textjs.vscode-textjs` lub uruchom:

<!-- s:fd2344ec36 -->
Rozszerzenie aktywuje się w każdym folderze zawierającym aplikację Text.js: plik `text.config.ts` lub pakiet zależny od `@textjs/app` z katalogiem `app/`. Działają też monorepo z kilkoma aplikacjami.

<!-- s:74f1530aa8 -->
Podgląd na żywo

<!-- s:d9807ea49d -->
Otwórz plik `page.tsx`, `layout.tsx` lub komponent i uruchom **Text.js: Open Preview** (`⌘K V`) albo kliknij przycisk podglądu na pasku tytułu edytora. Panel rysuje klatkę z takim samym obramowaniem DevTools i komórkami z czcionką Menlo jak konsola przeglądarki.

<!-- s:2f69f76b80 -->
Podgląd pobiera klatki z jednego z dwóch źródeł. Etykieta na pasku narzędzi pokazuje, które jest aktywne:

<!-- s:f81cef21bf -->
| Źródło | Kiedy | Co widzisz |
| :-- | :-- | :-- |
| **Live** | Działa `text dev`, a karta przeglądarki ma otwartą aplikację | Rzeczywistą aplikację z jej stanem, danymi i rozmiarem siatki |
| **Headless** | Brak serwera deweloperskiego lub otwartej karty | Otwarty plik renderowany przez rozszerzenie w rozmiarze panelu |

<!-- s:f40888c2bb -->
`auto` (ustawienie domyślne) używa Live, gdy to możliwe, a w pozostałych przypadkach Headless. Wybierz na stałe jedno ze źródeł za pomocą etykiety lub `textjs.preview.mode`.

<!-- s:fd587df6f1 -->
Klawiatura

<!-- s:9ce66a1aa7 -->
Kliknij konsolę, aby wysyłać klawisze do aplikacji: strzałki, `Tab`, skróty klawiszowe, pisanie i wklejanie działają tak jak w przeglądarce. Kliknij poza konsolą, aby przestać. Skróty edytora, takie jak `⌘P` i `⌘⇧P`, nadal trafiają do VS Code. Przewijanie nad konsolą wysyła zdarzenia kółka myszy.

<!-- s:0910b5fd48 -->
W polu adresu możesz wpisać trasę, taką jak `/deployments/dpl_a1`, aby nawigować w dowolnym ze źródeł.

<!-- s:4507d73bb4 -->
Tryb Live

<!-- s:787b87d328 -->
Gdy podgląd jest otwarty, serwer deweloperski prosi połączone karty o strumieniowanie klatek. Karty wysyłają tylko zmienione wiersze i przestają je wysyłać po zamknięciu podglądu, więc aplikacja bez otwartego podglądu nie ponosi żadnych kosztów. Zapis pliku przechodzi przez Fast Refresh, a podgląd aktualizuje się wraz z kartą.

<!-- s:86ae14b746 -->
Włącz **Follow** (`textjs.preview.followEditor`), aby przełączać kartę przeglądarki na trasę edytowanego pliku `page.tsx`.

<!-- s:68839106d6 -->
Karty w tle nie otrzymują klatek animacji, więc zwykle zachowują swoje klatki, dopóki znów nie staną się widoczne. Gdy podgląd obserwuje kartę w tle, rysuje ona klatkę zaraz po otrzymaniu danych wejściowych, więc pisanie w podglądzie nadal go aktualizuje. Animacje w karcie w tle aktualizują się mniej więcej raz na sekundę. Umieść aplikację w osobnym oknie, aby zachować ich płynność.

<!-- s:1ae6e7077f -->
Tryb Headless

<!-- s:1cddf967be -->
Rozszerzenie uruchamia w projekcie niewielki program wykonawczy. Ładuje on pliki tras przez Vite i `@textjs/app` z projektu, więc aliasy, TypeScript i JSX działają tak samo jak w `text dev`. Montuje App Router na trasie otwartego pliku wraz z jej layoutami, używając historii w pamięci:

<!-- s:23d9451fef -->
| Plik | Podgląd |
| :-- | :-- |
| `app/page.tsx` | `/` |
| `app/(shop)/items/[id]/page.tsx` | `/items/id` (segmenty dynamiczne używają swojej nazwy) |
| `app/blog/[[...slug]]/layout.tsx` | `/blog` |
| `components/Card.tsx` | Domyślny eksport lub pierwszy eksport w PascalCase, bez propsów |

<!-- s:f111cbfc61 -->
Wywołania `fetch("/api/...")` do tego samego źródła uruchamiają handlery `route.ts` w tym samym procesie, tak jak [`text run`](/docs/terminal). Siatka dopasowuje się do rozmiaru panelu, a zapis dowolnego pliku w aplikacji renderuje ją ponownie. Błędy pojawiają się nad klatką wraz z linkami do ich stron `TX###`.

<!-- s:36cd3f2bb4 -->
Polecenia

<!-- s:d542a683ff -->
| Polecenie | Opis |
| :-- | :-- |
| Text.js: Start Dev Server | Uruchamia skrypt `dev` (lub `text dev`) w terminalu |
| Text.js: Stop Dev Server | Zatrzymuje serwer deweloperski uruchomiony z VS Code |
| Text.js: Open Preview | Otwiera podgląd na żywo aktywnego pliku |
| Text.js: Open in Browser Console | Otwiera bieżącą trasę na serwerze deweloperskim. Następnie [otwórz konsolę przeglądarki](/docs/installation#open-the-console) |
| Text.js: New Page | `app/<route>/page.tsx` z metadanymi i typowanymi `params` |
| Text.js: New Layout | `app/<route>/layout.tsx` |
| Text.js: New Route Handler | `app/<route>/route.ts` z `GET` i `POST` |
| Text.js: New Loading UI / Error Boundary / Not Found Page | `loading.tsx`, `error.tsx`, `not-found.tsx` |

<!-- s:87b5f49afb -->
Polecenia generowania szkieletów są też dostępne w menu kontekstowym folderów w Eksploratorze. Przyjmują segmenty [App Router](/docs/routing), takie jak `settings`, `blog/[slug]`, `docs/[...path]` i `(marketing)/about`, i odmawiają umieszczenia `page` oraz `route.ts` w tym samym segmencie. Projekty JavaScript (bez `tsconfig.json`) otrzymują pliki `.jsx` i `.js`.

<!-- s:9ba0c1b237 -->
Snippety

<!-- s:193db2a68e -->
| Prefiks | Wstawiana zawartość |
| :-- | :-- |
| `txpage`, `txlayout`, `txloading`, `txerror` | Pliki tras nazwane od folderu |
| `txc` | Komponent konsoli nazwany od pliku |
| `txroute`, `txroutep` | Handlery tras z parametrami lub bez nich |
| `box`, `boxb`, `text`, `scrollbox`, `link`, `spinner` | Komponenty |
| `input`, `select`, `tabs` | Komponenty interaktywne |
| `useInput`, `useKeymap`, `useFocus`, `useTheme`, `useViewport`, `useRouter`, `useInterval` | Hooki |
| `metadata`, `txconfig` | Metadane trasy i `text.config.ts` |

<!-- s:a6e574a6aa -->
Kody błędów

<!-- s:5e9e2a4649 -->
Najedź na kod `TX###` w dowolnym miejscu: w kodzie źródłowym, logach, panelu „Dane wyjściowe” lub wklejonym śladzie stosu. Dymek pokazuje jego tytuł, komunikat i pakiet wraz z linkiem do jego strony w textjs.org. Każdy kod jest też linkiem (kliknięcie z `⌘`).

<!-- s:b67d013d7e -->
Pasek stanu

<!-- s:be63ef7ae2 -->
Element `▼` pokazuje stan serwera deweloperskiego i rozmiar siatki konsoli, na przykład `▼ :3000  120×36`. Karty zgłaszają swój rozmiar serwerowi deweloperskiemu przy każdej zmianie, nawet bez otwartego podglądu. Kliknij ten element, aby wyświetlić główne polecenia.

<!-- s:5b827aed4d -->
Ustawienia

<!-- s:457ec968c0 -->
| Ustawienie | Wartość domyślna | Opis |
| :-- | :-- | :-- |
| `textjs.preview.mode` | `auto` | `auto`, `live` lub `headless` |
| `textjs.preview.followEditor` | `false` | Tryb Live: śledzenie edytowanej trasy |
| `textjs.preview.fontSize` | `12` | Rozmiar czcionki komórki (DevTools używa 12) |
| `textjs.preview.runtime` | | Plik binarny Node.js dla podglądów Headless (domyślnie: dołączony do VS Code) |
| `textjs.devServer.url` | | URL serwera deweloperskiego (domyślnie: wykrywanie na portach 3000–3010). Używane są tylko adresy pętli zwrotnej `http://` |
| `textjs.devServer.command` | | Polecenie dla Start Dev Server |

<!-- s:ea5e740ef1 -->
Zaufanie do obszaru roboczego

<!-- s:ddcdd0b053 -->
Podgląd i serwer deweloperski uruchamiają kod projektu (jego konfigurację Vite, `text.config.*` i komponenty). W trybie ograniczonym rozszerzenie oferuje tylko snippety, generowanie szkieletów i linki do błędów oraz ignoruje `textjs.preview.runtime`, `textjs.devServer.command` i `textjs.devServer.url` z ustawień obszaru roboczego. Oznacz obszar roboczy jako zaufany, aby włączyć podgląd. Pliki spoza folderów obszaru roboczego nigdy nie są wyświetlane w podglądzie.

<!-- s:5ae438610c -->
Zasada działania

<!-- s:857bac4692 -->
`text dev` udostępnia trzy endpointy dla edytorów. Odpowiadają tylko na połączenia pętli zwrotnej skierowane do hosta pętli zwrotnej (`localhost`, `127.0.0.1`, `[::1]`) i tylko na żądania bez `Origin` lub ze źródłem serwera deweloperskiego. Żądania przeglądarek między witrynami i `no-cors` są odrzucane:

<!-- s:2345c81baf -->
| Endpoint | |
| :-- | :-- |
| `GET /__textjs/status` | Katalog główny projektu, połączone karty, rozmiar siatki i bieżąca trasa |
| `GET /__textjs/frames` | Zdarzenia wysyłane przez serwer: jedno zdarzenie `frame` na zmianę, zakodowane jako różnice wierszy |
| `POST /__textjs/input` | Klawisz, wklejenie, tekst IME lub martwego klawisza (`text`), kółko myszy lub nawigacja dla karty. Wymaga JSON i nagłówka `x-textjs-mirror: 1`, więc inne witryny nie mogą wysyłać naciśnięć klawiszy |

<!-- s:6693972af6 -->
Karty wysyłają klatki do serwera deweloperskiego przez gniazdo HMR środowiska Vite, które wymaga tokenu przypisanego do serwera. Format transmisji jest eksportowany z `@textjs/app/frame-protocol` (`FrameEncoder`, `FrameDecoder`, `parseInputMessage`), jeśli chcesz zbudować własną przeglądarkę klatek. Żaden z tych elementów nie występuje w wyniku `text build`.
