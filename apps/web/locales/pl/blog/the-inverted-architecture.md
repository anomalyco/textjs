<!-- s:710c25737e -->
We frameworku DOM komponenty stają się węzłami DOM, które przeglądarka rozmieszcza i rysuje na stronie. W Text.js komponenty stają się komórkami, a każda zmieniona klatka komórek staje się jednym wywołaniem `console.log` w DevTools. Nazywamy to odwróconą architekturą.

<!-- s:d00a01bf6f -->
Potok

<!-- s:12c6e8f741 -->
Każdy etap istnieje dlatego, że konsola jest nietypowym wyświetlaczem. Używa pisma o stałej szerokości, jest zorganizowana w wiersze i stylowana za pomocą `%c`, a DevTools decyduje, kiedy ją odmalować.

<!-- s:db7daa7cf2 -->
Reconciler

<!-- s:f3cdc101e1 -->
`@textjs/react` to reconciler dla React 19 (`react-reconciler@0.34.0`) z dwoma elementami hosta, `tx-box` i `tx-text`, oraz instancjami tekstowymi dla dzieci będących ciągami znaków. Wszystko, co importujesz, od `<Box>` po `<Markdown>`, jest na nich zbudowane. Commity są planowane przez `requestAnimationFrame`, a naciśnięcie klawisza lub wklejenie powoduje synchroniczne renderowanie w tym samym zadaniu.

<!-- s:1ab8b509e0 -->
Layout

<!-- s:c4d7c2c9e5 -->
Yoga, skompilowana do WebAssembly, rozmieszcza drzewo z `pointScaleFactor = 1`, więc każdy box trafia na pełną komórkę. Tekst jest mierzony za pomocą `Intl.Segmenter` i tabel szerokości znaków wschodnioazjatyckich, więc `你好` zajmuje cztery komórki, a `🚀` dwie. Jeśli edycja nie może zmienić rozmiaru węzła tekstowego, Yoga nie jest ponownie wywoływana.

<!-- s:28cb69fc5d -->
CellBuffer

<!-- s:895fd57e22 -->
Klatka to siatka tablic typowanych alokowanych raz: znaki w `Uint32Array`, kolor tekstu i tła jako spakowane `0xRRGGBBAA`, atrybuty jako maska bitowa `Uint16Array`. Rysowanie zapisuje dane w tych tablicach i śledzi, których wierszy dotknęło.

<!-- s:2a9b8dd7b1 -->
Bramka

<!-- s:1cdfa61881 -->
Każdy wiersz ma zapisany w pamięci podręcznej 32-bitowy hash FNV-1a. Hash jest obliczany ponownie tylko dla wierszy zapisanych od ostatniej klatki. Jeśli żaden wiersz się nie zmienił, sterownik kończy działanie, zanim zbuduje ciąg znaków, i nie wykonuje żadnego wywołania konsoli. Spinner na ukrytej karcie nic nie kosztuje, ponieważ się nie obraca.

<!-- s:a36177ad5b -->
Kodowanie długości serii

<!-- s:c372fac68d -->
Zmienione wiersze są ponownie skanowane i dzielone na serie o identycznym stylu, a każda seria staje się jednym spanem `%c`. Serie mogą przechodzić przez podziały wierszy. Ciągi CSS są internowane pod całkowitoliczbowymi identyfikatorami stylów, więc najczęściej wykonywana ścieżka nigdy nie buduje tego samego ciągu dwa razy. Panel 100×32 to 3200 komórek i 149 spanów.

<!-- s:922d9e42bd -->
Ciąg formatujący chroni też przed dwoma zachowaniami DevTools. Dosłowny `%` jest zapisywany jako `%%`. Znak word joiner trafia po `://`, wewnątrz `www.` i w `path:line`, aby DevTools nie zamieniało twojego tekstu w link i nie odmalowywało go własnymi kolorami.

<!-- s:f55ed8e2b0 -->
Jedno wywołanie

<!-- s:b57bb25475 -->
Każda zmieniona klatka to pojedyncze wywołanie:

<!-- s:e3e37e3616 -->
Klatki są dopisywane w tempie dopasowanym do ogranicznika DevTools działającego co 50 ms i podmieniane w ramach jednego odmalowania. Ten etap opisuje artykuł [Turbolog: eliminowanie migotania](/blog/turbolog-eliminating-the-flash).

<!-- s:99a3c4d459 -->
Obsługa wejścia

<!-- s:e569f67f37 -->
Konsola nie może odbierać naciśnięć klawiszy, więc robi to strona. Ukryty element `<textarea>` zbiera naciśnięcia klawiszy, wklejany tekst i kompozycję IME, a zdarzenia `wheel` przewijają komponenty `ScrollBox`. W serwisie textjs.org strony Playground i OpenCode stanowią jeden duży panel fokusu. Otwórz konsolę, a następnie kliknij stronę, aby pisać.

<!-- s:7db6aa160c -->
Co widzi strona

<!-- s:03e00f4b44 -->
Strona nie może odczytać rozmiaru konsoli, tylko własnego okna, więc Text.js go wywnioskuje: zadokowany panel zmniejsza `innerWidth` lub `innerHeight`, podczas gdy `outer*` pozostaje bez zmian, a każda hipoteza dokowania jest sprawdzana dla poziomów powiększenia przeglądarki Chrome. Wygrywa najlepsze dopasowanie. Stałe (56 px poziomego odstępu wewnętrznego, 104 px interfejsu konsoli, 14 px odstępu między wierszami) zmierzono w rzeczywistym frontendzie DevTools.
