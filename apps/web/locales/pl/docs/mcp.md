<!-- s:c351b288ae -->
`text mcp` uruchamia katalog `app/` bez interfejsu graficznego, wewnątrz procesu, i udostępnia go przez [Model Context Protocol](https://modelcontextprotocol.io), aby agenci programistyczni mogli z niego korzystać bez DevTools. Agent nawiguje, naciska klawisze, odczytuje klatki jako zwykły tekst i wywołuje handlery tras.

<!-- s:c66b3eaae7 -->
`text mcp` wymaga środowiska Bun. Po uruchomieniu w Node uruchamia się ponownie w Bun, jeśli `bun` znajduje się w `PATH`, a w przeciwnym razie kończy się błędem `TX019`. Klienty MCP uruchamiają je za ciebie, więc rzadko uruchamiasz je ręcznie.

<!-- s:0ecddf15e1 -->
Konfiguracja

<!-- s:91bda9ef42 -->
Każdy klient uruchamia `text mcp` z katalogu twojego projektu. Użyj `bunx --bun`, aby pliki tras uruchamiały się jako TypeScript.

<!-- s:b50f70c6a3 -->
OpenCode

<!-- s:b1662c02a3 -->
Claude Code

<!-- s:af84272153 -->
Lub zapisz konfigurację w repozytorium dla zespołu:

<!-- s:e9ea871e1a -->
Cursor

<!-- s:6be69e8aed -->
VS Code

<!-- s:25a196cf61 -->
Dla projektu w podkatalogu dopisz ścieżkę: `["--bun", "text", "mcp", "apps/console"]`.

<!-- s:0b27734b46 -->
Narzędzia

<!-- s:93ae76f73d -->
| Narzędzie | Opis |
| :-- | :-- |
| `list_routes` | Strony i handlery tras w `app/` oraz bieżąca lokalizacja |
| `navigate` | Dodanie lub zastąpienie ścieżki albo przejście `back` / `forward` |
| `read_frame` | Klatka jako tekst, z trasą, rozmiarem, fokusem i kursorem. `styles: true` dodaje kolory i atrybuty dla każdego spanu |
| `press` | Kombinacje klawiszy: `"down"`, `"ctrl+k"`, `"shift+tab"`, `"tab tab enter"`, `"down*3"` |
| `type` | Wpisywanie tekstu po jednym klawiszu na znak (do 2000; dla większej liczby użyj `paste`). `submit: true` naciska potem Enter |
| `paste` | Jedno zdarzenie wklejania, jak `⌘V` |
| `scroll` | Przewijanie kółkiem myszy o `rows` (i `cols`). Komponent `<ScrollBox>` przewija się kółkiem bez fokusu klawiatury |
| `resize` | Ustawienie rozmiaru siatki w kolumnach i wierszach |
| `inspect_tree` | Drzewo komponentów z granicami na ekranie oraz wszystkimi identyfikatorami elementów mogących otrzymać fokus |
| `find` | Granice każdego dopasowania i komponent pod nim |
| `wait_for` | Oczekiwanie na pojawienie się lub zniknięcie tekstu albo na stan bezczynności aplikacji |
| `logs` | Przechwycone wyjście `console.*` i błędy React |
| `fetch` | Wywołanie handlera `route.ts` wewnątrz procesu. Treści są odczytywane do `maxBytes`; strumienie zdarzeń przez `streamMs`, po czym są anulowane |
| `reload` | Ponowny import aplikacji po edycji plików |

<!-- s:526235e5c5 -->
Narzędzia wejścia zwracają nową klatkę, więc agent nie potrzebuje osobnego `read_frame` po każdym klawiszu. Bieżąca klatka i lista tras są też dostępne jako zasoby `text://frame` i `text://routes`.

<!-- s:c30236f97d -->
Typowa wymiana:

<!-- s:45e18bfa25 -->
Klatki i bezczynność

<!-- s:f2e8fe0f06 -->
Zanim dowolne narzędzie odczyta klatkę, czeka na stan bezczynności aplikacji: brak zaplanowanej klatki, brak trwającego `fetch` oraz brak zatwierdzenia zmian lub klatki przez 50 ms. Agent widzi więc wynik swojego wejścia, a nie klatkę w połowie aktualizacji.

<!-- s:fbad6f5c1a -->
Komponent `<Spinner>` lub wykres aktualizowany raz na sekundę nadal uznaje się za bezczynny między aktualizacjami, więc strony z animacjami pozostają czytelne. Aplikacja renderująca częściej niż co 50 ms nigdy nie przechodzi w stan bezczynności. Odczyty przestają czekać po 1,5 sekundy (`settleMs` to zmienia), zapisują najnowszą klatkę i oznaczają ją jako `busy`. `wait_for` bez tekstu czeka na bezczynność, z własnym `quietMs`, i zwraca błąd, jeśli bezczynność nigdy nie nastąpi.

<!-- s:c5250c2f7a -->
Współrzędne oznaczają komórki numerowane od zera: `x` to kolumna, `y` to wiersz. Szerokie znaki, takie jak CJK i emoji, zajmują dwie kolumny.

<!-- s:7ff82431c5 -->
Błędy i logi

<!-- s:6e07cf8702 -->
stdout przenosi protokół. Wyjście `console.*` twojej aplikacji, przypadkowe wywołania `process.stdout.write` i błędy React trafiają zamiast tego do `logs`, ponumerowane tak, aby agent mógł zażądać tylko nowych wpisów za pomocą `since`. Jeśli od ostatniego odczytu zapisano błędy, nagłówek następnej klatki o tym informuje.

<!-- s:9102068439 -->
Niepowodzenia są zwracane jako błędy narzędzi, nigdy jako awaria procesu. Narzędzie, które przekroczy limit czasu, jest anulowane przed uruchomieniem następnego wywołania, więc wolne wywołanie nigdy nie wpisuje tekstu do klatki następnego wywołania. Błędy z kodem Text.js zachowują go, na przykład `TX007` dla nieznanego klawisza. Jeśli aplikacja nie zdoła się załadować, każde narzędzie wyjaśnia przyczynę. Popraw plik i wywołaj `reload`.

<!-- s:d3ad6f781e -->
Opcje

<!-- s:c9c30c0da4 -->
| Opcja | Opis |
| :-- | :-- |
| `--path <pathname>` | Pierwsza trasa (domyślnie `/`) |
| `--cols` / `--rows` | Rozmiar siatki (domyślnie: `viewport` w `text.config.ts`, w przeciwnym razie 100×32) |
| `--theme <name>` | Gotowy motyw |
| `--no-config` | Pominięcie `text.config.ts` |
| `--verbose` | Zapisywanie przechwyconych logów także do stderr |

<!-- s:5ae438610c -->
Sposób działania

<!-- s:7c71219a13 -->
`text mcp` uruchamia twoją aplikację tak samo jak [`text run`](/docs/terminal): każdy moduł trasy jest importowany z góry, App Router używa historii w pamięci, a wywołania `fetch("/api/…")` do tego samego źródła uruchamiają twoje handlery wewnątrz procesu. Klatki trafiają do pozaekranowej siatki komórek zamiast do terminala. Strony renderowane po stronie serwera (`export const runtime = "server"`) i ich komponenty `async function` renderują się wewnątrz procesu, jak w `text dev`, a klatka jest odczytywana po zakończeniu ich działania.

<!-- s:c965dcc0e4 -->
`reload` odmontowuje aplikację, usuwa wszystkie moduły projektu z pamięci podręcznej modułów środowiska Bun (w tym pliki spoza `app/`), ponownie skanuje `app/` i montuje aplikację w bieżącej lokalizacji.

<!-- s:19d6f0da69 -->
Aby osadzić serwer we własnym procesie lub użyć innego transportu:

<!-- s:68c8d3995f -->
Ograniczenia

<!-- s:910af21777 -->
- Aplikacja działa w środowisku Bun, nie w przeglądarce. `window` i `document` są niezdefiniowane, jak w `text run`.
- Każdy serwer uruchamia jedną aplikację z jedną siatką. Każdy klient MCP uruchamia własny serwer.
- `text mcp` uruchamia własną kopię aplikacji bez interfejsu graficznego. Nie może dołączyć do karty przeglądarki otwartej w `text dev`.
