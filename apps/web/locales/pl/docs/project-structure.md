<!-- s:5c16c8b17b -->
Foldery w `app/` definiują trasy, a pliki specjalne definiują interfejs każdej trasy.

<!-- s:11f7d9178c -->
Foldery

<!-- s:8bda4d61c2 -->
| Folder | Przeznaczenie |
| :-- | :-- |
| `app` | Trasy, layouty i handlery tras |
| `lib` | Współdzielone moduły bez tras |
| `public` | Zasoby statyczne |

<!-- s:25756fa68d -->
Pliki routingu

<!-- s:8d1e739d99 -->
| Plik | Przeznaczenie |
| :-- | :-- |
| `layout.tsx` | Wspólny interfejs segmentu |
| `page.tsx` | Ekran dostępny pod trasą |
| `loading.tsx` | Interfejs zastępczy Suspense |
| `error.tsx` | Granica błędów |
| `not-found.tsx` | Niedopasowane adresy URL |
| `route.ts` | Punkt końcowy API |

<!-- s:ed4806a616 -->
Trasy dynamiczne

<!-- s:7f3bfd19e0 -->
| Folder | URL | `params` |
| :-- | :-- | :-- |
| `[id]` | `/sessions/42` | `{ id: "42" }` |
| `[...slug]` | `/docs/a/b` | `{ slug: ["a", "b"] }` |

<!-- s:854c967567 -->
text.config.ts

<!-- s:144c0672ce -->
| Opcja | Wartość domyślna | Opis |
| :-- | :-- | :-- |
| `title` | `""` | Tytuł strony i komponentu FocusPad |
| `viewport` | dopasowanie do konsoli, w przeciwnym razie `120×36` | `responsive` (domyślnie `true`), rozmiar zastępczy `width × height`, `theme` |
| `hints` | `[]` | Dwa lub trzy klawisze wyświetlane w komponencie FocusPad na stronie |
| `action` | `press <first hint>` | Czynność po uzyskaniu fokusu, np. `"type a prompt"` |
| `devIndicators` | `true` | Nakładka deweloperska w konsoli (`[▼]`) |
| `focusHint` | `true` | „Kliknij stronę, aby używać klawiatury” nad ostatnim wierszem konsoli, gdy strona nie ma fokusu |
| `rewrites` | `[]` | Reguły przepisywania i proxy |
| `ansi` | `{ cols: 80, rows: 24 }` | Rozmiar klatki dla [curl i klientów terminalowych](/docs/curl) lub `false`, aby serwować im HTML |

<!-- s:04e1df190e -->
CLI

<!-- s:86e6dffb86 -->
| Polecenie | Opis |
| :-- | :-- |
| `text dev` | Serwer deweloperski z Fast Refresh |
| `text build` | Kompilacja produkcyjna |
| `text start` | Serwowanie skompilowanej aplikacji i handlerów tras |
| `text run` | Renderowanie aplikacji w terminalu ([Terminal](/docs/terminal)) |
| `text mcp` | Udostępnianie aplikacji agentom programistycznym ([MCP](/docs/mcp)) |
