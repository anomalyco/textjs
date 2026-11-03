<!-- s:5b67b32177 -->
Speichere Antworten von Route-Handlern und Daten im Cache und revalidiere sie dann zeitgesteuert oder bei Bedarf. Veraltete Einträge werden sofort ausgeliefert, während eine Aktualisierung im Hintergrund läuft.

<!-- s:be697310c8 -->
Route-Handler

<!-- s:e85fc29fe2 -->
`GET`-Route-Handler sind standardmäßig dynamisch. Aktiviere Caching über die Konfiguration des Route-Segments:

<!-- s:e4ccf65c67 -->
| Export | Verhalten |
| :-- | :-- |
| *(keiner)* | Ausführung bei jeder Anfrage |
| `dynamic = "force-static"` | Bis zur Revalidierung im Cache gespeichert |
| `revalidate = N` | Im Cache gespeichert; nach `N` Sekunden veraltet |
| `revalidate = 0` oder `dynamic = "force-dynamic"` | Ausführung bei jeder Anfrage |

<!-- s:274c053db6 -->
Andere `dynamic`-Werte führen zum Fehler `TX031`. Dazu gehört auch `"error"` aus Next.js, da Text.js nicht erkennen kann, wann ein Handler die Anfrage liest.

<!-- s:0fae4045f6 -->
Gecachte Handler erhalten einen Eintrag pro Pfadnamen, und ihr `request` sieht so aus wie zur Build-Zeit: ohne Abfragezeichenfolge, Header, Cookies oder Body. Lies diese stattdessen in einem dynamischen Handler. Nur `GET` und `HEAD` werden gecacht. Antworten mit einem `5xx`-Status, einem `Set-Cookie`-Header oder `Cache-Control: private` / `no-store` werden zurückgegeben, aber nie gespeichert.

<!-- s:b618d4732f -->
Header

<!-- s:c0a6cf7351 -->
Gecachte Antworten enthalten:

<!-- s:b5f8cfecb4 -->
| Header | Wert |
| :-- | :-- |
| `x-textjs-cache` | `MISS`, `HIT` oder `STALE` |
| `Cache-Control` | `s-maxage=N, stale-while-revalidate=<1 year − N>` oder `s-maxage=31536000` für `force-static` |

<!-- s:c1fb73c64a -->
Wenn [Middleware](/docs/middleware) Cookies setzt, Rewrites ausführt oder Anfrage-Header überschreibt, lautet der generierte Header `private, no-cache, no-store, max-age=0, must-revalidate`, damit gemeinsam genutzte Caches nie eine besucherspezifische Entscheidung erneut ausliefern. Ein vom Handler gesetzter `Cache-Control`-Header bleibt erhalten.

<!-- s:ae27ba22c7 -->
In `text dev` gilt die Segmentkonfiguration, aber es wird nichts gespeichert, sodass jede Anfrage den Handler ausführt.

<!-- s:64841df645 -->
Daten-Cache

<!-- s:2187e2262b -->
Cache beliebige asynchrone Funktionen mit `unstable_cache` aus `@textjs/app/cache`:

<!-- s:4c26e099ff -->
Der Schlüssel besteht aus den Schlüsselteilen und den Argumenten, nach Wert kodiert (`undefined` und `null` sowie `Map`-, `Set`-, `Date`- und `URL`-Argumente bleiben unterscheidbar). Ohne Schlüsselteile identifizieren der Quelltext der Funktion und ihr Erstellungsort die Funktion; übergib Schlüsselteile, wenn die Funktion Werte aus ihrem umgebenden Gültigkeitsbereich erfasst, etwa wenn sie pro Anfrage oder in einer Schleife erstellt wird. Ergebnisse werden als JSON serialisiert, sodass jeder Aufruf eine neue Kopie zurückgibt (und `Date`-Objekte als Zeichenfolgen zurückkommen); ein nicht serialisierbares Ergebnis löst einen Fehler aus. `cache(fn, { key, tags, revalidate })` akzeptiert dieselben Einstellungen als Optionsobjekt.

<!-- s:608eee0e9b -->
Innerhalb eines gecachten Route-Handlers geben Dateneinträge ihre Tags und ihren kürzesten `revalidate`-Wert an die Route weiter: Eine Revalidierung von `"posts"` aktualisiert auch `/api/posts`. Ein Datenaufruf mit `revalidate: 0` macht die Route dynamisch.

<!-- s:5537f337ee -->
Stale-while-revalidate

<!-- s:7d23e84252 -->
Sobald ein Eintrag älter als `revalidate` ist:

<!-- s:d4dd1966dd -->
1. Die nächste Anfrage erhält sofort den veralteten Wert (`STALE`).
2. Eine Aktualisierung läuft im Hintergrund; gleichzeitige Anfragen teilen sie sich.
3. Schlägt die Aktualisierung fehl, wird der veraltete Wert weiter ausgeliefert und der Fehler protokolliert.

<!-- s:e6db7819cc -->
Auf Vercel und Cloudflare werden Hintergrundaktualisierungen mit `waitUntil()` registriert. Einträge, die älter als ein Jahr sind, werden immer im Vordergrund neu berechnet.

<!-- s:5854b096d2 -->
Revalidierung bei Bedarf

<!-- s:686aa7f2f3 -->
| Aufruf | Invalidierung |
| :-- | :-- |
| `revalidateTag("posts")` | Alles mit dem Tag `posts`; Neuberechnung bei der nächsten Anfrage |
| `revalidateTag("posts", "max")` | Markierung als veraltet; Auslieferung des veralteten Werts bei der nächsten Anfrage während der Aktualisierung |
| `revalidatePath("/api/feed")` | Dieser Pfad |
| `revalidatePath("/api/posts/[id]")` | Jeder Pfad einer dynamischen Route |
| `revalidatePath("/api", "layout")` | Alles unter `/api` |

<!-- s:b132bd50eb -->
Beide geben ein Promise zurück. Beim In-Memory-Store erfolgt die Invalidierung sofort; warte mit `await` darauf, wenn ein [benutzerdefinierter Store](#custom-cache-stores) asynchron arbeitet.

<!-- s:2aab4b4d00 -->
Benutzerdefinierte Cache-Stores

<!-- s:7bee24a364 -->
Der Standard-Store ist ein In-Memory-LRU pro Serverinstanz (1000 Einträge, etwa 50 MB). Um einen Cache über mehrere Instanzen hinweg zu nutzen, verweise mit `cacheHandler` auf ein Modul, das einen `CacheStore` als Standardexport bereitstellt:

<!-- s:593c57fca5 -->
Einträge bestehen aus reinem JSON. `setCacheStore(store)` richtet stattdessen einen Store zur Laufzeit ein.

<!-- s:fe2404de51 -->
Plattformhinweise

<!-- s:5418a08901 -->
- Jede Serverless-Instanz (Vercel Functions, Cloudflare Isolates) hat ihren eigenen In-Memory-Cache. Mit `Cache-Control: s-maxage` kann auch das CDN der Plattform Antworten cachen; eine Revalidierung bei Bedarf leert kein CDN. Verwende einen gemeinsam genutzten `cacheHandler`, wenn `revalidateTag` jede Instanz erreichen muss.
- Cloudflare benötigt das Flag `nodejs_compat` (der Cache verwendet `AsyncLocalStorage`). Siehe [Deployen](/docs/deploying).
