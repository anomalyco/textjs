<!-- s:5b67b32177 -->
Zapisuj odpowiedzi handlerów tras i dane w pamięci podręcznej, a następnie rewaliduj je okresowo lub na żądanie. Nieaktualne wpisy są zwracane natychmiast, podczas gdy w tle trwa jedno odświeżanie.

<!-- s:be697310c8 -->
Handlery tras

<!-- s:e85fc29fe2 -->
Handlery tras `GET` są domyślnie dynamiczne. Włącz buforowanie w konfiguracji segmentu trasy:

<!-- s:e4ccf65c67 -->
| Eksport | Zachowanie |
| :-- | :-- |
| *(brak)* | Uruchamianie przy każdym żądaniu |
| `dynamic = "force-static"` | Buforowanie do rewalidacji |
| `revalidate = N` | Buforowanie; utrata aktualności po `N` sekundach |
| `revalidate = 0` lub `dynamic = "force-dynamic"` | Uruchamianie przy każdym żądaniu |

<!-- s:274c053db6 -->
Inne wartości `dynamic` powodują błąd `TX031`. Dotyczy to także wartości `"error"` z Next.js, ponieważ Text.js nie potrafi wykryć, kiedy handler odczytuje żądanie.

<!-- s:0fae4045f6 -->
Buforowane handlery mają jeden wpis na ścieżkę, a ich `request` wygląda tak jak podczas budowania: bez ciągu zapytania, nagłówków, plików cookie ani treści. Odczytuj je w handlerze dynamicznym. Buforowane są tylko `GET` i `HEAD`. Odpowiedzi ze statusem `5xx`, nagłówkiem `Set-Cookie` lub `Cache-Control: private` / `no-store` są zwracane, ale nigdy nie są zapisywane.

<!-- s:b618d4732f -->
Nagłówki

<!-- s:c0a6cf7351 -->
Buforowane odpowiedzi zawierają:

<!-- s:b5f8cfecb4 -->
| Nagłówek | Wartość |
| :-- | :-- |
| `x-textjs-cache` | `MISS`, `HIT` lub `STALE` |
| `Cache-Control` | `s-maxage=N, stale-while-revalidate=<1 year − N>` lub `s-maxage=31536000` dla `force-static` |

<!-- s:c1fb73c64a -->
Gdy [middleware](/docs/middleware) ustawia pliki cookie, przepisuje żądanie lub nadpisuje jego nagłówki, wygenerowany nagłówek przyjmuje wartość `private, no-cache, no-store, max-age=0, must-revalidate`, więc współdzielone pamięci podręczne nigdy nie odtwarzają decyzji podjętej dla konkretnego odwiedzającego. Nagłówek `Cache-Control` ustawiony przez handler zostaje zachowany.

<!-- s:ae27ba22c7 -->
W `text dev` konfiguracja segmentu obowiązuje, ale nic nie jest zapisywane, więc każde żądanie uruchamia handler.

<!-- s:64841df645 -->
Pamięć podręczna danych

<!-- s:2187e2262b -->
Buforuj dowolną funkcję asynchroniczną za pomocą `unstable_cache` z `@textjs/app/cache`:

<!-- s:4c26e099ff -->
Klucz składa się z części klucza i argumentów zakodowanych według wartości (argumenty `undefined` i `null`, `Map`, `Set`, `Date` i `URL` pozostają rozróżnialne). Bez części klucza funkcję identyfikują jej kod źródłowy i miejsce utworzenia; przekazuj części klucza zawsze, gdy funkcja przechwytuje wartości w domknięciu, na przykład gdy jest tworzona dla każdego żądania lub w pętli. Wyniki są serializowane do JSON, więc każde wywołanie zwraca nową kopię (a obiekty `Date` wracają jako ciągi znaków); wynik, którego nie można serializować, powoduje zgłoszenie wyjątku. `cache(fn, { key, tags, revalidate })` przyjmuje te same ustawienia w postaci obiektu opcji.

<!-- s:608eee0e9b -->
W buforowanym handlerze trasy wpisy danych przekazują swoje tagi i najkrótszy czas `revalidate` do trasy: rewalidacja `"posts"` odświeża także `/api/posts`. Wywołanie danych z `revalidate: 0` sprawia, że trasa staje się dynamiczna.

<!-- s:5537f337ee -->
Stale-while-revalidate

<!-- s:7d23e84252 -->
Gdy wiek wpisu przekroczy `revalidate`:

<!-- s:d4dd1966dd -->
1. Następne żądanie natychmiast otrzymuje nieaktualną wartość (`STALE`).
2. W tle trwa jedno odświeżanie; współbieżne żądania korzystają z tego samego odświeżania.
3. Jeśli odświeżanie zgłosi wyjątek, nieaktualna wartość jest nadal zwracana, a błąd jest zapisywany w dzienniku.

<!-- s:e6db7819cc -->
Na platformach Vercel i Cloudflare odświeżanie w tle jest rejestrowane za pomocą `waitUntil()`. Wpisy starsze niż rok są zawsze przeliczane na pierwszym planie.

<!-- s:5854b096d2 -->
Rewalidacja na żądanie

<!-- s:686aa7f2f3 -->
| Wywołanie | Unieważnia |
| :-- | :-- |
| `revalidateTag("posts")` | Wszystko z tagiem `posts`; następne żądanie przelicza wynik |
| `revalidateTag("posts", "max")` | Oznacza jako nieaktualne; następne żądanie otrzymuje nieaktualną wartość podczas odświeżania |
| `revalidatePath("/api/feed")` | Tę ścieżkę |
| `revalidatePath("/api/posts/[id]")` | Każdą ścieżkę trasy dynamicznej |
| `revalidatePath("/api", "layout")` | Wszystko pod `/api` |

<!-- s:b132bd50eb -->
Obie funkcje zwracają obietnicę. W przypadku magazynu w pamięci unieważnienie jest natychmiastowe; użyj `await`, gdy [własny magazyn](#custom-cache-stores) jest asynchroniczny.

<!-- s:2aab4b4d00 -->
Własne magazyny pamięci podręcznej

<!-- s:7bee24a364 -->
Domyślny magazyn to LRU w pamięci (1000 wpisów, około 50 MB) dla każdej instancji serwera. Aby współdzielić pamięć podręczną między instancjami, wskaż w `cacheHandler` moduł, którego domyślnym eksportem jest `CacheStore`:

<!-- s:593c57fca5 -->
Wpisy mają postać zwykłego JSON. Alternatywnie `setCacheStore(store)` instaluje magazyn w trakcie działania.

<!-- s:fe2404de51 -->
Uwagi dotyczące platform

<!-- s:5418a08901 -->
- Każda instancja serverless (funkcje Vercel, izolaty Cloudflare) ma własną pamięć podręczną w pamięci operacyjnej. `Cache-Control: s-maxage` pozwala także sieci CDN platformy buforować odpowiedzi; rewalidacja na żądanie nie czyści sieci CDN. Użyj współdzielonego `cacheHandler`, gdy `revalidateTag` musi dotrzeć do każdej instancji.
- Cloudflare wymaga flagi `nodejs_compat` (pamięć podręczna korzysta z `AsyncLocalStorage`). Zobacz [Wdrażanie](/docs/deploying).
