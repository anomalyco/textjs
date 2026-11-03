<!-- s:88013af27d -->
Middleware uruchamia kod przed zakończeniem żądania. Może przekierowywać, przepisywać adresy, ustawiać nagłówki i pliki cookie lub samodzielnie zwracać odpowiedź.

<!-- s:895d99d1b5 -->
Konwencja

<!-- s:9e6d75b727 -->
Utwórz `middleware.ts` w katalogu głównym projektu (lub w `src/`), obok `app/`. Wyeksportuj funkcję `middleware` (lub eksport domyślny) oraz opcjonalny `config`.

<!-- s:a4d39cdaaf -->
Middleware uruchamia się przed [handlerami tras](/docs/route-handlers), plikami statycznymi i stronami konsoli, w `text dev`, `text start` i każdym serwerowym [adapterze wdrożeniowym](/docs/deploying). Korzysta z interfejsów Web `Request` i `Response`, więc ten sam plik działa w środowiskach Node, Bun, Vercel Edge i Cloudflare Workers.

<!-- s:dda0880da2 -->
Dopasowywanie ścieżek

<!-- s:1e1ec8c339 -->
Bez `config.matcher` middleware uruchamia się dla każdego żądania. Wzorce dopasowania używają tej samej składni co Next.js:

<!-- s:473d472bc8 -->
| Wzorzec | Dopasowania |
| :-- | :-- |
| `/about` | `/about` i `/about/` |
| `/blog/:slug` | `/blog/hello` |
| `/docs/:path*` | `/docs`, `/docs/a/b` |
| `/a/:rest+` | `/a/b`, ale nie `/a` |
| `/user/:id(\\d+)` | `/user/42`, ale nie `/user/ada` |
| `/((?!api/).*)` | Wszystko oprócz `/api/*` |

<!-- s:256aeeefbc -->
Dodaj warunki za pomocą `has` i `missing` (nagłówek, plik cookie, zapytanie lub host):

<!-- s:d756420343 -->
Wzorce dopasowania dotyczą ścieżki bez `basePath`. W `text dev` żądania własnych modułów Vite (`/@vite/*`, pliki źródłowe) nigdy nie uruchamiają middleware.

<!-- s:75cd7297e6 -->
Każdy host ustala jedną kanoniczną ścieżkę przed uruchomieniem middleware i używa jej do dopasowywania, w `request.nextUrl` oraz do wyszukiwania trasy, handlera i pliku. Sekwencje procentowe są dekodowane, a ścieżka jest ponownie kodowana tak, jak zapisuje ją `new URL()`; segmenty `.` i `..` są rozwiązywane, a powtórzone i końcowe ukośniki usuwane. `/ad%6din//users/` dociera do middleware jako `/admin/users`, natomiast `/café` pozostaje `/caf%C3%A9`. Wzorzec z końcowym ukośnikiem, taki jak `/admin/`, dopasowuje `/admin`. Żądania, których ścieżka zawiera zakodowany ukośnik lub ukośnik odwrotny (`%2F`, `%5C`), znak sterujący lub nieprawidłowe kodowanie procentowe, otrzymują `400`. Trasy rozróżniają wielkość liter: `/Admin` nie pasuje do `/admin`, a pliki statyczne są udostępniane wyłącznie pod swoją dokładną nazwą.

<!-- s:3f5746eb4e -->
Dopasuj adresy URL, pod którymi plik jest udostępniany, nie tylko jego nazwę. Cloudflare Pages udostępnia `report.html` także pod `/report`, więc wzorzec dla `/report.html` nie chroni `/report`. Wymień oba adresy, `matcher: ["/report", "/report.html"]`, lub przechowuj chronione pliki w katalogu i dopasuj go, na przykład za pomocą `/reports/:path*` dla plików w `public/reports/`.

<!-- s:85d40f1c72 -->
NextResponse

<!-- s:880215c229 -->
| API | Efekt |
| :-- | :-- |
| `NextResponse.next()` | Przejście do trasy |
| `NextResponse.redirect(url, status?)` | Domyślnie `307`; `url` musi być bezwzględny |
| `NextResponse.rewrite(url)` | Udostępnienie innej ścieżki; zewnętrzne źródła są obsługiwane przez proxy |
| `NextResponse.json(body, init?)` | Odpowiedź w formacie JSON |
| `new Response(...)` | Odpowiedź z dowolną zawartością |

<!-- s:a8292924c3 -->
Nie zwracaj niczego, aby kontynuować bez zmian. `next()` i `rewrite()` przyjmują `{ status }`, aby zmienić status końcowej odpowiedzi. Tylko odpowiedzi utworzone przez `NextResponse.next()` / `NextResponse.rewrite()` sterują routingiem: każda inna `Response`, także zwrócona przez `fetch()`, trafia do klienta bez zmian po usunięciu nagłówków `x-middleware-*`.

<!-- s:583e778785 -->
`request.nextUrl` pomija `basePath` w `pathname`, natomiast jego `href` i `toString()` go uwzględniają. Aby pozostać w obrębie aplikacji, sklonuj go: `const url = request.nextUrl.clone(); url.pathname = "/login"; return NextResponse.redirect(url);`.

<!-- s:b618d4732f -->
Nagłówki

<!-- s:37748fa2c3 -->
Przekaż `request.headers`, aby zmienić to, co otrzymują kolejne handlery, oraz `headers`, aby dodać nagłówki odpowiedzi:

<!-- s:60bf4677c2 -->
Nagłówki odpowiedzi z middleware są dodawane do końcowej odpowiedzi, chyba że handler trasy ustawi ten sam nagłówek.

<!-- s:ef657b8fe3 -->
Pliki cookie

<!-- s:5d3635224b -->
`request.cookies` odczytuje nagłówek `Cookie`; `response.cookies` zapisuje `Set-Cookie`.

<!-- s:4a7b6bbf62 -->
Pliki cookie ustawione w odpowiedzi `next()` lub `rewrite()` są też widoczne dla handlera trasy w tym samym żądaniu.

<!-- s:a65a1ce099 -->
Praca w tle

<!-- s:de593dc070 -->
Drugi argument udostępnia `waitUntil()`, które podtrzymuje działanie środowisk serverless po wysłaniu odpowiedzi:

<!-- s:63e13e87b3 -->
Uwagi

<!-- s:971c06c875 -->
- Strony renderowane po stronie klienta renderują się w przeglądarce, więc przepisanie adresu na inną stronę zmienia udostępniany plik, a nie trasę renderowaną przez aplikację konsolową. Przepisania do handlerów tras, plików statycznych i zewnętrznych źródeł działają zgodnie z oczekiwaniami.
- Middleware może odczytać treść żądania; handlery tras nadal ją otrzymują. Treść żądań wykluczonych przez wzorzec dopasowania nigdy nie jest odczytywana ani zmieniana.
- `request.url` zawsze ma źródło serwera: cele żądań takie jak `//other.host/x` są normalizowane do pojedynczego początkowego ukośnika.
- [Adapter statyczny](/docs/deploying#static) nie może uruchamiać middleware.
