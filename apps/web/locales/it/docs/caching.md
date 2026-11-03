<!-- s:5b67b32177 -->
Memorizza nella cache le risposte dei route handler e i dati, poi rivalidali a intervalli regolari o su richiesta. Le voci scadute vengono servite immediatamente mentre un singolo aggiornamento viene eseguito in background.

<!-- s:be697310c8 -->
Route handler

<!-- s:e85fc29fe2 -->
I route handler `GET` sono dinamici per impostazione predefinita. Abilita la cache tramite la configurazione del segmento di route:

<!-- s:e4ccf65c67 -->
| Export | Comportamento |
| :-- | :-- |
| *(nessuno)* | Esecuzione a ogni richiesta |
| `dynamic = "force-static"` | In cache fino alla rivalidazione |
| `revalidate = N` | In cache; scaduto dopo `N` secondi |
| `revalidate = 0` o `dynamic = "force-dynamic"` | Esecuzione a ogni richiesta |

<!-- s:274c053db6 -->
Gli altri valori di `dynamic` generano l’errore `TX031`. Tra questi c’è `"error"` di Next.js, perché Text.js non può rilevare quando un handler legge la richiesta.

<!-- s:0fae4045f6 -->
Gli handler con cache hanno una voce per pathname e la loro `request` appare come al momento della build: senza query string, header, cookie o corpo. Leggi questi dati in un handler dinamico. Solo `GET` e `HEAD` vengono memorizzati nella cache. Le risposte con stato `5xx`, un header `Set-Cookie` o `Cache-Control: private` / `no-store` vengono restituite ma mai memorizzate.

<!-- s:b618d4732f -->
Header

<!-- s:c0a6cf7351 -->
Le risposte in cache includono:

<!-- s:b5f8cfecb4 -->
| Header | Valore |
| :-- | :-- |
| `x-textjs-cache` | `MISS`, `HIT` o `STALE` |
| `Cache-Control` | `s-maxage=N, stale-while-revalidate=<1 year − N>`, oppure `s-maxage=31536000` per `force-static` |

<!-- s:c1fb73c64a -->
Quando un [middleware](/docs/middleware) imposta cookie, riscrive la richiesta o ne sovrascrive gli header, l’header generato diventa `private, no-cache, no-store, max-age=0, must-revalidate`, così le cache condivise non riutilizzano mai una decisione specifica per un visitatore. Un header `Cache-Control` impostato dall’handler viene mantenuto.

<!-- s:ae27ba22c7 -->
In `text dev`, la configurazione del segmento si applica ma nulla viene memorizzato, quindi ogni richiesta esegue l’handler.

<!-- s:64841df645 -->
Cache dei dati

<!-- s:2187e2262b -->
Memorizza nella cache qualsiasi funzione asincrona con `unstable_cache` da `@textjs/app/cache`:

<!-- s:4c26e099ff -->
La chiave è composta dalle parti della chiave e dagli argomenti, codificati per valore (gli argomenti `undefined` e `null`, `Map`, `Set`, `Date` e `URL` restano distinti). Senza parti della chiave, la funzione è identificata dal suo codice sorgente e dal punto in cui è stata creata; passa le parti della chiave ogni volta che la funzione cattura valori esterni, per esempio quando viene creata per ogni richiesta o in un ciclo. I risultati vengono serializzati in JSON, quindi ogni chiamata restituisce una nuova copia (e gli oggetti `Date` vengono restituiti come stringhe); un risultato non serializzabile genera un’eccezione. `cache(fn, { key, tags, revalidate })` accetta le stesse impostazioni sotto forma di oggetto di opzioni.

<!-- s:608eee0e9b -->
All’interno di un route handler con cache, le voci dei dati propagano i propri tag e il valore di `revalidate` più breve alla route: rivalidare `"posts"` aggiorna anche `/api/posts`. Una chiamata ai dati con `revalidate: 0` rende dinamica la route.

<!-- s:5537f337ee -->
Stale-while-revalidate

<!-- s:7d23e84252 -->
Quando l’età di una voce supera `revalidate`:

<!-- s:d4dd1966dd -->
1. La richiesta successiva riceve immediatamente il valore scaduto (`STALE`).
2. Un singolo aggiornamento viene eseguito in background; le richieste simultanee lo condividono.
3. Se l’aggiornamento genera un’eccezione, il valore scaduto continua a essere servito e l’errore viene registrato nel log.

<!-- s:e6db7819cc -->
Su Vercel e Cloudflare, gli aggiornamenti in background vengono registrati con `waitUntil()`. Le voci più vecchie di un anno vengono sempre ricalcolate in primo piano.

<!-- s:5854b096d2 -->
Rivalidazione su richiesta

<!-- s:686aa7f2f3 -->
| Chiamata | Invalidazione |
| :-- | :-- |
| `revalidateTag("posts")` | Tutto ciò che ha il tag `posts`; ricalcolo alla richiesta successiva |
| `revalidateTag("posts", "max")` | Contrassegno come scaduto; la richiesta successiva riceve il valore scaduto durante l’aggiornamento |
| `revalidatePath("/api/feed")` | Quel percorso |
| `revalidatePath("/api/posts/[id]")` | Ogni percorso di una route dinamica |
| `revalidatePath("/api", "layout")` | Tutto ciò che si trova sotto `/api` |

<!-- s:b132bd50eb -->
Entrambe restituiscono una promise. Con l’archivio in memoria l’invalidazione è immediata; attendila con `await` quando un [archivio personalizzato](#custom-cache-stores) è asincrono.

<!-- s:2aab4b4d00 -->
Archivi cache personalizzati

<!-- s:7bee24a364 -->
L’archivio predefinito è una cache LRU in memoria (1000 voci, circa 50 MB) per istanza del server. Per condividere una cache tra più istanze, fai puntare `cacheHandler` a un modulo che esporta un `CacheStore` come export predefinito:

<!-- s:593c57fca5 -->
Le voci sono in JSON puro. `setCacheStore(store)` installa invece un archivio a runtime.

<!-- s:fe2404de51 -->
Note sulle piattaforme

<!-- s:5418a08901 -->
- Ogni istanza serverless (funzioni Vercel, isolate Cloudflare) ha la propria cache in memoria. `Cache-Control: s-maxage` consente anche alla CDN della piattaforma di memorizzare le risposte nella cache; la rivalidazione su richiesta non svuota una CDN. Usa un `cacheHandler` condiviso quando `revalidateTag` deve raggiungere ogni istanza.
- Cloudflare richiede il flag `nodejs_compat` (la cache usa `AsyncLocalStorage`). Consulta [Deploy](/docs/deploying).
