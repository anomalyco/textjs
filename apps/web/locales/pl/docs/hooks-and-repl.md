<!-- s:674f346b70 -->
Hooki łączą komponenty z obsługą wejścia, fokusem i obszarem widocznym.

<!-- s:6296c02ab3 -->
`useInput`

<!-- s:b326ab5213 -->
| Pole | Opis |
| :-- | :-- |
| `key` | `"up"` `"return"` `"escape"` `"tab"`… |
| `input` | Tekst wygenerowany przez klawisz |
| `ctrl` `meta` `shift` `alt` | Modyfikatory |
| `stopPropagation()` | Zatrzymanie handlerów o niższym priorytecie |

<!-- s:0764796164 -->
Skróty klawiszowe przeglądarki, takie jak `⌘⌥J` i `⌘R`, zawsze są przepuszczane.

<!-- s:550c6a7dd5 -->
`usePaste` i `useWheel` przyjmują te same opcje. `ambient` nie wpływa na `useWheel`.

<!-- s:9248f9b147 -->
| Opcja | Opis |
| :-- | :-- |
| `isActive` | `false` wyłącza handler bez odmontowania (domyślnie `true`) |
| `priority` | Wyższe priorytety są wykonywane jako pierwsze (domyślnie `0`). Komponenty z fokusem używają `FOCUSED_INPUT_PRIORITY` (`10`) |
| `global` | Dalsze odbieranie wejścia, gdy poza tym komponentem jest otwarty `<Modal>` (domyślnie `false`) |
| `ambient` | Pomijanie tego handlera przy wyświetlaniu [wskazówki fokusu](#usepagefocus) (domyślnie `false`) |

<!-- s:e4e842287a -->
Skrót klawiszowy Dev Overlay (`F2` lub `` Ctrl+` ``) ma ustawienie ambient, więc strona bez innej obsługi klawiatury nie wyświetla wskazówki.

<!-- s:617ae1bfe8 -->
`usePaste` i `useWheel`

<!-- s:61e72f6177 -->
`useKeyState` (eksperymentalny)

<!-- s:a63d1753a1 -->
`@textjs/react/experimental` eksportuje `useKeyState`, który śledzi przytrzymane fizyczne klawisze według `KeyboardEvent.code` (`"KeyW"`, `"ArrowUp"`, `"ControlLeft"`). Odpytywanie `keys.isDown(code)` lub odczytywanie `keys.pressed` nie wywołuje ponownego renderowania w React. Przekaż funkcję zwrotną, aby reagować na naciśnięcia i zwolnienia klawiszy w momencie ich wystąpienia.

<!-- s:d9e1465ae0 -->
Przytrzymane klawisze są automatycznie zwalniane, gdy strona traci fokus. Zobacz [Zmiany niezgodne wstecznie](/docs/support-policy#breaking-changes), aby dowiedzieć się, jak wersjonowane są eksperymentalne eksporty.

<!-- s:c34856de19 -->
`useViewport`

<!-- s:1bb49ffa96 -->
`usePageFocus`

<!-- s:8dae4284ef -->
`usePageFocus()` zwraca informację, czy strona ma fokus. Naciśnięcia klawiszy docierają do aplikacji tylko wtedy, gdy go ma. To ta sama wartość co `useViewport().focused`, ale ponowne renderowanie następuje tylko przy zmianie fokusu.

<!-- s:e1075d4220 -->
Gdy strona nie ma fokusu, a aplikacja ma handler `useInput` lub `usePaste`, hook `useKeyState` lub element, do którego można przenieść fokus klawiszem Tab, ostatni wiersz klatki konsoli staje się bursztynowym paskiem z tekstem „Kliknij stronę, aby używać klawiatury”. Handlery oznaczone jako [`ambient`](#useinput) nie są uwzględniane. Wskazówka nie pojawia się w terminalu, w testach ani w kopiach widoku osadzonych na stronie. Za każdym razem, gdy wskazówka się pojawia, miga przez około 6 sekund, chyba że włączono systemowe ustawienie ograniczenia ruchu. Aby samodzielnie decydować, kiedy się pojawia, ustaw `focusHint: false` w `text.config.ts` lub `createConsoleRoot` i wyrenderuj `<FocusHint>`:

<!-- s:a537976ab1 -->
`useConsoleStats`

<!-- s:99bae1bb0c -->
`useApp`

<!-- s:e3bd46f1e5 -->
REPL `window.text`

<!-- s:420cc7f125 -->
Każda aplikacja dodaje funkcje pomocnicze do `window.text`. Wpisz je w wierszu poleceń DevTools.
