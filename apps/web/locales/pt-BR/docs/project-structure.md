<!-- s:5c16c8b17b -->
As pastas em `app/` definem rotas, e arquivos especiais definem a interface de cada rota.

<!-- s:11f7d9178c -->
Pastas

<!-- s:8bda4d61c2 -->
| Pasta | Finalidade |
| :-- | :-- |
| `app` | Rotas, layouts e manipuladores de rota |
| `lib` | Módulos compartilhados, sem roteamento |
| `public` | Recursos estáticos |

<!-- s:25756fa68d -->
Arquivos de roteamento

<!-- s:8d1e739d99 -->
| Arquivo | Finalidade |
| :-- | :-- |
| `layout.tsx` | Interface compartilhada de um segmento |
| `page.tsx` | Uma tela acessível por rota |
| `loading.tsx` | Conteúdo alternativo do Suspense |
| `error.tsx` | Limite de erro |
| `not-found.tsx` | URLs sem correspondência |
| `route.ts` | Endpoint de API |

<!-- s:ed4806a616 -->
Rotas dinâmicas

<!-- s:7f3bfd19e0 -->
| Pasta | URL | `params` |
| :-- | :-- | :-- |
| `[id]` | `/sessions/42` | `{ id: "42" }` |
| `[...slug]` | `/docs/a/b` | `{ slug: ["a", "b"] }` |

<!-- s:854c967567 -->
text.config.ts

<!-- s:144c0672ce -->
| Opção | Padrão | Descrição |
| :-- | :-- | :-- |
| `title` | `""` | Título da página e do FocusPad |
| `viewport` | ajustado ao console, senão `120×36` | `responsive` (padrão `true`), alternativa `width × height`, `theme` |
| `hints` | `[]` | Duas ou três teclas exibidas no FocusPad da página |
| `action` | `press <first hint>` | O que fazer após receber o foco, por exemplo, `"type a prompt"` |
| `devIndicators` | `true` | Sobreposição de desenvolvimento no console (`[▼]`) |
| `focusHint` | `true` | “Clique na página para usar o teclado” sobre a última linha do console enquanto a página não está em foco |
| `rewrites` | `[]` | Reescritas e proxies |
| `ansi` | `{ cols: 80, rows: 24 }` | Tamanho do quadro para [curl e clientes de terminal](/docs/curl), ou `false` para servir HTML a eles |

<!-- s:04e1df190e -->
CLI

<!-- s:86e6dffb86 -->
| Comando | Descrição |
| :-- | :-- |
| `text dev` | Servidor de desenvolvimento com Fast Refresh |
| `text build` | Build de produção |
| `text start` | Servir o build e os manipuladores de rota |
| `text run` | Renderizar o app em um terminal ([Terminal](/docs/terminal)) |
| `text mcp` | Servir o app a agentes de programação ([MCP](/docs/mcp)) |
