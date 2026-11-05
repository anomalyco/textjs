<!-- s:5c16c8b17b -->
Les dossiers dans `app/` définissent les routes, et des fichiers spéciaux définissent l’interface de chaque route.

<!-- s:11f7d9178c -->
Dossiers

<!-- s:8bda4d61c2 -->
| Dossier | Rôle |
| :-- | :-- |
| `app` | Routes, layouts et gestionnaires de route |
| `lib` | Modules partagés, sans route associée |
| `public` | Ressources statiques |

<!-- s:25756fa68d -->
Fichiers de routage

<!-- s:8d1e739d99 -->
| Fichier | Rôle |
| :-- | :-- |
| `layout.tsx` | Interface partagée pour un segment |
| `page.tsx` | Écran accessible par une route |
| `loading.tsx` | Contenu de repli de Suspense |
| `error.tsx` | Limite de capture des erreurs |
| `not-found.tsx` | URL sans correspondance |
| `route.ts` | Point de terminaison d’API |

<!-- s:ed4806a616 -->
Routes dynamiques

<!-- s:7f3bfd19e0 -->
| Dossier | URL | `params` |
| :-- | :-- | :-- |
| `[id]` | `/sessions/42` | `{ id: "42" }` |
| `[...slug]` | `/docs/a/b` | `{ slug: ["a", "b"] }` |

<!-- s:854c967567 -->
text.config.ts

<!-- s:1baaf058bb -->
| Option | Valeur par défaut | Description |
| :-- | :-- | :-- |
| `title` | `""` | Titre de la page et du FocusPad |
| `viewport` | adapté à la console, sinon `120×36` | `responsive` (`true` par défaut), repli sur `width × height`, `theme` |
| `hints` | `[]` | Deux ou trois touches affichées sur le FocusPad de la page |
| `action` | `press <first hint>` | Action à effectuer une fois le focus obtenu, par exemple `"type a prompt"` |
| `devIndicators` | `true` | Overlay de développement dans la console (`[▼]`) |
| `focusHint` | `true` | « Cliquez sur la page pour utiliser le clavier » au-dessus de la dernière ligne de la console tant que la page n’a pas le focus |
| `rewrites` | `[]` | Réécritures et proxys |
| `ansi` | `{ cols: 80, rows: 24 }` | Taille des frames pour [curl et les clients de terminal](/docs/curl), ou `false` pour leur servir du HTML |
| `embed` | `false` | Compilation de l’application pour que d’autres sites l’ajoutent avec une seule balise script ([Intégration](/docs/embedding), expérimental) |

<!-- s:04e1df190e -->
CLI

<!-- s:86e6dffb86 -->
| Commande | Description |
| :-- | :-- |
| `text dev` | Serveur de développement avec Fast Refresh |
| `text build` | Compilation de production |
| `text start` | Mise à disposition de la compilation et des gestionnaires de route |
| `text run` | Rendu de l’application dans un terminal ([Terminal](/docs/terminal)) |
| `text mcp` | Mise à disposition de l’application pour les agents de programmation ([MCP](/docs/mcp)) |
