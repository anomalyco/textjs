<!-- s:5c16c8b17b -->
Le cartelle in `app/` definiscono le route e i file speciali definiscono l’interfaccia di ogni route.

<!-- s:11f7d9178c -->
Cartelle

<!-- s:8bda4d61c2 -->
| Cartella | Scopo |
| :-- | :-- |
| `app` | Route, layout e route handler |
| `lib` | Moduli condivisi, senza route |
| `public` | Risorse statiche |

<!-- s:25756fa68d -->
File di routing

<!-- s:8d1e739d99 -->
| File | Scopo |
| :-- | :-- |
| `layout.tsx` | Interfaccia condivisa per un segmento |
| `page.tsx` | Una schermata associata a una route |
| `loading.tsx` | Fallback di Suspense |
| `error.tsx` | Error boundary |
| `not-found.tsx` | URL senza corrispondenza |
| `route.ts` | Endpoint API |

<!-- s:ed4806a616 -->
Route dinamiche

<!-- s:7f3bfd19e0 -->
| Cartella | URL | `params` |
| :-- | :-- | :-- |
| `[id]` | `/sessions/42` | `{ id: "42" }` |
| `[...slug]` | `/docs/a/b` | `{ slug: ["a", "b"] }` |

<!-- s:854c967567 -->
text.config.ts

<!-- s:144c0672ce -->
| Opzione | Valore predefinito | Descrizione |
| :-- | :-- | :-- |
| `title` | `""` | Titolo della pagina e del FocusPad |
| `viewport` | adattamento alla console, altrimenti `120×36` | `responsive` (valore predefinito `true`), fallback `width × height`, `theme` |
| `hints` | `[]` | Due o tre tasti mostrati sul FocusPad della pagina |
| `action` | `press <first hint>` | Cosa fare dopo aver ottenuto il focus, ad esempio `"type a prompt"` |
| `devIndicators` | `true` | Dev Overlay nella console (`[▼]`) |
| `focusHint` | `true` | «Fai clic sulla pagina per usare la tastiera» sopra l’ultima riga della console quando la pagina non ha il focus |
| `rewrites` | `[]` | Riscritture e proxy |
| `ansi` | `{ cols: 80, rows: 24 }` | Dimensioni del frame per [curl e client terminale](/docs/curl), oppure `false` per fornire loro HTML |

<!-- s:04e1df190e -->
CLI

<!-- s:86e6dffb86 -->
| Comando | Descrizione |
| :-- | :-- |
| `text dev` | Server di sviluppo con Fast Refresh |
| `text build` | Build di produzione |
| `text start` | Pubblicazione della build e dei route handler |
| `text run` | Rendering dell’app in un terminale ([Terminale](/docs/terminal)) |
| `text mcp` | Accesso all’app per gli agenti di programmazione ([MCP](/docs/mcp)) |
