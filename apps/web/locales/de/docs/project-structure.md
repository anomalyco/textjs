<!-- s:5c16c8b17b -->
Ordner in `app/` definieren Routen, und spezielle Dateien definieren die UI für jede Route.

<!-- s:11f7d9178c -->
Ordner

<!-- s:8bda4d61c2 -->
| Ordner | Zweck |
| :-- | :-- |
| `app` | Routen, Layouts und Route-Handler |
| `lib` | Gemeinsam genutzte Module ohne Routing |
| `public` | Statische Ressourcen |

<!-- s:25756fa68d -->
Routing-Dateien

<!-- s:8d1e739d99 -->
| Datei | Zweck |
| :-- | :-- |
| `layout.tsx` | Gemeinsame UI für ein Segment |
| `page.tsx` | Über eine Route erreichbare Ansicht |
| `loading.tsx` | Fallback für Suspense |
| `error.tsx` | Error Boundary |
| `not-found.tsx` | URLs ohne passende Route |
| `route.ts` | API-Endpunkt |

<!-- s:ed4806a616 -->
Dynamische Routen

<!-- s:7f3bfd19e0 -->
| Ordner | URL | `params` |
| :-- | :-- | :-- |
| `[id]` | `/sessions/42` | `{ id: "42" }` |
| `[...slug]` | `/docs/a/b` | `{ slug: ["a", "b"] }` |

<!-- s:854c967567 -->
text.config.ts

<!-- s:144c0672ce -->
| Option | Standardwert | Beschreibung |
| :-- | :-- | :-- |
| `title` | `""` | Titel der Seite und des FocusPad |
| `viewport` | an Konsole anpassen, sonst `120×36` | `responsive` (Standardwert `true`), Fallback `width × height`, `theme` |
| `hints` | `[]` | Zwei oder drei Tasten, die auf dem FocusPad der Seite angezeigt werden |
| `action` | `press <first hint>` | Aktion nach dem Fokussieren, z. B. `"type a prompt"` |
| `devIndicators` | `true` | Dev-Overlay in der Konsole (`[▼]`) |
| `focusHint` | `true` | „Klicke auf die Seite, um die Tastatur zu verwenden“ über der letzten Zeile der Konsole, solange die Seite keinen Fokus hat |
| `rewrites` | `[]` | Rewrites und Proxys |
| `ansi` | `{ cols: 80, rows: 24 }` | Frame-Größe für [curl und Terminal-Clients](/docs/curl), oder `false`, um ihnen HTML auszuliefern |

<!-- s:04e1df190e -->
CLI

<!-- s:86e6dffb86 -->
| Befehl | Beschreibung |
| :-- | :-- |
| `text dev` | Entwicklungsserver mit Fast Refresh |
| `text build` | Produktionsbuild |
| `text start` | Build und Route-Handler bereitstellen |
| `text run` | Die App in einem Terminal rendern ([Terminal](/docs/terminal)) |
| `text mcp` | Die App für Coding-Agenten bereitstellen ([MCP](/docs/mcp)) |
