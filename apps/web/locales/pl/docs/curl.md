<!-- s:5f3abb073d -->
Terminalowe klienty HTTP otrzymują pierwszą klatkę strony jako tekst ANSI z kolorami truecolor zamiast dokumentu HTML. Nie musisz niczego konfigurować.

<!-- s:f501ff55e0 -->
Żądania otrzymujące klatkę

<!-- s:3384141bb9 -->
Żądanie otrzymuje klatkę, gdy spełnia wszystkie te warunki:

<!-- s:05a334e510 -->
- metoda to `GET` lub `HEAD`;
- `User-Agent` zaczyna się od `curl/`, `Wget/`, `wget2/`, `HTTPie/` lub `xh/`;
- brakuje nagłówka `Accept` lub nie zawiera on `text/html`.

<!-- s:4af297e372 -->
Przeglądarki, roboty indeksujące i podglądy linków otrzymują stronę HTML. Aby otrzymać HTML za pomocą curl, poproś o niego:

<!-- s:03dba887a9 -->
Klatka jest wybierana w momencie, w którym zostałaby zwrócona strona: po [middleware](/docs/middleware), `rewrites` i [handlerach tras](/docs/route-handlers), ale nigdy dla plików ani ścieżek, których ostatni segment zawiera kropkę. Przekierowania middleware, odpowiedzi `401`, nagłówki i przepisywanie ścieżek działają dla curl tak samo jak dla przeglądarek. `/api/health` nadal uruchamia swój handler, a `/robots.txt` nadal zwraca plik.

<!-- s:e0c4f5f416 -->
Zawartość klatki

<!-- s:50fa4581ec -->
Klatka to pierwszy wynik renderowania strony, jak w [prerenderowanej powłoce](/docs/server-rendering#partial-prerendering): każda granica `<Suspense>`, która nadal czeka, pokazuje swoją zawartość zastępczą. Asynchroniczne komponenty serwerowe nie są uruchamiane, a `fetch()` nigdy nie kończy działania, więc dane ładowane w efektach pozostają w stanie ładowania.

<!-- s:08efeec61a -->
- **Rozmiar:** 80 × 24 komórki. Aplikacja ze stałym obszarem widoku (`viewport.responsive: false`) używa zamiast tego `viewport.width × viewport.height`.
- **Kolory:** 24-bitowe sekwencje sterujące SGR zgodne z `viewport.theme` aplikacji. Każdy wiersz kończy się resetem, a klatka znakiem nowego wiersza.
- **Status:** `200` lub `404` ze stroną błędu „nie znaleziono” aplikacji, gdy żadna strona nie pasuje lub strona wywołuje `notFound()`. Strona, która wywołuje `redirect()` podczas renderowania, zwraca HTML.

<!-- s:1125803eb1 -->
Odpowiedzi mają typ `text/plain; charset=utf-8` oraz nagłówki `Vary: User-Agent, Accept` i `Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate`, więc współdzielone pamięci podręczne nigdy nie zapisują klatki, by następnie zwrócić ją przeglądarce. Strona HTML pod ścieżką, dla której curl otrzymuje klatkę, ma ten sam nagłówek `Vary`.

<!-- s:0e2aba0a67 -->
Obsługiwane środowiska

<!-- s:d40234848f -->
| Host | Strony statyczne | Strony dynamiczne, nieznane ścieżki |
| :-- | :-- | :-- |
| `text dev` | Renderowane na żądanie | Renderowane na żądanie |
| `text start`, `bun` | Prerenderowane przez `text build` | Renderowane na żądanie |
| `vercel`, `cloudflare` | Prerenderowane przez `text build` | Strona HTML |
| `static` | Strona HTML | Strona HTML |

<!-- s:11c905d6a6 -->
Strony renderowane po stronie serwera wymagają `text start` lub `bun` (zobacz [Wdrażanie](/docs/deploying#server-rendered-routes)).

<!-- s:2cdc6d454b -->
Hosty statyczne nie mogą odpowiadać różnie różnym klientom, więc adapter `static` nie obsługuje klatek. Na platformach Vercel i Cloudflare klatki stron statycznych są dostarczane wraz z wynikiem budowania. Strony dynamiczne (`[id]`, `force-dynamic`) zwracają tam HTML, ponieważ adaptery `vercel` i `cloudflare` nie wdrażają renderera.

<!-- s:022d3d5541 -->
`text start` i `bun dist/server.js` renderują pozostałe strony na żądanie za pomocą `.text/server/live.mjs` i przechowują ostatnie 128 klatek przez 10 sekund. Każdy serwer renderuje najwyżej 20 stron spoza pamięci podręcznej na 10 sekund. Po przekroczeniu tego limitu curl otrzymuje stronę HTML do czasu odnowienia limitu. Jeśli nie można załadować `live.mjs` na serwerze, na przykład dlatego, że moduł strony odczytuje `window` na najwyższym poziomie, te strony zwracają HTML.

<!-- s:2500855fbd -->
`text build` raportuje prerenderowane klatki:

<!-- s:37f210b46a -->
Konfiguracja

<!-- s:ac46338e16 -->
Zmień rozmiar dla całej aplikacji lub wyłącz klatki:

<!-- s:36fb2e113c -->
Strona może zmienić własny rozmiar lub zwracać HTML także terminalom:

<!-- s:11c75396f6 -->
Rozmiary są ograniczane do 1–500 komórek. Przy `ansi: false` w `text.config.ts` eksporty stron są ignorowane.

<!-- s:17ae9b44af -->
Zwykły HTTP

<!-- s:e9b0dd23eb -->
curl nie podąża za przekierowaniami, chyba że podasz `-L`. Vercel przekierowuje żądania `http://` do `https://`, podobnie jak Cloudflare z włączoną opcją **Zawsze używaj HTTPS**, więc `curl http://…` wypisuje przekierowanie zamiast klatki. Udostępniaj adresy URL z `https://`.

<!-- s:740b32f53f -->
Własne serwery

<!-- s:144c78c64b -->
`@textjs/app/ansi` eksportuje funkcje pomocnicze do wykrywania żądań i tworzenia odpowiedzi dla serwerów i funkcji, które nie uruchamiają `text start` ani adaptera:

<!-- s:ed621ccb22 -->
`wantsAnsi(request)` przyjmuje też `(method, headers)` z obiektem `Headers` interfejsu Web API lub `IncomingHttpHeaders` ze środowiska Node.js. `frameToAnsi(buffer, { theme })` koduje wyrenderowany `CellBuffer` tak samo jak framework.
