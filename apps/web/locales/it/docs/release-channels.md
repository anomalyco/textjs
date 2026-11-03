<!-- s:b808ed6cd6 -->
Text.js è distribuito su tre dist-tag npm. Tutti i pacchetti (`@textjs/app`, `@textjs/react`, `@textjs/core`, `@textjs/font`, `@textjs/opencode`, `create-text-app` ed `eslint-plugin-textjs`) hanno versioni sincronizzate, quindi un solo numero di versione descrive l’intero framework.

<!-- s:a2c3664770 -->
Canali

<!-- s:6b5c5ba172 -->
| Canale | dist-tag | Versione | Installazione |
| :-- | :-- | :-- | :-- |
| Stabile | `latest` | `1.0.x` | `bun add @textjs/app` |
| Canary | `canary` | `1.0.x-canary.N` | `bun add @textjs/app@canary` |
| LTS | `lts`, `v1-lts` | Pubblicata all’uscita di `2.0.0` | `bun add @textjs/app@lts` |

<!-- s:27e8b81dc6 -->
Usa il canale stabile in produzione. Usa il canale canary per provare correzioni e funzionalità il giorno in cui arrivano su `dev`. Quando sarà disponibile una linea LTS, usala se aggiorni una volta all’anno.

<!-- s:abc686bd76 -->
Stabile

<!-- s:df32c144c0 -->
Le release stabili seguono il [versionamento semantico](https://semver.org): le patch correggono bug, le versioni minori aggiungono funzionalità retrocompatibili, le versioni maggiori possono introdurre incompatibilità nelle API dopo un periodo di deprecazione. Una release stabile deriva dalla promozione di una canary che ha superato l’intera suite di test ed è pubblicata con attestazione di provenienza npm.

<!-- s:7307c50761 -->
Canary

<!-- s:db409040ca -->
Ogni push su `dev` nel repository ufficiale è sottoposto al controllo dei tipi, testato e pubblicato come patch successiva con un suffisso `-canary.N`:

<!-- s:d8b8cffefe -->
| `latest` | Push su `dev` | Versione pubblicata |
| :-- | :-- | :-- |
| `1.0.0` | primo | `1.0.1-canary.0` |
| `1.0.0` | secondo | `1.0.1-canary.1` |
| `1.0.1` | successivo | `1.0.2-canary.0` |

<!-- s:dd9c67b1f5 -->
`N` prosegue dal valore canary più alto già presente su npm, quindi i numeri non si ripetono mai. Le versioni canary non sono registrate nei commit del repository. Aggiungi `[skip canary]` al messaggio di un commit per saltare una release.

<!-- s:762894d754 -->
Le canary sono build di `dev`, il branch in cui confluisce ogni pull request. Possono modificare o rimuovere API non ancora rilasciate senza preavviso. Fissa una versione canary esatta se ne dipendi.

<!-- s:6999c4e986 -->
Provenienza

<!-- s:18722b1d6c -->
Le release sono pubblicate da GitHub Actions con `npm publish --provenance`, che collega ogni tarball al commit e al workflow esatti che lo hanno generato. Verifica un pacchetto con:

<!-- s:57d2e7b18d -->
Preparare una release

<!-- s:a3217d58a6 -->
I manutentori incrementano in modo sincronizzato la versione di tutti i pacchetti del workspace tramite gli script di release:

<!-- s:614a1ea872 -->
`release:version` riscrive ogni `package.json` e le costanti di versione che lo rispecchiano (`VERSION`, `rendererVersion` del reconciler), rifiuta l’esecuzione quando le versioni dei pacchetti non sono allineate e con `--dry-run` stampa il piano. `release:publish` compila, crea i pacchetti (risolvendo `workspace:*`), applica `publishConfig`, rifiuta di pubblicare una prerelease su `latest` o una versione stabile su `canary` e salta le versioni già presenti su npm.

<!-- s:ec6955472a -->
Consulta la [politica di supporto](/docs/support-policy) per sapere per quanto tempo viene mantenuta ogni linea di release.
