<!-- s:df706c7a4d -->
`eslint-plugin-textjs` wykrywa błędy Text.js w edytorze: tagi DOM w komponentach konsoli, kontenery wewnątrz tekstu, glify niedostępne w Menlo, przypadkowe wywołania `console.log` i eksporty App Router, które są ignorowane bez ostrzeżenia.

<!-- s:0ecddf15e1 -->
Konfiguracja

<!-- s:5d60a92733 -->
Wtyczka obsługuje ESLint 9 i 10 z płaską konfiguracją. Reguły analizują składnię i nie potrzebują informacji o typach ani `parserOptions.project`. Działa każdy parser obsługujący TypeScript i JSX.

<!-- s:b69abcef52 -->
Zestawy konfiguracji

<!-- s:9cfe4adde3 -->
| Konfiguracja | Co włącza |
| :-- | :-- |
| `textjs.configs.recommended` | Wszystkie reguły poprawności jako błędy; reguły konsoli, timerów i tempa klatek jako ostrzeżenia |
| `textjs.configs.strict` | Wszystko jako błędy, dodatkowo `prefer-use-keymap` jako ostrzeżenie |

<!-- s:6c9781312c -->
Zamiast tego wybierz reguły pojedynczo:

<!-- s:ec6eb92cf0 -->
Pliki konsoli

<!-- s:04573fe453 -->
Większość reguł dotyczy tylko plików renderujących w konsoli: plików importujących komponent lub hook (`Box`, `Text`, `useInput`, …) z `@textjs/app` lub `@textjs/react`. Pliki importujące `react-dom` lub `@textjs/react/dom` są kodem strony i pozostają bez zmian, więc witryna może łączyć strony DOM i aplikacje konsolowe w jednym projekcie. Import funkcji pomocniczej takiej jak `tokenize` lub `parseMarkdown` nie czyni pliku plikiem konsoli.

<!-- s:96e9c86b58 -->
Reguły App Router kierują się nazwą pliku (`page.tsx`, `layout.tsx`, `route.ts`, …) w dowolnym katalogu `app/`, w tym `src/app/`. Jeśli twój katalog ma inną nazwę, przekaż `{ appDir: "routes" }` do `valid-route-module`, `valid-metadata` i `route-handler-exports`.

<!-- s:b66542635d -->
Reguły

<!-- s:c1b57ad8e2 -->
| Reguła | Zalecany poziom | Poprawka |
| :-- | :-- | :-- |
| [`no-dom-elements`](#no-dom-elements) | błąd | sugestia |
| [`no-box-in-text`](#no-box-in-text) | błąd | |
| [`no-unsupported-glyphs`](#no-unsupported-glyphs) | błąd | automatyczna poprawka, sugestia |
| [`no-console-in-components`](#no-console-in-components) | ostrzeżenie | sugestia |
| [`prefer-use-interval`](#prefer-use-interval) | ostrzeżenie | sugestia |
| [`no-sub-frame-timers`](#no-sub-frame-timers) | ostrzeżenie | |
| [`prefer-use-keymap`](#prefer-use-keymap) | tylko strict | |
| [`valid-route-module`](#valid-route-module) | błąd | |
| [`valid-metadata`](#valid-metadata) | błąd | |
| [`route-handler-exports`](#route-handler-exports) | błąd | sugestia |

<!-- s:a565f817ed -->
`no-dom-elements`

<!-- s:deb9e3c0ec -->
`<div>`, `<span>`, elementy niestandardowe i inne tagi DOM nie istnieją w konsoli. Reconciler rozpoznaje tylko własne węzły hosta i zgłasza `TX003` dla wszystkich pozostałych.

<!-- s:bd7c3e0318 -->
Sugestia zastępuje tag najbliższym komponentem (`div` → `Box`, `span`/`p` → `Text`, `strong` → `Text bold`, `a` → `Link`, `input` → `Input`, `hr` → `Divider`, …) i dodaje import.

<!-- s:a40be5da85 -->
`no-box-in-text`

<!-- s:4ec768c301 -->
`<Text>` to ciąg stylowanych spanów; nie może zawierać kontenera. Zagnieżdżenie `<Box>` lub dowolnego komponentu z kontenerem w korzeniu (`<ScrollBox>`, `<Input>`, `<Code>`, `<ProgressBar>`, `<Divider>`, …) powoduje błąd `TX004` podczas renderowania. Ta reguła wykrywa go już w edytorze, również wewnątrz `&&`, operatorów trójargumentowych, fragmentów i `.map()`.

<!-- s:9390fe5b6b -->
`no-unsupported-glyphs`

<!-- s:bf8fe52c9e -->
Text.js rozmieszcza każdy znak w stałej siatce komórek. Glify niedostępne w Menlo, czcionce konsoli DevTools w systemie macOS, są renderowane czcionką zastępczą szerszą od komórki, więc każda kolejna komórka się przesuwa.

<!-- s:a58a59c2f8 -->
- **Brajl** (U+2800–U+28FF, klasyczne klatki spinnera terminalowego): użyj znaków blokowych lub ćwiartkowych (`▘▝▗▖`), `<Spinner variant="dots">` lub `marker="quadrant"` na wykresach. Ustaw `{ allowBraille: true }` dla aplikacji uruchamianych wyłącznie przez `text run` w terminalu.
- **Różne symbole i strzałki** (U+2B00–U+2BFF, na przykład mały kwadrat U+2B1D): sugestie proponują odpowiednik z Menlo (`·`, `●`, `←`).
- **Prezentacja emoji dla symboli jednokomórkowych** (`▶` lub `↩` z następującym U+FE0F): selektor wariantu zamienia je w emoji zajmujące dwie komórki, podczas gdy siatka rezerwuje jedną. Automatyczna poprawka go usuwa.

<!-- s:8c0c49dfb7 -->
Szerokie emoji (`🚀`, `✅`) działają poprawnie: Text.js mierzy je jako dwie komórki.

<!-- s:f838b005d1 -->
`no-console-in-components`

<!-- s:593ea6ea72 -->
Każda klatka to jedno wywołanie `console.log`. Twoje logi trafiają między klatki, są przewijane przez następną i pozostają ukryte w widoku przyklejonym do dołu. `console.clear()` usuwa samą aplikację.

<!-- s:0011d5dcff -->
Wyświetlaj komunikaty w interfejsie za pomocą `useToast()` lub komponentu `<ScrollBox>` z logami albo sprawdzaj stan w nakładce deweloperskiej `[▼]` (`` Ctrl+` ``). Przy ustawionym `logger` sugestia zamienia `console.warn(…)` na `log.warn(…)`. Pliki testowe i renderowania `@textjs/app/testing` są pomijane.

<!-- s:6838ca349d -->
`prefer-use-interval`

<!-- s:7d34b88f36 -->
Bezpośrednie użycie `setInterval` w komponencie wymaga efektu, funkcji sprzątającej i referencji, aby uniknąć nieaktualnego stanu. `useInterval` zapewnia wszystkie trzy, a `null` go zatrzymuje.

<!-- s:894ec09a45 -->
W animacjach `useAnimationFrame` dostosowuje się do tempa klatek renderera i zatrzymuje się, gdy wyjście jest wstrzymane. Zobacz [Hooki pomocnicze](/docs/utility-hooks).

<!-- s:0d541fb900 -->
`no-sub-frame-timers`

<!-- s:a27426b886 -->
Text.js emituje najwyżej jedną klatkę co 66 ms (około 15 klatek/s). Interwał 16 ms renderuje cztery razy na każdą emitowaną klatkę; dodatkowe klatki są scalane i tylko zużywają czas procesora. Reguła zgłasza opóźnienia `setInterval`/`useInterval` poniżej `minInterval` (domyślnie `66`) oraz `useAnimationFrame` z `fps` powyżej 15.

<!-- s:bc8950c5dd -->
`prefer-use-keymap`

<!-- s:fbcb0ae458 -->
Ręczne porównywanie `e.key` działa, ale skróty klawiszowe są niewidoczne. `useKeymap` umieszcza powiązania z etykietami w `<KeyHelp>`, `<KeyHints>` (powiązania z `hint: true`) i palecie poleceń, obsługuje sekwencje takie jak `g g` i zatrzymuje propagację dla dopasowanych klawiszy. Reguła zgłasza handlery `useInput`, które porównują co najmniej dwa literały klawiszy (`minKeys`), i pomija handlery odczytujące `e.input` do wpisywania tekstu.

<!-- s:05d39412dc -->
Zobacz [Skróty klawiszowe](/docs/keyboard).

<!-- s:3ee3017e0f -->
`valid-route-module`

<!-- s:d470bf26bc -->
- Pliki `page`, `layout`, `loading`, `error` i `not-found` muszą eksportować komponent jako eksport domyślny (`TX015`).
- `export const dynamic` musi mieć wartość `"auto"`, `"force-static"` lub `"force-dynamic"` (`TX031`). Text.js nie obsługuje wartości `"error"` z Next.js. Wartość jest odczytywana ze stron, layoutów i handlerów tras. W stronach i layoutach zapisz ją jako zwykły literał tekstowy: `text build` odczytuje ją z kodu źródłowego bez uruchamiania modułu.

<!-- s:263d4a01aa -->
`valid-metadata`

<!-- s:1d3a134d04 -->
Metadata są scalane z layoutów, a następnie ze strony (lub `not-found`). Reguła zgłasza to, co router zignorowałby bez ostrzeżenia:

<!-- s:fe9ebcbc0c -->
- `metadata` lub `generateMetadata` w plikach `loading` lub `error`
- oba eksporty w jednym pliku
- `async generateMetadata`: funkcja jest wywoływana synchronicznie, więc Promise nigdy nie ustawia tytułu
- `title`, który nie jest ciągiem znaków ani `{ default, template?, absolute? }`, lub błędnie zapisany klucz
- `title.template` bez `%s` lub na stronie, gdzie nie ma żadnego efektu
- `description`, który nie jest ciągiem znaków

<!-- s:c8c401c5e0 -->
`route-handler-exports`

<!-- s:877bcc12b1 -->
Pliki `route.ts` odpowiadają tylko na eksportowane metody HTTP: `GET`, `HEAD`, `POST`, `PUT`, `PATCH`, `DELETE` i `OPTIONS`. Zapisane małymi literami `get` lub `Post` nigdy nie są wywoływane (żądania otrzymują `405`); sugestia zmienia ich nazwę. Reguła zgłasza eksporty domyślne, handlery niebędące funkcjami i inne eksporty, z wyjątkiem `dynamic` i `revalidate` z [konfiguracji segmentu trasy](/docs/caching). Przenieś wspólny kod do `lib/` lub wymień dodatkowe nazwy za pomocą `{ allow: [...] }`.
