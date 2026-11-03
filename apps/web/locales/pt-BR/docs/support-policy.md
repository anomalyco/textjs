<!-- s:d2d5ef69d7 -->
Esta página explica por quanto tempo cada linha de versões do Text.js recebe correções e o que conta como uma mudança incompatível.

<!-- s:80371443b7 -->
Linhas de versões

<!-- s:19aa9fdfd3 -->
| Status | Recebe | Duração |
| :-- | :-- | :-- |
| Ativa | Recursos, correções, patches de segurança | Até a próxima versão principal |
| LTS de manutenção | Correções críticas e patches de segurança | 12 meses após o lançamento da próxima versão principal |
| Fim de vida | Nada | — |

<!-- s:d5987f6ecf -->
Apenas a versão secundária mais recente de uma versão principal recebe correções: quando a `1.5.0` é lançada, as correções entram na `1.5.x`, não na `1.4.x`. Quando a `2.0.0` é lançada, a última versão secundária da `1.x` se torna a linha LTS de manutenção e é publicada com as dist-tags `lts` e `v1-lts`.

<!-- s:6a7ba75ff1 -->
| Versão | Status | Suporte até |
| :-- | :-- | :-- |
| 1.x | Ativa | 12 meses após a 2.0.0 |

<!-- s:d71377bf9c -->
Correções na LTS

<!-- s:043b92b499 -->
- Vulnerabilidades de segurança nos pacotes do Text.js
- Falhas de execução, perda de dados e falhas de build sem solução alternativa
- Compatibilidade com novas versões do Chrome, Edge, Firefox e Safari que prejudiquem a renderização no console
- Compatibilidade com runtimes e destinos de deploy com suporte

<!-- s:e01d1121d2 -->
Novos recursos, melhorias de desempenho e refatorações entram apenas na linha ativa.

<!-- s:d1c69ba9bc -->
Mudanças incompatíveis

<!-- s:82596fcd52 -->
Os itens a seguir só mudam em uma versão principal, após um aviso de descontinuação em pelo menos uma versão secundária:

<!-- s:4ca9fd7807 -->
- Exportações públicas de `@textjs/app`, `@textjs/react` e `@textjs/core`, incluindo `@textjs/app/server` e `@textjs/app/cache`
- Opções de `text.config.ts`, comandos e flags da CLI `text`
- Convenções de arquivos em `app/`, `middleware.ts` e configuração de segmentos de rota
- Layouts de saída dos adaptadores (`.vercel/output`, `_worker.js`, `dist/server.js`)

<!-- s:3a8ad71311 -->
Não estão cobertos: APIs marcadas como experimentais ou `unstable_`, incluindo tudo em `@textjs/core/experimental` e `@textjs/react/experimental` (elas podem mudar em uma versão secundária, com notas no changelog), detalhes internos como `@textjs/core/internal`, cabeçalhos `x-middleware-*` e metadados de build em `.text/`, versões canary e as strings de formato e o CSS exatos de `console.log` (os quadros permanecem visualmente idênticos; sua codificação pode ficar mais rápida).

<!-- s:5c7d9aae9b -->
Suporte a runtimes

<!-- s:30122ce1bb -->
| Runtime | Suporte |
| :-- | :-- |
| DevTools do Chrome / Edge | Versão estável atual e as duas anteriores |
| Consoles do Firefox e Safari | Versão estável atual |
| Node.js | Versões LTS ativas e de manutenção (`text start`, funções da Vercel) |
| Bun | Versão 1.x mais recente |
| Cloudflare Workers | `compatibility_date` 2025-01-01 ou posterior, `nodejs_compat` |

<!-- s:509c18536b -->
Remover o suporte a uma versão de runtime que chegou ao próprio fim de vida não é uma mudança incompatível.

<!-- s:52543dba9b -->
Segurança

<!-- s:2aff0514c5 -->
Informe vulnerabilidades de forma privada para [security@textjs.org](mailto:security@textjs.org) ou pelos [avisos de segurança do GitHub](https://github.com/anomalyco/textjs/security/advisories/new). As correções são lançadas para todas as linhas com suporte ao mesmo tempo, e o aviso é publicado assim que as versões corrigidas estão no npm.

<!-- s:b933131934 -->
Consulte [Canais de lançamento](/docs/release-channels) para saber como as versões e as dist-tags são produzidas.
