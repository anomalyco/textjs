<!-- s:b808ed6cd6 -->
Text.js erscheint unter drei npm-Dist-Tags. Alle Pakete (`@textjs/app`, `@textjs/react`, `@textjs/core`, `@textjs/font`, `@textjs/opencode`, `create-text-app` und `eslint-plugin-textjs`) werden im Gleichschritt versioniert, sodass eine Versionsnummer das gesamte Framework beschreibt.

<!-- s:a2c3664770 -->
Kanäle

<!-- s:6b5c5ba172 -->
| Kanal | dist-tag | Version | Installation |
| :-- | :-- | :-- | :-- |
| Stable | `latest` | `1.0.x` | `bun add @textjs/app` |
| Canary | `canary` | `1.0.x-canary.N` | `bun add @textjs/app@canary` |
| LTS | `lts`, `v1-lts` | Erscheint, sobald `2.0.0` veröffentlicht wird | `bun add @textjs/app@lts` |

<!-- s:27e8b81dc6 -->
Verwende Stable in der Produktion. Verwende Canary, um Fehlerbehebungen und Funktionen an dem Tag auszuprobieren, an dem sie in `dev` landen. Sobald es eine LTS-Linie gibt, verwende sie, wenn du einmal im Jahr aktualisierst.

<!-- s:abc686bd76 -->
Stable

<!-- s:df32c144c0 -->
Stable-Releases folgen der [semantischen Versionierung](https://semver.org): Patch-Versionen beheben Fehler, Minor-Versionen ergänzen abwärtskompatible Funktionen, Major-Versionen können nach einer Abkündigungsfrist API-Inkompatibilitäten einführen. Ein Stable-Release entsteht aus einer Canary-Version, die die vollständige Testsuite bestanden hat, und wird mit npm-Herkunftsnachweis veröffentlicht.

<!-- s:7307c50761 -->
Canary

<!-- s:db409040ca -->
Jeder Push auf `dev` im offiziellen Repository durchläuft eine Typprüfung und Tests und wird als nächste Patch-Version mit dem Suffix `-canary.N` veröffentlicht:

<!-- s:d8b8cffefe -->
| `latest` | Push auf `dev` | Veröffentlicht |
| :-- | :-- | :-- |
| `1.0.0` | erster | `1.0.1-canary.0` |
| `1.0.0` | zweiter | `1.0.1-canary.1` |
| `1.0.1` | nächster | `1.0.2-canary.0` |

<!-- s:dd9c67b1f5 -->
`N` zählt ab der höchsten bereits auf npm vorhandenen Canary-Version weiter, sodass sich Nummern nie wiederholen. Canary-Versionen werden nicht ins Repository committet. Füge `[skip canary]` zu einer Commit-Nachricht hinzu, um ein Release zu überspringen.

<!-- s:762894d754 -->
Canaries sind Builds von `dev`, dem Branch, in den jeder Pull-Request gemergt wird. Sie können unveröffentlichte APIs ohne Ankündigung ändern oder entfernen. Lege eine exakte Canary-Version fest, wenn du von einer abhängst.

<!-- s:6999c4e986 -->
Herkunftsnachweis

<!-- s:18722b1d6c -->
Releases werden aus GitHub Actions mit `npm publish --provenance` veröffentlicht, wodurch jeder Tarball mit genau dem Commit und Workflow verknüpft wird, aus denen er erstellt wurde. Prüfe ein Paket mit:

<!-- s:57d2e7b18d -->
Ein Release erstellen

<!-- s:a3217d58a6 -->
Maintainer erhöhen die Versionen aller Workspace-Pakete im Gleichschritt mit den Release-Skripten:

<!-- s:614a1ea872 -->
`release:version` schreibt jede `package.json` und die zugehörigen Versionskonstanten (`VERSION`, `rendererVersion` des Reconcilers) neu, verweigert die Ausführung bei abweichenden Paketversionen und gibt mit `--dry-run` den Plan aus. `release:publish` baut und packt die Pakete (und löst dabei `workspace:*` auf), wendet `publishConfig` an, verweigert die Veröffentlichung einer Vorabversion unter `latest` oder einer stabilen Version unter `canary` und überspringt Versionen, die bereits auf npm existieren.

<!-- s:ec6955472a -->
In der [Support-Richtlinie](/docs/support-policy) erfährst du, wie lange jede Release-Linie gepflegt wird.
