<!-- s:d2d5ef69d7 -->
Questa pagina descrive per quanto tempo ogni linea di rilascio di Text.js riceve correzioni e quali modifiche sono considerate incompatibili.

<!-- s:80371443b7 -->
Linee di rilascio

<!-- s:19aa9fdfd3 -->
| Stato | Riceve | Durata |
| :-- | :-- | :-- |
| Attiva | Funzionalità, correzioni, patch di sicurezza | Fino alla prossima versione major |
| LTS di manutenzione | Correzioni critiche e patch di sicurezza | 12 mesi dopo il rilascio della prossima versione major |
| Fine del ciclo di vita | Nulla | — |

<!-- s:d5987f6ecf -->
Solo l’ultima versione minor di una major riceve patch: quando esce `1.5.0`, le correzioni arrivano in `1.5.x`, non in `1.4.x`. Quando esce `2.0.0`, l’ultima minor della serie `1.x` diventa la linea LTS di manutenzione e viene pubblicata con i dist-tag `lts` e `v1-lts`.

<!-- s:6a7ba75ff1 -->
| Versione | Stato | Supportata fino a |
| :-- | :-- | :-- |
| 1.x | Attiva | 12 mesi dopo 2.0.0 |

<!-- s:d71377bf9c -->
Correzioni sulle linee LTS

<!-- s:043b92b499 -->
- Vulnerabilità di sicurezza nei pacchetti Text.js
- Arresti anomali, perdita di dati ed errori di build senza una soluzione alternativa
- Compatibilità con le nuove versioni di Chrome, Edge, Firefox e Safari che compromettono il rendering nella console
- Compatibilità con i runtime e le destinazioni di deploy supportati

<!-- s:e01d1121d2 -->
Le nuove funzionalità, gli interventi sulle prestazioni e il refactoring arrivano solo sulla linea attiva.

<!-- s:d1c69ba9bc -->
Modifiche incompatibili

<!-- s:82596fcd52 -->
Questi elementi cambiano solo in una versione major, dopo un avviso di deprecazione in almeno una versione minor:

<!-- s:4ca9fd7807 -->
- Esportazioni pubbliche di `@textjs/app`, `@textjs/react` e `@textjs/core`, inclusi `@textjs/app/server` e `@textjs/app/cache`
- Opzioni di `text.config.ts`, comandi e flag della CLI `text`
- Convenzioni dei file in `app/`, `middleware.ts` e configurazione dei segmenti di route
- Layout di output degli adattatori (`.vercel/output`, `_worker.js`, `dist/server.js`)

<!-- s:3a8ad71311 -->
Sono esclusi: le API contrassegnate come sperimentali o `unstable_`, incluso tutto ciò che si trova in `@textjs/core/experimental` e `@textjs/react/experimental` (possono cambiare in una versione minor, con note nel changelog), gli elementi interni come `@textjs/core/internal`, gli header `x-middleware-*` e i metadati di build in `.text/`, le versioni canary e le stringhe di formato e il CSS esatti di `console.log` (i frame restano visivamente identici; la loro codifica può diventare più veloce).

<!-- s:5c7d9aae9b -->
Supporto dei runtime

<!-- s:30122ce1bb -->
| Runtime | Versioni supportate |
| :-- | :-- |
| DevTools di Chrome / Edge | Versione stabile attuale e le due precedenti |
| Console di Firefox e Safari | Versione stabile attuale |
| Node.js | Versioni LTS attive e di manutenzione (`text start`, funzioni Vercel) |
| Bun | Ultima 1.x |
| Cloudflare Workers | `compatibility_date` 2025-01-01 o successiva, `nodejs_compat` |

<!-- s:509c18536b -->
La rimozione del supporto per una versione di un runtime che ha raggiunto la fine del proprio ciclo di vita non è una modifica incompatibile.

<!-- s:52543dba9b -->
Sicurezza

<!-- s:2aff0514c5 -->
Segnala le vulnerabilità in privato a [security@textjs.org](mailto:security@textjs.org) o tramite gli [avvisi di sicurezza di GitHub](https://github.com/anomalyco/textjs/security/advisories/new). Le correzioni vengono rilasciate contemporaneamente per ogni linea supportata e l’avviso viene pubblicato quando le versioni corrette sono su npm.

<!-- s:b933131934 -->
Consulta [Canali di rilascio](/docs/release-channels) per sapere come vengono prodotti le versioni e i dist-tag.
