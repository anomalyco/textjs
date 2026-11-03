<!-- s:04615ef523 -->
`text build` tworzy przenośny katalog `dist/`. Adapter przekształca go w wynik oczekiwany przez platformę.

<!-- s:087f8d3137 -->
Adaptery

<!-- s:04908c6c09 -->
| Adapter | Wynik | Uruchamianie |
| :-- | :-- | :-- |
| *(brak)* | `dist/` + `dist/.text/server` | `text start` (Node) |
| `static` | `dist/` | Dowolny hosting statyczny |
| `bun` | `dist/server.js` | `bun dist/server.js` |
| `vercel` | `.vercel/output` | Vercel (Build Output API v3) |
| `cloudflare` | `dist/` + `_worker.js` | Cloudflare Pages |

<!-- s:7e755a5c9f -->
Adapter może też pochodzić ze zmiennej `TEXTJS_ADAPTER`. Gdy `text build` działa na platformie Vercel (`VERCEL=1`) lub Cloudflare Pages (`CF_PAGES=1`), odpowiedni adapter jest wybierany automatycznie.

<!-- s:9d8df946e5 -->
Adaptery serwerowe (`bun`, `vercel` i `cloudflare`) uruchamiają ten sam potok co `text start`: [middleware](/docs/middleware), `rewrites`, [handlery tras](/docs/route-handlers) z [pamięcią podręczną tras](/docs/caching), zasoby statyczne, a następnie dokument konsoli dla adresów URL stron. Klienty terminalowe, takie jak curl, otrzymują zamiast tego pierwszą klatkę strony jako tekst ANSI. W przypadku `vercel` i `cloudflare` dotyczy to tylko stron statycznych (zobacz [curl i klienty terminalowe](/docs/curl)). Adaptery serwerowe udostępniają pliki z hashem pod `/assets/` z nagłówkiem `Cache-Control: public, max-age=31536000, immutable`.

<!-- s:1a5ee098c6 -->
Hosting statyczny

<!-- s:9ebd0d2866 -->
Użyj go na hostingach bez serwera, takich jak GitHub Pages, S3 lub CDN. Handlery tras `GET` z `dynamic = "force-static"` lub `revalidate` przechodzą prerenderowanie do plików: `app/api/feed.json/route.ts` staje się `dist/api/feed.json`. Kopia `index.html` jest zapisywana jako `404.html`, aby głębokie linki otwierały aplikację konsolową. Hosting statyczny nie potrafi odróżnić curl od przeglądarki, więc curl otrzymuje stronę HTML.

<!-- s:1e90536a2a -->
Budowanie kończy się błędem z listą wszystkich powodów, jeśli aplikacja potrzebuje serwera: `middleware.ts`, [trasy renderowane po stronie serwera](/docs/server-rendering), dynamiczne handlery tras, handlery tras z segmentami dynamicznymi lub metody inne niż `GET`. Zamiast tego skonfiguruj `rewrites` na hostingu.

<!-- s:2c3ddc9047 -->
Bun

<!-- s:d451f14e30 -->
Adapter `bun` zapisuje pojedynczy, samodzielny serwer, który nie potrzebuje `node_modules` podczas działania. Odczytuje `PORT` (domyślnie `3000`) i `HOSTNAME` (domyślnie `0.0.0.0`) i nigdy nie udostępnia `server.js` ani `.text/`. To długotrwały proces, więc obsługuje również [trasy renderowane po stronie serwera](/docs/server-rendering) (`export const runtime = "server"`) i ich aktywne sesje, tak jak `text start`. Użyj go w kontenerze:

<!-- s:0c6d59947b -->
Vercel

<!-- s:b9d1e3b495 -->
Możesz też wypchnąć zmiany do repozytorium Git połączonego z platformą Vercel: proces budowania uruchamia `text build`, wykrywa Vercel i zapisuje `.vercel/output`.

<!-- s:3ee6894582 -->
| Wynik | Zawartość |
| :-- | :-- |
| `static/` | Zbudowany klient (pod `basePath`) |
| `functions/_textjs/server.func` | Jedna funkcja Node.js 22 obsługująca wszystkie handlery tras, ze strumieniowaniem |
| `functions/_middleware.func` | Middleware routingu Edge: `middleware.ts` i ścieżki kanoniczne dla każdej aplikacji |
| `config.json` | Nagłówki zasobów, reguły dopasowania middleware, reguły przepisywania, trasy handlerów i dokument konsoli |

<!-- s:3f3ba93b7d -->
Middleware edge używa protokołu `x-middleware-next` / `x-middleware-rewrite`, więc nadpisywanie nagłówków i przepisywanie odbywa się w routerze platformy Vercel przed dotarciem do funkcji lub CDN. Wszystkie reguły dopasowania współdzielą jeden wzorzec trasy `src`. Żądania nieobjęte żadną regułą pomijają middleware, chyba że ich ścieżka może nie mieć postaci kanonicznej (sekwencje procentowe, znaki kodowane przez parser URL, `//`, segmenty `.` lub `..`, końcowy ukośnik). Middleware dopasowuje wtedy ścieżkę kanoniczną, sprawdza `has` / `missing` i przepisuje żądanie na tę ścieżkę, aby Vercel kierował je w ten sam sposób. Aplikacje bez `middleware.ts` otrzymują tę samą funkcję edge, która wykonuje tylko przepisywanie. Ponieważ każdy wynik budowania zawiera funkcję Edge, wdrażaj z zalogowanego konta Vercel: anonimowe wdrożenia (`vercel deploy --temporary`) nie akceptują funkcji Edge.

<!-- s:b5af065e25 -->
Funkcja handlera jest wewnętrzna. Każda trasa handlera przekazuje jej dopasowaną ścieżkę w nagłówku żądania `x-textjs-path`. Ten nagłówek jest usuwany z każdego żądania przed middleware i po nim, a middleware edge nigdy go nie przekazuje (ani od klienta, ani z `middleware.ts`), więc tylko trasy handlerów mogą go ustawić. Żądania do `/_textjs/*` zwracają `404` bez uruchamiania funkcji, przed middleware i regułami przepisywania oraz po nich. Wygenerowane trasy uwzględniają wielkość liter przy dopasowaniu, tak jak reguły dopasowania i przepisywania na każdym innym hostingu.

<!-- s:5e18b8a450 -->
Testy adaptera uruchamiają ten wynik w lokalnej emulacji routera platformy Vercel. Zachowanie przy dopasowaniu `src`, przechwytywaniu `dest`, przekształcaniu nagłówków i trasach `status` sprawdzono na rzeczywistych wdrożeniach; middleware Edge nie sprawdzono, ponieważ nie można go wdrożyć anonimowo.

<!-- s:14e7957486 -->
Cloudflare Pages

<!-- s:6109800459 -->
Wynik korzysta z trybu zaawansowanego Pages:

<!-- s:9f0923168f -->
| Plik | Przeznaczenie |
| :-- | :-- |
| `_worker.js` | Middleware, reguły przepisywania, handlery tras i dokument konsoli |
| `_routes.json` | Wysyła każde żądanie do workera. Bez middleware ani `basePath` ścieżka `/assets/*` pozostaje w statycznej sieci CDN usługi Pages |
| `_headers` | Niezmienne buforowanie dla `/assets/*` (dopisywane do twoich nagłówków) |
| `404.html` | Sprawia, że Pages odpowiada na brakujące pliki kodem `404` zamiast aplikacją (zachowywany, jeśli już go masz) |

<!-- s:9bc2b010d1 -->
Katalog `.text/` (pakiety serwera i manifesty kompilacji) jest usuwany z `dist/`, ponieważ Pages publikuje katalog bez zmian.

<!-- s:1200dbc88d -->
Włącz flagę zgodności `nodejs_compat` w projekcie Pages (Ustawienia → Środowisko wykonawcze) lub w pliku `wrangler.toml`; pamięć podręczna danych korzysta z `AsyncLocalStorage`. Pliki statyczne są udostępniane przez powiązanie `ASSETS`, a rewalidacja w tle korzysta z `ctx.waitUntil()`.

<!-- s:0bb76cfebb -->
Przy włączonym middleware każde żądanie uruchamia workera, również dla zasobów z hashem, aby middleware widział każdą ścieżkę, pod którą można uzyskać dostęp do pliku. Każde żądanie uruchamiające workera to jedno wywołanie Functions i wlicza się do twojego limitu żądań Workers. Przy wczytywaniu strony obejmuje to dokument i każdy pobierany przez niego plik (2 dla małej aplikacji testowej z jednym pakietem JavaScript; więcej dla aplikacji z większą liczbą plików). W planie Workers Free po wyczerpaniu dziennego limitu Pages udostępnia pliki statyczne bez workera, co pomija middleware. Jeśli middleware chroni cokolwiek w `dist/`, ustaw Ustawienia → Środowisko wykonawcze → Działanie po awarii: otwarte / zamknięte na **Zamknięte po awarii**.

<!-- s:600050383d -->
Aktualizacja

<!-- s:e8733a2bfb -->
Poprawki bezpieczeństwa w `@textjs/app` trafiają do wdrożenia dopiero po ponownym zbudowaniu i wdrożeniu aplikacji:

<!-- s:c74adc728a -->
- Vercel: wdróż nowy katalog `.vercel/output`.
- Cloudflare Pages: wdróż nowy katalog `dist/` z plikami `_worker.js` i `_routes.json`.
- Bun: wdróż cały nowy katalog `dist/` (`server.js`, zasoby i pakiety aktywnych sesji) i uruchom serwer ponownie.
- `text start`: uruchom `text build` i uruchom serwer ponownie.

<!-- s:8047727085 -->
Starsze wdrożenia pozostają dostępne pod własnymi adresami URL (na przykład adresami podglądu Vercel i Cloudflare Pages). Usuń je lub obejmij ochroną dostępu platformy.

<!-- s:f5e077273b -->
Trasy renderowane po stronie serwera

<!-- s:049ef31493 -->
[Trasy renderowane po stronie serwera](/docs/server-rendering) utrzymują sesję dla każdej otwartej karty, więc potrzebują długotrwale działającego serwera: `text start` lub adaptera `bun`. Adaptery `static`, `vercel` i `cloudflare` przerywają budowanie błędem `TX030`, gdy strona eksportuje `runtime = "server"`.

<!-- s:eb19728e6b -->
Za serwerem proxy

<!-- s:21a17d0b45 -->
`text start` nasłuchuje na `127.0.0.1` i podczas nasłuchiwania na interfejsie pętli zwrotnej odpowiada tylko hostom `localhost`, `*.localhost` i hostom z adresem IP (ochrona przed DNS rebinding). Pozostałe hosty otrzymują `403` z `TX028`. Umieść ustawienia publiczne w pliku `text.config.ts`:

<!-- s:43bd5471c8 -->
Bez `origin` ani `trustProxy` adres `request.url` jest budowany ze zweryfikowanego nagłówka `Host` z użyciem `http`.

<!-- s:689cebe287 -->
Ograniczenia

<!-- s:f45e3fb003 -->
- `proxy` w pliku `text.config.ts` działa tylko w `text dev` i `text start`; adaptery go nie uwzględniają. Użyj `rewrites`, które obsługuje każdy adapter serwerowy.
- Każda instancja serverless ma własną pamięć podręczną w pamięci operacyjnej. Zobacz [Buforowanie](/docs/caching#platform-notes).
- Reguły `rewrites` używające surowych grup wyrażeń regularnych są tłumaczone na trasy Vercel w miarę możliwości; parametry nazwane (`:slug`, `:path*`) są odwzorowywane dokładnie.
