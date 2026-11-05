<!-- s:d2d5ef69d7 -->
Diese Seite beschreibt, wie lange jede Text.js-Versionslinie Fehlerbehebungen erhält und was als inkompatible Änderung gilt.

<!-- s:80371443b7 -->
Versionslinien

<!-- s:19aa9fdfd3 -->
| Status | Erhält | Dauer |
| :-- | :-- | :-- |
| Aktiv | Funktionen, Fehlerbehebungen, Sicherheitspatches | Bis zur nächsten Hauptversion |
| Wartungs-LTS | Kritische Fehlerbehebungen und Sicherheitspatches | 12 Monate nach Veröffentlichung der nächsten Hauptversion |
| Supportende | Nichts | — |

<!-- s:d5987f6ecf -->
Nur die neueste Nebenversion einer Hauptversion erhält Patches: Sobald `1.5.0` erscheint, fließen Fehlerbehebungen in `1.5.x`, nicht in `1.4.x`. Sobald `2.0.0` erscheint, wird die letzte `1.x`-Nebenversion zur Wartungs-LTS-Linie und unter den Dist-Tags `lts` und `v1-lts` veröffentlicht.

<!-- s:6a7ba75ff1 -->
| Version | Status | Unterstützt bis |
| :-- | :-- | :-- |
| 1.x | Aktiv | 12 Monate nach 2.0.0 |

<!-- s:d71377bf9c -->
Fehlerbehebungen für LTS

<!-- s:043b92b499 -->
- Sicherheitslücken in Text.js-Paketen
- Abstürze, Datenverlust und Build-Fehler ohne Umgehungslösung
- Kompatibilität mit neuen Versionen von Chrome, Edge, Firefox und Safari, die das Konsole-Rendering beeinträchtigen
- Kompatibilität mit unterstützten Laufzeitumgebungen und Deployment-Zielen

<!-- s:e01d1121d2 -->
Neue Funktionen, Leistungsoptimierungen und Refactorings fließen nur in die aktive Versionslinie ein.

<!-- s:d1c69ba9bc -->
Inkompatible Änderungen

<!-- s:82596fcd52 -->
Folgendes ändert sich nur in einer Hauptversion, nach einer Abkündigungswarnung in mindestens einer Nebenversion:

<!-- s:4ca9fd7807 -->
- Öffentliche Exporte von `@textjs/app`, `@textjs/react` und `@textjs/core`, einschließlich `@textjs/app/server` und `@textjs/app/cache`
- Optionen in `text.config.ts`, CLI-Befehle und Flags von `text`
- Dateikonventionen in `app/`, `middleware.ts` und die Konfiguration von Route-Segmenten
- Ausgabe-Layouts der Adapter (`.vercel/output`, `_worker.js`, `dist/server.js`)

<!-- s:883f3eeb26 -->
Nicht abgedeckt: als experimentell oder mit `unstable_` markierte APIs, einschließlich allem unter `@textjs/core/experimental`, `@textjs/react/experimental` und `@textjs/app/experimental` (sie können sich in einem Minor-Release ändern, mit Hinweisen im Changelog), Interna wie `@textjs/core/internal`, `x-middleware-*`-Header und `.text/`-Build-Metadaten, Canary-Releases sowie die exakten `console.log`-Formatstrings und das CSS (Frames bleiben visuell identisch; ihre Kodierung kann schneller werden).

<!-- s:5c7d9aae9b -->
Unterstützte Laufzeitumgebungen

<!-- s:30122ce1bb -->
| Laufzeitumgebung | Unterstützt |
| :-- | :-- |
| Chrome / Edge DevTools | Aktuelle und die beiden vorherigen stabilen Versionen |
| Konsole von Firefox und Safari | Aktuelle stabile Version |
| Node.js | Aktive und Wartungs-LTS-Versionen (`text start`, Vercel-Funktionen) |
| Bun | Neueste 1.x-Version |
| Cloudflare Workers | `compatibility_date` 2025-01-01 oder später, `nodejs_compat` |

<!-- s:509c18536b -->
Die Unterstützung für eine Laufzeitversion einzustellen, die ihr eigenes Supportende erreicht hat, gilt nicht als inkompatible Änderung.

<!-- s:52543dba9b -->
Sicherheit

<!-- s:2aff0514c5 -->
Melde Sicherheitslücken vertraulich an [security@textjs.org](mailto:security@textjs.org) oder über [GitHub-Sicherheitshinweise](https://github.com/anomalyco/textjs/security/advisories/new). Fehlerbehebungen erscheinen gleichzeitig für alle unterstützten Versionslinien, und der Sicherheitshinweis wird veröffentlicht, sobald gepatchte Versionen auf npm verfügbar sind.

<!-- s:b933131934 -->
Unter [Veröffentlichungskanäle](/docs/release-channels) erfährst du, wie Versionen und Dist-Tags entstehen.
