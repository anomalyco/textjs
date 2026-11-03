<!-- s:f70688822a -->
Wszystkie istotne zmiany w Text.js są udokumentowane w tym pliku.

<!-- s:1ab5f276ed -->
Format opiera się na [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), a projekt stosuje [wersjonowanie semantyczne](https://semver.org/spec/v2.0.0.html). Wydania od 0.1.0 do 0.4.0 oznaczono tagami w git, ale nie opublikowano w npm.

<!-- s:2e16922cfc -->
Dodano

<!-- s:fd5b09c2ec -->
- `@textjs/react`: `<FocusPad messages>` zastępuje dowolne wbudowane teksty panelu na przetłumaczonych stronach. Obejmuje każdy wiersz, etykiety dla czytników ekranu i kontrolkę rozmiaru konsoli. `<TextCanvas>` i `<ViewportControl>` również przyjmują `messages`. `<ViewportControl>` używa tylko kluczy kontrolki rozmiaru. Teksty zawierające wartość, takie jak „Potem kliknij tutaj i naciśnij ↑ ↓.”, są funkcjami zwracającymi całe zdanie. `defaultFocusPadMessages` zawiera angielskie teksty. Zobacz [Tłumaczenie panelu fokusu](https://textjs.org/docs/internationalization#translating-the-focus-pad).
- `@textjs/react`: na stronach pisanych od prawej do lewej panel fokusu zachowuje kierunek od lewej do prawej dla symboli klawiszy, takich jak ⌘ ⌥ J, i rozmiarów konsoli, takich jak 120×36, oraz odwraca kontrolkę rozmiaru i pasek kroków. Na stronach chińskich i japońskich usuwa spację między dwoma zdaniami; na koreańskich ją zachowuje.
- textjs.org: na textjs.org/ja panel fokusu jest po japońsku na każdej stronie, włącznie z etykietami pod klawiszami każdego dema.

<!-- s:5b88618770 -->
Zmieniono

<!-- s:27b507a9de -->
- `@textjs/core`: konsole przeglądarek Chromium i Firefox czyszczą wyjście animowanych sprite’ów przy 16 MB zamiast 4 MB, więc textjs.org/doom pokazuje „Konsola została wyczyszczona” mniej więcej co 19 sekund zamiast co 4,5 sekundy. Safari oraz sprite’y rysowane półblokami `▀` zachowują limit 4 MB. Szczytowy rozmiar sterty strony textjs.org/doom rośnie z 10,8 MB do około 12–13 MB.
- textjs.org: strona dokumentacji pobiera tylko własny Markdown zamiast wszystkich 33 stron, więc angielskie strony dokumentacji ładują o 43–47 KB mniej JavaScript (gzip), a strony dokumentacji /ja o 60–64 KB mniej. Najechanie kursorem na link do innej strony dokumentacji lub ustawienie na nim fokusu pobiera tę stronę wcześniej, więc nadal otwiera się od razu.

<!-- s:afe76b8d59 -->
Naprawiono

<!-- s:b3d1adfa39 -->
- textjs.org/ja: wyszukiwarka ⌘K pokazuje japońskie nagłówki dokumentacji i dopasowuje do nich japońskie zapytania. Wcześniej wyświetlała angielskie nagłówki pod japońskimi tytułami stron. Angielskie nazwy nadal znajdują strony: `routing` znajduje ルーティング, a `open the console` znajduje コンソールを開く.
- textjs.org: przykład z dokumentacji uruchomiony w twojej konsoli znów pokazuje zmiany w podglądzie na stronie textjs.org/ja oraz w przykładzie tekstu dwukierunkowego na textjs.org/docs/internationalization. Wiersz nad przykładem w konsoli ma teraz treść „▼ Dokumentacja › Licznik” zamiast „▼ Dokumentacja › Wprowadzenie › Licznik”.

<!-- s:125517f5e0 -->
- textjs.org/doom odtwarza efekty dźwiękowe gry Doom, z jej własną panoramą stereo i tłumieniem zależnym od odległości. Dźwięk uruchamia się po pierwszym kliknięciu lub naciśnięciu klawisza na stronie, zatrzymuje się wraz z grą i stosuje ustawienie Sfx Volume w menu Options → Sound Volume gry Doom. Muzyki nie ma.

<!-- s:144aa59e73 -->
- `@textjs/react`, `@textjs/app`: wskazówka dotycząca fokusu („Kliknij stronę, aby używać klawiatury”) ma postać bursztynowego paska z pogrubionym czarnym tekstem w każdym motywie. Wcześniej używała odwróconych kolorów motywu. Za każdym pojawieniem się miga 4 razy przez około 6 sekund, a następnie pozostaje bursztynowa. Nie miga, gdy włączone jest ograniczenie ruchu. Każdy cykl migania zapisuje do 8 dodatkowych klatek konsoli.
- textjs.org: grę Doom przeniesiono na textjs.org/doom. textjs.org/playground/doom przekierowuje pod ten adres.

<!-- s:b91de36548 -->
- `@textjs/core`, `@textjs/react`: panel „Problemy” przeglądarki Chrome nie zgłasza już na każdej stronie komunikatu „Element pola formularza powinien mieć atrybut id lub name”. Ukryte pole klawiatury `<textarea>` ma nazwę `textjs-input`, a element `<select>` rozmiaru konsoli w `ViewportControl` (także w `sizeControl` komponentu `FocusPad`) ma `id` i nazwę `textjs-console-size`. Pole klawiatury `<textarea>` wyłącza też obsługę 1Password, LastPass, Bitwarden i Dashlane.
- textjs.org: nagłówek konsoli na textjs.org/doom ma treść „Text.js / doom” zamiast „Text.js / playground / doom”.
- textjs.org/doom: wąskie okno nie pozostawia już zbędnego „·” po „Zobacz źródło”.
- textjs.org: w wąskim oknie selektor dem w Playground wygasa przy krawędzi, za którą są dalsze dema do przewinięcia, zamiast ucinać ostatnie demo w środku słowa.
- textjs.org/doom działa z częstotliwością gry Doom wynoszącą 35 taktów na sekundę. Na poziomie działało 3,8× za szybko na ekranie 60 Hz (131 taktów na sekundę) i 5,5× przy 120 Hz (192), ponieważ strona uznawała dodatkowe odczyty zegara wykonywane przez grę Doom podczas rysowania poziomu za aktywne oczekiwanie i przesuwała zegar gry o jeden takt przy każdej klatce animacji i każdym wywołaniu zwrotnym timera.

<!-- s:14d523690c -->
- `@textjs/react`: `<Image renderMode="halfblock">` wszędzie rysuje półbloki `▀`, tak jak `<Image>` w wersji 1.3.
- `@textjs/core/experimental`: `drawPixels` przyjmuje `encoding: "rgba"` dla bezstratnego sprite’a z płynną przezroczystością alfa i ponad 256 kolorami oraz funkcję `fallback`, która maluje komórki tam, gdzie nie można pokazać sprite’a.
- `@textjs/app`: curl, Wget, HTTPie i xh otrzymują pierwszą klatkę strony jako tekst ANSI z kolorami truecolor zamiast strony HTML w `text dev`, `text start` oraz adapterach `bun`, `vercel` i `cloudflare`. `text build` wykonuje prerenderowanie klatek stron statycznych. `text start` i `bun` renderują strony dynamiczne i renderowane po stronie serwera na żądanie, a na nieznane ścieżki odpowiadają stroną aplikacji informującą o braku strony i kodem `404`. Domyślny rozmiar klatek to 80 × 24. Zmień rozmiar lub wyłącz klatki za pomocą `ansi` w `text.config.ts` albo `export const ansi` na stronie. Adapter `static` udostępnia curl stronę HTML. Zobacz [curl i klienci terminalowi](https://textjs.org/docs/curl).
- `@textjs/app/ansi` eksportuje `wantsAnsi` i `ansiResponse` dla serwerów, które nie używają `text start` ani adaptera, a `@textjs/react` eksportuje `frameToAnsi`.
- textjs.org: robocza wersja japońska pod adresem textjs.org/ja, począwszy od dokumentacji Wprowadzenie, Instalacja i Routing oraz interfejsu strony. Nieprzetłumaczone akapity są wyświetlane po angielsku. Nie jest jeszcze indeksowana ani dostępna w selektorze języka.

<!-- s:f489f8e451 -->
- `@textjs/react`: `<Image>` rysuje teraz pikselowy sprite w konsolach przeglądarek Chromium i Firefox, do 8 × 16 pikseli na komórkę dla pixel artu i 4 × 8 dla zdjęć. Celowo łamie to obietnicę z [polityki wsparcia](https://textjs.org/docs/support-policy), że klatki wyglądają tak samo między wydaniami minor. Przekaż `renderMode="halfblock"`, aby zachować półbloki z wersji 1.3. Safari, terminale (w tym `text run`), wyjście ANSI i zwykłego tekstu oraz strony renderowane po stronie serwera (`runtime = "server"`) nadal rysują półbloki.
- `@textjs/app`: skrypty i testy dostępności pobierające strony przez curl, Wget, HTTPie lub xh otrzymują teraz tekst ANSI. Aby nadal otrzymywać HTML, wyślij `Accept: text/html` lub ustaw `ansi: false` w `text.config.ts`.
- `@textjs/app`: asynchroniczne komponenty serwerowe nie uruchamiają się już, gdy `text build` wykonuje prerenderowanie powłoki strony. Tak jak wcześniej pokazują zawartość zastępczą `<Suspense>`, bez rozpoczynania żądań danych podczas budowania.
- `@textjs/app`: odtwarzacz klatek stron renderowanych po stronie serwera jest mniejszy o 3 KB, 22,4 KB gzip zamiast 25,4 KB dla `examples/dashboard`. Nie zawiera już metod rysowania z `CellBuffer`, obramowań pól ani przycinania tekstu.

<!-- s:ba0b1ea778 -->
- `@textjs/core`: wykresy i wskaźniki ładowania zachowują siatkę w Windows 10. Czcionką konsoli jest tam Consolas, która nie ma bloków ósemkowych ▁▂▃▅▆▇, ćwiartek, znaków brajlowskich, ▶ ani ✓, a ich zastępcze glify wydłużały wiersze poza prawą krawędź klatki. `CssConsoleDriver` mierzy teraz jednorazowo, które z tych glifów czcionka konsoli rysuje z odchyleniem większym niż jedna piąta komórki, i rysuje je jako najbliższe glify dostępne w Consolas: `_` `▄` `▌` `█` dla ósemek, półbloki dla ćwiartek i znaków brajlowskich, `►` `◄` `√` `×` dla strzałek, znaczników wyboru i krzyżyków. Czcionki, w których te znaki pasują, takie jak Cascadia Mono w Windows 11 i Menlo w macOS, rysują oryginały. `measureText: false` wyłącza to zachowanie.
- `@textjs/core`: nie ma już pionowych linii o szerokości 1 px między sąsiadującymi tłami w DevTools przeglądarek Chrome i Edge, na przykład obok „konto” i „ilość” na textjs.org/coffee. Chromium osobno wyrównuje każdy span `%c` do pikseli urządzenia i mogło nie przypisać piksela na styku dwóch spanów do żadnego z nich. `CssConsoleDriver` wydłuża teraz tło spanu o 1 px pod nieprzezroczystego sąsiada po prawej (`padding-right:1px;margin-right:-1px`). Klatki w przeglądarkach Firefox i Safari nie zmieniają się.
- `@textjs/core`: sprite’y `<Image>` w przeglądarkach Chrome i Edge stosują tę samą regułę 1 px co tekst. Tekst po lewej stronie przezroczystego sprite’a nie maluje już paska swojego tła o szerokości 1 px na jego lewej krawędzi, a sprite szczelnie przylega do nieprzezroczystego tekstu po prawej, także tekstu z odwróconymi kolorami. Sprite zajmujący samodzielnie swoje wiersze sięga teraz prawej krawędzi klatki, tak jak wiersze tekstu nad nim i pod nim.
- `@textjs/react`: `<ConsoleMirror>` rysuje zdjęcie obok tekstu jako półbloki, tak jak konsola, zamiast jako obraz.

<!-- s:757b866128 -->
- `@textjs/react/experimental` eksportuje `<Pixels>` dla buforów klatek aktualizowanych na żywo i `useKeyState` dla przytrzymanych klawiszy; `@textjs/core/experimental` eksportuje `drawPixels`. Mogą się one zmienić w wydaniu minor.
- textjs.org/playground/doom: zagraj w epizod shareware gry Doom w konsoli DevTools.
- `@textjs/react`, `@textjs/app`: gdy strona nie ma fokusu, ostatni wiersz klatki konsoli wyświetla „Kliknij stronę, aby używać klawiatury”, dzięki czemu odwiedzający, który kliknie aplikację w konsoli, wie, dlaczego klawisze przestały działać. Wskazówka pojawia się, gdy aplikacja ma handler `useInput` lub `usePaste` albo cel fokusu, tylko w konsoli przeglądarki, także na trasach renderowanych po stronie serwera. Osadzone podglądy lustrzane i podgląd VS Code jej nie pokazują. Wyłącz ją za pomocą `focusHint: false` w `text.config.ts` lub `createConsoleRoot`.
- `@textjs/react`: `usePageFocus()` zwraca informację, czy strona ma fokus. Aby samodzielnie decydować, kiedy aplikacja potrzebuje klawiatury, ustaw `focusHint: false` i wyrenderuj `<FocusHint active={…}>`. `useInput(handler, { ambient: true })` oznacza zawsze aktywny skrót klawiszowy, który sam nie wywołuje wskazówki.

<!-- s:c96685f5e0 -->
- `@textjs/core`: podczas animacji sprite’a `<Pixels>` komponent `ConsoleRenderer` grupuje klatki kluczowe co 51 ms w Chromium, ustala odstęp między klatkami na 33 ms w Safari i czyści dopisane wyjście w `CssConsoleDriver` przy 4 MB (`SPRITE_MAX_BYTES`). Statyczne sprite’y i aplikacje tekstowe zachowują dotychczasowe tempo i limit czyszczenia co 300 klatek.

<!-- s:34e1835d0a -->
- `@textjs/core`: `bindTextSink(element, onText)` odczytuje tekst zatwierdzony przez IME lub martwy klawisz z ukrytego pola textarea lub input, raz na zatwierdzenie i nigdy w trakcie składania tekstu. `engine.bindTextSink(element)` łączy samodzielnie renderowane pole textarea z `InputEngine`. Obie funkcje zwracają funkcję usuwającą nasłuchy zdarzeń.
- `@textjs/app`: `POST /__textjs/input` przyjmuje `{ type: "text", text }` dla tekstu z IME i martwych klawiszy. `InputMessage` i `parseInputMessage` w `@textjs/app/frame-protocol` uwzględniają ten typ.

<!-- s:60239a49b7 -->
- `@textjs/app`: middleware i handlery tras otrzymują ścieżkę kanoniczną. `/docs/` i `/docs//intro` trafiają do nich jako `/docs` i `/docs/intro`, więc middleware przekierowujące w celu dodania końcowego ukośnika przekierowuje teraz bez końca. Usuń to przekierowanie. Segment dynamiczny nie może zawierać zakodowanego ukośnika: `/files/a%2Fb` zwraca `400`.
- `@textjs/app`: przy użyciu middleware `--adapter cloudflare` wysyła każde żądanie do workera, także żądania zasobów z hashami, a przy `basePath` również żądania spoza ścieżki bazowej. Każde żądanie uruchamiające workera to jedno wywołanie Functions, które wlicza się do limitu żądań Workers. W planie Workers Free ustaw projekt Pages tak, aby blokował dostęp przy awarii (Settings → Runtime → Fail open / closed), inaczej po wyczerpaniu dziennego limitu Pages będzie udostępniać pliki bez middleware.

<!-- s:cb257a7494 -->
- Chińskie, japońskie i koreańskie IME oraz martwe klawisze działają w osadzonych konsolach textjs.org. Konsole czyściły pole textarea w trakcie składania tekstu, więc aplikacja otrzymywała surowe litery lub niewłaściwy znak.
- `<FocusPad>` zachowuje fokus klawiatury w aplikacji po kliknięciu. Wcześniej od razu go tracił, więc chińskie, japońskie i koreańskie IME nie mogły składać tekstu.
- Martwe klawisze, które nie składają znaków (Windows i Linux bez IME), docierają do aplikacji, gdy fokus jest w ukrytym polu textarea. W układzie US-International `'`, a następnie `e` daje `é`, a `'`, a następnie `t` daje `'t`. `InputEngine` blokował zdarzenie keydown kończące obsługę martwego klawisza, więc przeglądarka nic nie wstawiała. `DeadKeyTracker` w `@textjs/core` przepuszcza to zdarzenie keydown, a podgląd VS Code również z niego korzysta.
- Podgląd VS Code dostarcza tekst z IME i martwych klawiszy, który wcześniej odrzucał, i nie przekazuje już do aplikacji martwych klawiszy ani naciśnięć klawiszy służących do składania tekstu przez IME. Z serwerem `text dev` z pakietu `@textjs/app` w wersji 1.1.0 lub starszej wysyła tekst jako naciśnięcia klawiszy lub wklejenie.
- `@textjs/core`: `InputEngine.handleTextInput` ignoruje tekst, gdy `shouldCapture` zwraca `false`, tak jak już wcześniej obsługa klawiszy i wklejania.
- `text dev` wstępnie pakuje `@textjs/app/live-stub` i `@textjs/app/live-player`. Aplikacja ze stroną `runtime = "server"` znajdowała je dopiero po pierwszym załadowaniu strony, więc Vite pakował je ponownie podczas ładowania, co powodowało błędy 404 dla nieaktualnych fragmentów oraz komunikat „Nieprawidłowe wywołanie hooka” z powodu dwóch kopii React.
- Wykresy i wskaźniki ładowania mieszczą się w klatce w Windows. Consolas nie ma bloków ▁▂▃▅▆▇, ćwiartek, znaków brajlowskich, ▶ ani ✓, więc Windows rysował je czcionkami zastępczymi o szerokości do 1,8 komórki, a wiersze wykresów wychodziły poza prawą krawędź klatki. Stos czcionek konsoli to teraz `"SF Mono",Menlo,"Cascadia Mono",Consolas,monospace`, a Windows 11 rysuje całą klatkę czcionką Cascadia Mono. `<ConsoleMirror>`, podgląd VS Code i widok klatki rozszerzenia DevTools również umieszczają Cascadia Mono przed Consolas.
- `@textjs/opencode`: w środowisku Node na Windows most znajduje OpenCode zainstalowane przez `npm i -g opencode-ai`. Node nie może uruchomić po nazwie skryptu pośredniczącego `opencode.cmd` z npm, więc most zachowywał się tak, jakby OpenCode nie było zainstalowane. Teraz przeszukuje `PATH` z każdym rozszerzeniem `PATHEXT` i uruchamia skrypty pośredniczące `.cmd` przez `cmd.exe`. W środowisku Bun (`bunx`) już to działało.
- `text build` działa w Windows. Kończyło się niepowodzeniem dla każdego szablonu, z komunikatem `Could not resolve entry module "virtual:textjs/api"` lub bez komunikatu błędu.
- `text build` wypisuje błąd, gdy prerenderowanie powłok konsoli lub budowanie tras renderowanych po stronie serwera kończy się niepowodzeniem. Wcześniej kończyło działanie z kodem 1 po wierszu „Budowanie nie powiodło się” z Vite, bez podania przyczyny.
- `text dev` w Windows ponownie renderuje trasy renderowane po stronie serwera po edycji pliku i przeładowuje przeglądarkę, gdy strona zmienia eksport `runtime`.
- `text dev` w Windows nie uruchamia już `middleware.ts` dla plików źródłowych udostępnianych przez Vite jako moduły, takich jak `/app/page.tsx`, więc przekierowanie uwierzytelniania nie psuje już klienta deweloperskiego.
- `text run` i `text mcp` działają, gdy ścieżka projektu zawiera krótką nazwę Windows 8.3, taką jak `C:\Users\RUNNER~1`. Pokazywały „Błąd aplikacji”, ponieważ CLI i aplikacja ładowały `@textjs/app` dwukrotnie.
- Katalog `dist/` zbudowany w Windows udostępnia swoje prerenderowane strony w Linux i macOS. Manifest tras działających na żywo przechowywał ścieżki z ukośnikami odwrotnymi.
- `text build` działa, gdy opcja `vite` w `text.config.ts` ustawia `build.rollupOptions.input`. To ustawienie zastępowało punkty wejścia pakietów API, tras renderowanych po stronie serwera i adapterów, przez co budowanie kończyło się niepowodzeniem.
- `text dev` kończy działanie, gdy zatrzymasz je w pierwszych sekundach po załadowaniu strony, a `server.close()` się rozwiązuje. Zamykanie Vite podczas optymalizacji nowo wykrytych zależności nigdy się nie kończyło (vitejs/vite#22934).

<!-- s:a4ff72c5e8 -->
Bezpieczeństwo

<!-- s:a3a674d458 -->
- `@textjs/app` w wersji 1.1.0 i starszych pozwalało żądaniu ominąć `middleware.ts` przez inny zapis chronionej ścieżki, taki jak `/ad%6din`, `/api//admin` lub `/admin%2Fx`. Middleware dopasowywało ścieżkę w wysłanej postaci, natomiast strony, handlery tras i pliki statyczne wyszukiwano po jej zdekodowaniu (dwukrotnym dla handlerów tras). Dotyczyło to `text dev`, `text start` oraz kompilacji z `--adapter bun`, `vercel` i `cloudflare`. Kompilacje statyczne nie mogą używać middleware i nie są objęte problemem. Zaktualizuj do 1.2.0, a następnie ponownie zbuduj i wdroż: `.vercel/output` dla Vercel, `dist/` dla Cloudflare Pages i cały `dist/` dla Bun (uruchom ponownie serwer). Usuń stare wdrożenia nadal dostępne pod własnymi adresami URL lub je zabezpiecz.
- Każdy host wyznacza teraz jedną kanoniczną ścieżkę dla każdego żądania i używa jej w matcherze, `request.nextUrl` i każdym wyszukiwaniu. Dekoduje sekwencje procentowe i ponownie koduje ścieżkę tak, jak zapisuje ją `new URL()`, rozwiązuje segmenty `.` i `..` oraz usuwa powtórzone i końcowe ukośniki. Ścieżki z `%2F`, `%5C` lub nieprawidłowym kodowaniem procentowym otrzymują `400`. `text dev`, `text start` i adapter Bun udostępniają pliki statyczne tylko pod ich dokładną nazwą, więc w macOS i Windows `/ADMIN/report.txt` nie udostępnia już `public/admin/report.txt`.
- Matchery, źródła reguł rewrite, segmenty tras i `basePath` są porównywane w tej samej zakodowanej postaci co ścieżki żądań, więc `matcher: "/café/:path*"` i `"/caf%c3%a9/:path*"` chronią `/caf%C3%A9`, a `"/ops%40corp/:path*"` chroni `/ops@corp`. Middleware bez matchera nie uruchamia się poza `basePath`. Matcher z końcowym ukośnikiem, taki jak `/admin/`, dopasowuje `/admin`, a warunek `host` ignoruje końcową kropkę w nazwie hosta.
- Sesja na żywo dla trasy `runtime = "server"` nie renderuje strony, dla której middleware przepisało ścieżkę lub zapytanie, na przykład z `/restricted` na `/login`, albo odpowiedziało statusem błędu, takim jak `NextResponse.next({ status: 403 })`.
- `--adapter vercel`: funkcja handlera trasy otrzymuje ścieżkę w nagłówku żądania ustawianym tylko przez wygenerowane trasy, więc `/api/x/%252e%252e/admin` nie dociera już do `/api/admin`, a żaden zapis `/_textjs/*` nie uruchamia funkcji. Wygenerowane trasy rozróżniają wielkość liter, więc `/LEGACY/x` nie trafia już do reguły rewrite dla `/legacy/:path*`, której middleware nigdy nie sprawdziło. Każda ścieżka, która może nie być kanoniczna, w tym surowe znaki takie jak `{`, przechodzi przez middleware edge, które jest teraz dołączane do każdej kompilacji Vercel i przepisuje żądanie na jego ścieżkę kanoniczną.
- `--adapter cloudflare`: pliki statyczne są wyszukiwane przy użyciu zakodowanej ścieżki, więc `/x/%252e%252e/admin/report.txt` nie udostępnia już `/admin/report.txt`. Przy `basePath` pliki spoza tej ścieżki nie są już udostępniane bez workera.
- `text dev` nie udostępnia plików `public/` pod `/public/…` ani `/@fs/…`, źródeł tylko serwerowych, takich jak `middleware.ts` i `text.config.ts`, z inną wielkością liter, pod zakodowaną ścieżką `/@fs/`, jako żądań modułów bez rozszerzenia (`/text.config?import`) ani przez regułę rewrite w konfiguracji, ani handlerów tras poza `basePath`.

<!-- s:a0125c854e -->
- Text.js renderuje w konsolach przeglądarek Firefox i Safari. `CssConsoleDriver` wykrywa przeglądarkę przez testy obsługi funkcji CSS. Tam, gdzie spany `%c` pozostają w jednym wierszu, ustawia wysokość wiersza na 14 px bez marginesów, wyłącza miękkie zawijanie i używa kurtyny `line-height: 100vh`.
- Responsywne dopasowanie rozmiaru pozostawia miejsce na kolumnę linków do źródeł w przeglądarce Firefox. Safari umieszcza Menlo na początku stosu czcionek: jego strony nie mogą używać czcionki SF Mono zainstalowanej przez użytkownika, choć Web Inspector może nią rysować.
- Przekaż `browser: "chromium" | "firefox" | "safari"` do `createConsoleRoot`, `ConsoleRenderer` lub `CssConsoleDriver`, aby wybrać konsolę.
- Prerenderowane powłoki zawierają CSS dla obu rodzajów konsoli.
- `<FocusPad>` pokazuje skrót klawiszowy konsoli dla przeglądarki odwiedzającego: ⌘⌥K lub Ctrl+Shift+K w przeglądarce Firefox oraz ⌘⌥C w przeglądarce Safari z informacją, by włączyć „Pokazuj funkcje dla deweloperów witryn”.
- Prerenderowany `<FocusPad>` renderuje skróty klawiszowe wszystkich przeglądarek. Ustaw `data-browser` (`firefox` lub `safari`) i `data-os` (`mac`) na `<html>` przed pierwszym malowaniem, aby pokazać tylko skrót odwiedzającego; bez nich do czasu hydratacji pokazuje skrót przeglądarki Chrome dla Windows i Linux.

<!-- s:74de7c87f7 -->
- ⌘⌥K i Ctrl+Shift+K (skrót klawiszowy konsoli przeglądarki Firefox) trafiają do przeglądarki zamiast do aplikacji.
- Responsywne dopasowanie rozmiaru uczy się wysokości pasków narzędzi przeglądarki poniżej 60 px (w przeglądarkach Safari i Firefox), gdy DevTools jest zamknięte, więc konsola zadokowana u dołu otrzymuje wszystkie mieszczące się wiersze. `<FocusPad>` używa poznanej wysokości do ustalenia, czy DevTools jest zadokowane.
- `<FocusPad>` zapisuje skróty klawiszowe Windows i Linux w stanie oczekiwania na kliknięcie jako `Ctrl+Shift+J`.

<!-- s:0e572baad1 -->
- `@textjs/opencode`: most wypisuje kod parowania przy uruchomieniu, a textjs.org/opencode pyta o niego przy pierwszym połączeniu. Dopóki strona nie wyśle kodu, most odpowiada `428` i nic nie przekazuje do OpenCode, nawet dla dozwolonych źródeł. Każdy kod jest ważny przez jedno uruchomienie mostu, zwrócony token działa tylko ze źródła, które wykonało parowanie, a dziesięć błędnych kodów blokuje parowanie do ponownego uruchomienia mostu.
- `@textjs/opencode`: wdrożenia podglądowe textjs.org w Cloudflare Pages nie są już domyślnie dozwolone. Przekaż `--allow-origin`, aby z nich korzystać.
- textjs.org/opencode odrzuca mosty z `@textjs/opencode` 1.0.x. Uruchom `bunx @textjs/opencode@latest proxy`.
- textjs.org wysyła Content-Security-Policy, `Strict-Transport-Security`, `Cross-Origin-Opener-Policy` i `Cross-Origin-Resource-Policy`. Strona OpenCode łączy się tylko z serwerami pod `127.0.0.1` lub `localhost`.

<!-- s:59f86c9edc -->
- OpenCode Lite: przeglądaj różnice w poszczególnych plikach i historię promptów, konfiguruj skróty z klawiszem prefiksowym oraz zarządzaj kontami dostawców i serwerami MCP. Piaskownica zawiera panel terminala sterowany skryptem.
- OpenCode Lite: wpisz `/`, aby wyszukać polecenia, lub `@`, aby dołączyć plik projektu. Tab otwiera katalog w menu plików. Połączone sesje przeszukują projekt serwera; piaskownica przeszukuje swoje przykładowe repozytorium.
- textjs.org/coffee: demo terminal.shop dostosowuje się do rozmiaru konsoli tak jak aplikacja SSH, z małym, średnim i dużym layoutem oraz komunikatem „twój terminal jest za mały” poniżej 20 × 10. Konto zyskuje metody płatności, profil z edytowalną nazwą i zmiany tygodniowego harmonogramu subskrypcji. Po wylogowaniu koszyk oraz sekcje konta z częstymi pytaniami, informacjami o usłudze i danymi diagnostycznymi otwierają się bez logowania.

<!-- s:d106fb27b3 -->
Wydajność

<!-- s:f59d215740 -->
- `@textjs/react`: `Box` i `Text` przekazują do reconcilera wcześniej oczyszczone propsy sceny zamiast kopiować obiekty propsów przy montowaniu i aktualizacji.
- `@textjs/core`: `SceneNode.getTextModel()` pomija przechodzenie po drzewie inline dla liści `<Text>` z pojedynczym ciągiem znaków i ponownie wykorzystuje buforowane wyzerowane bufory `Uint16Array` `runOf`. `CssConsoleDriver` skanuje kolejne komórki BMP o zgodnym stylu w wewnętrznej pętli, a `ConsoleRenderer` pomija `countYogaNodes()` w niezmienionych klatkach.
- textjs.org: trasy i karty panelu towarzyszącego konsoli są dzielone na fragmenty JS i CSS dla poszczególnych tras. Zdjęcia sklepu są ponownie kodowane z plików źródłowych `photos/final`, a dodatkowe zdjęcia produktów ładują się po najechaniu kursorem lub zmianie slajdu.

<!-- s:6909c337fb -->
- `<ViewportControl>` używa `minWidth` w pikselach zamiast `20ch` i wymienia czcionki zastępcze o dopasowanych metrykach tak jak `<FocusPad>`, więc selektor rozmiaru zachowuje szerokość po załadowaniu `Geist Mono`.

<!-- s:517ba6caf6 -->
- `@textjs/opencode`: most textjs.org/opencode jako osobny pakiet bez zależności. Uruchom `bunx @textjs/opencode proxy` (lub `npx`), aby uruchomić go bez instalowania Vite, React i MCP SDK. `text proxy` nadal działa i uruchamia ten sam most.

<!-- s:884a8abcf6 -->
- Pakiet frameworka i CLI to teraz `@textjs/app`, przemianowany z `@textjs/next`, aby nazwa nie sugerowała oficjalnej integracji z Next.js. `@textjs/next` jest przestarzały na rzecz `@textjs/app` i nie otrzymuje nowych wydań. Aby przejść na nowy pakiet, uruchom `bun remove @textjs/next && bun add @textjs/app` i zastąp `@textjs/next` przez `@textjs/app` w importach, także w podścieżkach takich jak `@textjs/app/link`. CLI nadal nazywa się `text`, a szablony create-text-app zależą od `@textjs/app`.
- Przycisk `[▼]` i inspektor w konsoli noszą nazwę Dev Overlay, a tytuł inspektora to `▼ Dev Overlay · Turbolog`. Text.js DevTools to nazwa wyłącznie rozszerzenia przeglądarki Chrome. `<TextDevOverlay>` i jego propsy pozostają bez zmian.
- Handlery tras eksportujące `dynamic = "error"` kończą się błędem `TX031`. Text.js traktowało tę wartość jak `"force-static"` bez sprawdzania, czy handler odczytuje żądanie, co ta wartość oznacza w Next.js. Użyj `"force-static"`.

<!-- s:e21d3058df -->
- `text start` odpowiada na zablokowany `Host` kodem `TX028`, tak jak `text dev`. Każdy serwer podaje nazwę odczytywanego ustawienia: `vite.server.allowedHosts` dla `text dev` i `server.allowedHosts` dla `text start`.
- textjs.org: rozdział Wdrażanie w sekcji Nauka nie poleca już dodawania reguły rewrite w `vercel.json`. Na Vercel i Cloudflare Pages `text build` samodzielnie zapisuje zastępczy `index.html`. Przykład reguły rewrite używa teraz pliku `_redirects` platformy Netlify.
- `eslint-plugin-textjs`: `route-handler-exports` dopuszcza eksporty `dynamic` i `revalidate` w `route.ts`, a `valid-route-module` sprawdza tam wartości `dynamic`.

<!-- s:9fc693fec9 -->
- textjs.org: odtwarzany film rozdziału w sekcji Nauka przenosi się do miniodtwarzacza w rogu, gdy przewiniesz stronę poza niego. Przycisk Napisy pod każdym filmem włącza lub wyłącza napisy i zapamiętuje wybór.
- `<TextDevOverlay>` przyjmuje propsy `pill`, `shortcut` i `shell`, więc aplikacje bez App Router mogą zamontować inspektor z własnymi klawiszami i kontrolkami motywu.
- `<FocusPad>` przyjmuje `banner`, wyświetlany jako pierwszy wiersz komunikatu (na przykład logotyp aplikacji) i nad powiadomieniem na urządzeniach dotykowych.

<!-- s:45920d8903 -->
- textjs.org: selektor Playground wymienia Panel, Strumieniowanie, Węża, OpenCode i Kawę (terminal.shop). Każde demo ma własny URL: OpenCode jest pod `/opencode`, a terminal.shop pod `/coffee`, a ich logotypy znajdują się na początku komunikatu. Licznik i Formularz przeniesiono poza Playground; dokumentacja nadal uruchamia oba jako przykłady na żywo.
- `<FocusPad>` ma nowy layout. Każdy stan pokazuje trzyczęściowy pasek postępu, nagłówek, jeden duży element i wiersz tekstu. Przed otwarciem konsoli dużym elementem jest skrót klawiszowy DevTools. Podczas oczekiwania na kliknięcie jest nim wskaźnik. Po uruchomieniu są nim `hints` aplikacji w postaci klawiszy podświetlanych przy naciśnięciu, a klawisze bez wskazówki są wyświetlane poniżej. Usunięto etykiety kroków, osobną odznakę „Na żywo” i wiersz „Obserwuj konsolę.”. Wiersze pojawiają się płynnie przy zmianie stanu, nigdy przy pierwszym malowaniu, a ruch jest wyłączony przy `prefers-reduced-motion`. Tekst drugorzędny spełnia wymagania kontrastu WCAG AA w obu wariantach wyglądu, a selektor rozmiaru konsoli pokazuje obwódkę fokusu po przejściu do niego klawiaturą.
- textjs.org: Playground używa nowego layoutu `<FocusPad>`. Bieżące demo w selektorze ma powierzchnię klawiszy, pole polecenia OpenCode ma takie same narożniki i rozmiar tekstu jak pole URL, uwaga terminal.shop zajmuje dwa wiersze zamiast trzech, „Zobacz źródło” znajduje się na linii bazowej kontrolki rozmiaru, a stonowany tekst w panelu spełnia wymagania kontrastu AA.

<!-- s:01075dcc87 -->
- `text dev` obsługuje ścieżki `proxy` przez proxy dla każdego żądania. `fetch()` wysyła `Accept: */*`, więc serwer deweloperski najpierw odpowiadał na nie kodem HTML aplikacji, a szablon opencode kończył pierwsze uruchomienie błędem „Nieoczekiwany token '<'”.
- `text dev` nie ładuje już drugiej kopii React, gdy skanowanie zależności Vite odczytuje plik tylko serwerowy. Skanowanie uruchamiało kontrolę importu tylko serwerowego, która wypisywała stos wywołań, następnie „Nieprawidłowe wywołanie hooka” w konsoli i psuła Fast Refresh.
- `text dev` obsługuje adresy URL stron z ciągiem zapytania, takie jak `/?demo`. Vite traktował je jak folder projektu i obserwował cały dysk, więc w Linux strona nigdy się nie ładowała.
- create-text-app: przycisk deweloperski nie zasłania już pierwszej wskazówki klawisza na pierwszym ekranie żadnego szablonu, domyślna nazwa projektu to `my-app` zgodnie z dokumentacją, szablony przechodzą zalecaną konfigurację `eslint-plugin-textjs`, a README panelu wyjaśnia budowanie z `--adapter static`.
- `<FocusPad>` i `<ViewportControl>` ustawiają obramowania wyłącznie za pomocą właściwości nieskróconych. React ostrzegał „Aktualizacja właściwości stylu podczas ponownego renderowania (border)” w trybie deweloperskim przy każdym mignięciu wskazówki klawisza.
- Tekst będący ostatnim elementem w wierszu zachowuje teraz pozycję, gdy staje się krótszy. Po `<Spacer>` pozostawał w miejscu wyznaczonym przez najdłuższy tekst, a elementy sąsiednie zmniejszone do przepełnionego wiersza pozostawały zmniejszone.
- `<FocusPad>` zastępuje swoje kroki, podtytuł i wiersze klawiszy po zmianie `action` lub `hints`, więc przełączanie dem w jednym panelu nie jest zgłaszane jako przesunięcie layoutu.
- `@textjs/react/testing` ładuje Yoga przy imporcie, więc test może podstawić atrapę `fetch` przed pierwszym `render()`.

<!-- s:64f8dbac91 -->
Pierwsze stabilne wydanie. `▼ Text.js 1.0.0 (Turbolog)`.

<!-- s:4841011fa5 -->
- **Zmiana niezgodna wstecz:** pakiet frameworka i CLI to teraz `@textjs/next` (`textjs` jest zajęte w npm). Zmień importy z `textjs` na `@textjs/next`.
- Most OpenCode to `bunx @textjs/app proxy` i działa z dowolnego katalogu.
- Konsola domyślnie dopasowuje się do zadokowanego panelu DevTools (dokowanie u dołu, po lewej lub prawej, powiększenie strony, zawijanie paska narzędzi). Niezadokowane DevTools używa rozmiaru zastępczego `120×36`. Panele zyskały kontrolkę rozmiaru.

<!-- s:dd18fee429 -->
- `useKeymap` z automatycznym ekranem pomocy `?`, wskazówkami klawiszy i paletą poleceń `Ctrl+K`.
- Komponenty danych: `List` (wirtualizowany), `Table`, `Tree`.
- Wykresy: `LineChart`, `BarChart`, `Sparkline`, `ProgressBar`, a także `Gradient` i `Image`.
- Kontrolki: `Button`, `Checkbox`, `Switch`, `RadioGroup`, `Slider`, `Dialog`, `Confirm` i powiadomienia typu toast.
- Layout: `Center`, `Stack`, `Grid`, `SplitPane`, `FocusScope`.
- Hooki do timerów, animacji, pomiarów, breakpointów, przechowywania danych i schowka.
- Tekst od prawej do lewej. Text.js implementuje algorytm dwukierunkowy Unicode (UAX #9, Unicode 18.0) i przechodzi wszystkie 770 241 przypadków `BidiTest.txt` i 91 707 przypadków `BidiCharacterTest.txt`. Znaki arabskie otrzymują odpowiednie formy, a `<Text dir>` izoluje span.
- Stabilne kody błędów `TX###`. Błędy frameworka zawierają kod i link do `https://textjs.org/errors/<code>`.
- `@textjs/react/testing` do renderowania komponentów do tekstu w testach.
- `@textjs/react/terminal` i `text run`, które renderuje aplikację App Router w prawdziwym terminalu.
- `text mcp`, które udostępnia aplikację przez Model Context Protocol, aby agenci programistyczni mogli po niej nawigować, naciskać klawisze i odczytywać klatki bez przeglądarki.
- Rozszerzenie Text.js DevTools, panel obok Konsoli z drzewem komponentów, inspektorem klatek i osią czasu.
- `eslint-plugin-textjs` i rozszerzenie VS Code z podglądami na żywo.
- `apps/terminal-shop`: sklep terminal.shop w konsoli korzystający z prawdziwego API (domyślnie piaskownica deweloperska, produkcja zabezpieczona podwójnie).
- textjs.org: Nauka, 10-rozdziałowy kurs działający w konsoli. Prerenderowanie podczas budowania z hydratacją, samodzielnie hostowane czcionki o dopasowanych metrykach, trasy `.html` bez ukośników i nowe strony dokumentacji z podglądami na żywo.

<!-- s:25c8658848 -->
- Przerwano blokadę fazową ograniczania częstotliwości DevTools po czyszczeniu. Po klatce czyszczącej renderer czeka jednorazowo 110 ms, aby kolejne klatki trafiały na natychmiastową ścieżkę DevTools. Opóźnienie wyświetlania p50 spadło z 63 ms do 10 ms.
- Częściowe malowanie pasm zmian: ponownie malowane są tylko pasma wierszy objęte mutacją.
- Buforowane hashe wierszy, całkowitoliczbowe identyfikatory stylów i klatki bezczynności bez alokacji.
- Zero timerów bezczynności, gdy strona jest ukryta lub nie ma fokusu.

<!-- s:2f477ecf74 -->
- Brak pozornych pustych spanów warstwy malowania na końcach wierszy i brak podwójnej kurtyny.
- Kurtyna zajmuje własny wiersz, więc link do źródła w DevTools (`VM12:1`) nigdy nie zawija wiersza 0.
- Domyślny wskaźnik ładowania dokładnie pasuje do komórek (Menlo nie ma glifów brajlowskich). Wariant `braille` wymaga jawnego włączenia.
- `text build` w środowisku Node nie pakuje już deweloperskich kompilacji React.
- textjs.org: skumulowane przesunięcie layoutu wynosi 0 na każdej trasie. Playground i OpenCode współdzielą jeden layout panelu.
- textjs.org: paski boczne dokumentacji i sekcji Nauka pozostają przypięte u dołu długich stron.
- textjs.org: karty plików, bloki kodu i tabele w tekście przewijają się tylko poziomo, więc Safari w iOS nigdy nie przechwytuje pionowych gestów przewijania strony.
- textjs.org: `scrollbar-gutter: stable` dotyczy tylko urządzeń z myszą. W Safari na iOS powodowało skok przy pierwszym przewinięciu.
- textjs.org: kotwiczenie przewijania jest wyłączone. W Safari na iOS przypinało sekcję główną pod przyklejonym nagłówkiem.

<!-- s:986367c89f -->
Klatki bez migania i renderowanie po stronie serwera.

<!-- s:f92fe85dce -->
- Klatki są dopisywane zamiast wywoływania `console.clear()` + `console.log()` dla każdej klatki. DevTools czyści konsolę synchronicznie, ale rysuje nowe komunikaty z ograniczeniem częstotliwości do 50 ms, więc czyszczenie pozostawiało pustą konsolę w 70,6% odrysowań DevTools przy 15 kl./s i 81,1% przy 60 kl./s. Początkowy span kurtyny o zerowej szerokości ukrywa wcześniejsze klatki. Konsola jest czyszczona tylko przy pierwszej klatce, po `invalidate()`, w stanie bezczynności po zebraniu 100 klatek lub po 300 klatkach.
- Emitowane klatki są rozdzielone odstępem co najmniej 66 ms (około 15 kl./s). Szybsze klatki ponownie uruchamiają ogranicznik częstotliwości DevTools i są odrzucane: przy 60 kl./s DevTools narysowało 67 z 295 wyemitowanych klatek.
- Playground i OpenCode to pełnoekranowe panele fokusu.

<!-- s:79bc055b31 -->
- CSS spanów używający wyłącznie właściwości nieskróconych, co zmniejsza liczbę właściwości kopiowanych przez DevTools do każdego wiersza z około 33 do około 7. Kolory szesnastkowe i ciągi pustych komórek z kluczem opartym wyłącznie na tle.
- Przyrostowe parsowanie Markdown i memoizowane wiersze `Markdown`, `Code` i `Diff`.
- Jednoprzebiegowe przetwarzanie propsów hosta, aktualizacje tylko zmienionych propsów i brak ponownego obliczania layoutu przez Yoga, gdy rozmiar tekstu nie może się zmienić.
- Czas klatki strumieniowej spadł z 0,79 ms do 0,14 ms, a kroku spinnera z 0,90 ms do 0,056 ms. Wynik jest identyczny bitowo.

<!-- s:52e989e27d -->
- Renderowanie po stronie serwera. Strona eksportująca `runtime = "server"` renderuje się na serwerze, łącznie z komponentami `async function`, i przesyła strumieniowo zmiany komórek na poziomie wierszy przez zdarzenia wysyłane przez serwer do odtwarzacza klatek o rozmiarze około 19 kB po kompresji gzip.
- Częściowe prerenderowanie. `text build` osadza pierwszą klatkę każdej trasy statycznej w jej HTML, więc konsola rysuje ją, zanim załaduje się jakikolwiek moduł.
- `middleware.ts`, konfiguracja segmentów tras (`dynamic`, `revalidate`) i `textjs/cache` (`unstable_cache`, `revalidateTag`, `revalidatePath`).
- `text build --adapter static|bun|vercel|cloudflare`.
- `bench/devtools`: narzędzie testowe sterujące rzeczywistym frontendem DevTools i mierzące puste odrysowania, odrzucone klatki, opóźnienie wyświetlania i zużycie CPU przez DevTools.

<!-- s:7932537f20 -->
- DevTools nie zamienia już tekstu `path:line`, `//host:port` i `data:` w linki.
- Most OpenCode znajduje zarządzany demon (port efemeryczny, uwierzytelnianie podstawowe), wysyła nagłówek CSRF przy zapisie i zgłasza błędy w jednym wierszu.

<!-- s:6dddbd2f6c -->
- Pojedyncze zdarzenia wejściowe (naciśnięcie klawisza, wklejenie) powodują synchroniczne renderowanie w tym samym zadaniu zamiast oczekiwania na następną klatkę animacji.
- Uproszczony interfejs TUI OpenCode zgodny z oryginałem.
- Pełna aktualizacja textjs.org pod kątem urządzeń mobilnych i responsywności.

<!-- s:1d66ad9bc5 -->
- `@textjs/font`: parser i renderer czcionek FIGlet z 17 dołączonymi czcionkami, dla `<FigletText>` i `<AsciiFont>`. Wynik odpowiada 273 wzorcom zapisanym z pliku binarnego `figlet` 2.2.5.
- `text proxy`: lokalny most CORS umożliwiający textjs.org komunikację z twoim serwerem OpenCode.

<!-- s:1331e4db42 -->
- `apps/opencode-console`: połączony klient OpenCode renderowany w `console.log`, z trybem demonstracyjnym, gdy żaden serwer nie działa.
- Szablon `opencode` dla `create-text-app`.
- textjs.org: nowa strona główna, panel towarzyszący konsoli na żywo, Playground, strona OpenCode i dokumentacja.
- Proces wdrażania w GitHub Pages z generowaniem tras statycznych.

<!-- s:a1b0bb2bf5 -->
Pierwszy kamień milowy.

<!-- s:67e64392c2 -->
- `@textjs/core`: `CellBuffer` oparty na płaskich tablicach typowanych, layout Yoga WASM, pomiar tekstu przez `Intl.Segmenter` i sterownik kodowania długości serii `%c`. Jedno wywołanie `console.log` na zmienioną klatkę i żadne w stanie bezczynności.
- `@textjs/react`: reconciler React 19, komponenty PascalCase (`Box`, `Text`, `ScrollBox`, `Input`, `Textarea`, `Select`, `Tabs`, `Code`, `Markdown`, `Diff`, `Modal`, `Spinner` i inne), narzędzia `className` w stylu Tailwind na poziomie komórek, motywy i DOM-owy `FocusPad`.
- `textjs`: App Router oparty na systemie plików (`layout`, `page`, `loading`, `error`, `not-found`, segmenty dynamiczne, handlery tras), `text dev`, `text build`, `text start` i inspektor `[▼]` w konsoli.
- `create-text-app` z szablonami `starter` i `dashboard`.
