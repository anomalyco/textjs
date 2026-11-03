<!-- s:e9f791b208 -->
`text run` renderuje aplikację App Router w terminalu. Layout, komponenty, mapy klawiszy i handlery tras są współdzielone z przeglądarką. Wyjście używa ANSI truecolor zamiast spanów `%c`.

<!-- s:7d8aa376e3 -->
Naciśnij `Ctrl+C`, aby zakończyć. `text run` wymaga środowiska Bun.

<!-- s:eed3d00ac7 -->
`text run`

<!-- s:36358c3ead -->
`text run` importuje każdy plik w `app/`, montuje App Router z historią w pamięci i rysuje go na pełnym ekranie. `<Link>`, `useRouter()`, `notFound()` i `redirect()` działają bez zmian.

<!-- s:75b65c161d -->
Wywołania `fetch("/api/...")` do tego samego źródła uruchamiają twoje handlery `route.ts` w tym samym procesie, dokładnie tak, jak obsługiwałoby je `text dev`. Pozostałe adresy URL trafiają do sieci.

<!-- s:13fda297e2 -->
`renderToTerminal`

<!-- s:1bcde87690 -->
Dla pojedynczego komponentu lub własnego CLI:

<!-- s:e62e62bfaa -->
`useApp().exit()` odmontowuje aplikację i przywraca stan terminala.

<!-- s:082b75dda7 -->
| Opcja | Opis |
| :-- | :-- |
| `stdin` / `stdout` | Domyślnie `process.stdin` / `process.stdout` |
| `cols` / `rows` | Stały rozmiar (domyślnie: zgodny z terminalem) |
| `altScreen` | Przywracanie historii przewijania przy wyjściu (domyślnie `true`) |
| `mouse` | Przewijanie kółkiem (domyślnie `true`) |
| `exitOnCtrlC` | Domyślnie `true` |
| `fps` | Limit klatek (domyślnie `60`) |
| `patchConsole` | Wstrzymywanie `console.*` do wyjścia (domyślnie `true`) |
| `theme` / `transparent` | Jak w `createConsoleRoot` |

<!-- s:e34e364b9c -->
Wyjście

<!-- s:2ac174afda -->
Każda klatka jest porównywana wiersz po wierszu. Zapisywane są tylko zmienione wiersze, otoczone znacznikami synchronizacji wyjścia, dzięki czemu terminale, które je obsługują, nigdy nie pokazują częściowo narysowanej klatki. Bezczynne aplikacje niczego nie zapisują.

<!-- s:99a3c4d459 -->
Wejście

<!-- s:4a9817d820 -->
Wejście stdin w trybie surowym jest parsowane na te same zdarzenia, które generuje przeglądarka: strzałki i klawisze funkcyjne z modyfikatorami, kombinacje z `Alt`, wklejanie w trybie bracketed paste, kółko myszy SGR i protokół klawiatury kitty. `TerminalInputParser` i `parseTerminalInput` są eksportowane, jeśli potrzebujesz ich gdzie indziej.

<!-- s:6b688e229b -->
Różnice

<!-- s:56ed51fed3 -->
| Funkcja | DevTools | Terminal |
| :-- | :-- | :-- |
| Tempo klatek | ~15 kl./s | Do `fps` |
| Rozmiar siatki | Zadokowana konsola | Okno terminala |
| `<Image src>` | Ładowanie przez canvas | Użyj `pixels` |
| `console.log` | Twoje klatki | Wstrzymane do wyjścia |
