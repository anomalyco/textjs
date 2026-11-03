<!-- s:d2d5ef69d7 -->
Ta strona opisuje, jak długo każda linia wydań Text.js otrzymuje poprawki i co uznajemy za zmianę niezgodną wstecz.

<!-- s:80371443b7 -->
Linie wydań

<!-- s:19aa9fdfd3 -->
| Status | Zakres aktualizacji | Okres |
| :-- | :-- | :-- |
| Aktywna | Funkcje, poprawki, łatki bezpieczeństwa | Do następnego wydania głównego |
| Utrzymaniowa LTS | Krytyczne poprawki i łatki bezpieczeństwa | 12 miesięcy od publikacji następnego wydania głównego |
| Koniec wsparcia | Brak | — |

<!-- s:d5987f6ecf -->
Poprawki otrzymuje tylko najnowsze wydanie poboczne danej wersji głównej: po publikacji `1.5.0` poprawki trafiają do `1.5.x`, a nie do `1.4.x`. Po publikacji `2.0.0` ostatnie wydanie poboczne `1.x` staje się utrzymaniową linią LTS i jest publikowane pod tagami dystrybucji `lts` i `v1-lts`.

<!-- s:6a7ba75ff1 -->
| Wersja | Status | Koniec wsparcia |
| :-- | :-- | :-- |
| 1.x | Aktywna | 12 miesięcy po wydaniu 2.0.0 |

<!-- s:d71377bf9c -->
Zakres poprawek w LTS

<!-- s:043b92b499 -->
- Luki bezpieczeństwa w pakietach Text.js
- Awarie, utrata danych i błędy budowania bez dostępnego obejścia
- Zgodność z nowymi wydaniami przeglądarek Chrome, Edge, Firefox i Safari, które psują renderowanie w konsoli
- Zgodność z obsługiwanymi środowiskami uruchomieniowymi i docelowymi środowiskami wdrożenia

<!-- s:e01d1121d2 -->
Nowe funkcje, usprawnienia wydajności i refaktoryzacje trafiają wyłącznie do aktywnej linii.

<!-- s:d1c69ba9bc -->
Zmiany niezgodne wstecz

<!-- s:82596fcd52 -->
Poniższe elementy zmieniają się tylko w wydaniu głównym, po ostrzeżeniu o wycofaniu w co najmniej jednym wydaniu pobocznym:

<!-- s:4ca9fd7807 -->
- Publiczne eksporty `@textjs/app`, `@textjs/react` i `@textjs/core`, w tym `@textjs/app/server` i `@textjs/app/cache`
- Opcje `text.config.ts`, polecenia i flagi CLI `text`
- Konwencje plików w `app/`, `middleware.ts` i konfiguracja segmentów tras
- Układy plików wyjściowych adapterów (`.vercel/output`, `_worker.js`, `dist/server.js`)

<!-- s:3a8ad71311 -->
Poza zakresem: API oznaczone jako eksperymentalne lub `unstable_`, w tym wszystko w `@textjs/core/experimental` i `@textjs/react/experimental` (mogą się zmieniać w wydaniu pobocznym, z adnotacją w historii zmian), elementy wewnętrzne, takie jak `@textjs/core/internal`, nagłówki `x-middleware-*` i metadane budowania w `.text/`, wydania canary oraz dokładna postać ciągów formatujących `console.log` i CSS (klatki pozostają wizualnie identyczne; ich kodowanie może stać się szybsze).

<!-- s:5c7d9aae9b -->
Obsługiwane środowiska uruchomieniowe

<!-- s:30122ce1bb -->
| Środowisko uruchomieniowe | Obsługiwane wersje |
| :-- | :-- |
| DevTools w Chrome / Edge | Bieżące i dwa poprzednie wydania stabilne |
| Konsole w Firefox i Safari | Bieżące wydanie stabilne |
| Node.js | Aktywne i utrzymaniowe wydania LTS (`text start`, funkcje Vercel) |
| Bun | Najnowsze 1.x |
| Cloudflare Workers | `compatibility_date` 2025-01-01 lub późniejsza, `nodejs_compat` |

<!-- s:509c18536b -->
Usunięcie obsługi wersji środowiska uruchomieniowego, której wsparcie już się zakończyło, nie jest zmianą niezgodną wstecz.

<!-- s:52543dba9b -->
Bezpieczeństwo

<!-- s:2aff0514c5 -->
Zgłaszaj luki prywatnie na adres [security@textjs.org](mailto:security@textjs.org) lub przez [zgłoszenia bezpieczeństwa GitHub](https://github.com/anomalyco/textjs/security/advisories/new). Poprawki są publikowane jednocześnie dla każdej wspieranej linii, a komunikat o luce pojawia się, gdy poprawione wersje są już dostępne w npm.

<!-- s:b933131934 -->
Zobacz [Kanały wydań](/docs/release-channels), aby dowiedzieć się, jak powstają wersje i tagi dystrybucji.
