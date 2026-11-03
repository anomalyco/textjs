<!-- s:04615ef523 -->
`text build` produz um `dist/` portátil. Um adaptador o transforma na saída que a plataforma espera.

<!-- s:087f8d3137 -->
Adaptadores

<!-- s:04908c6c09 -->
| Adaptador | Saída | Execução |
| :-- | :-- | :-- |
| *(nenhum)* | `dist/` + `dist/.text/server` | `text start` (Node) |
| `static` | `dist/` | Qualquer hospedagem estática |
| `bun` | `dist/server.js` | `bun dist/server.js` |
| `vercel` | `.vercel/output` | Vercel (Build Output API v3) |
| `cloudflare` | `dist/` + `_worker.js` | Cloudflare Pages |

<!-- s:7e755a5c9f -->
O adaptador também pode vir de `TEXTJS_ADAPTER`. Quando `text build` é executado na Vercel (`VERCEL=1`) ou no Cloudflare Pages (`CF_PAGES=1`), o adaptador correspondente é selecionado automaticamente.

<!-- s:9d8df946e5 -->
Os adaptadores de servidor (`bun`, `vercel` e `cloudflare`) executam o mesmo pipeline de `text start`: [middleware](/docs/middleware), `rewrites`, [manipuladores de rota](/docs/route-handlers) com o [cache de rotas](/docs/caching), arquivos estáticos e, por fim, o documento do console para URLs de páginas. Clientes de terminal como curl recebem o primeiro quadro da página como texto ANSI. Em `vercel` e `cloudflare`, isso abrange apenas páginas estáticas (veja [curl e clientes de terminal](/docs/curl)). Os adaptadores de servidor servem arquivos com hash em `/assets/` com `Cache-Control: public, max-age=31536000, immutable`.

<!-- s:1a5ee098c6 -->
Estático

<!-- s:9ebd0d2866 -->
Use em hospedagens sem servidor, como GitHub Pages, S3 ou uma CDN. Manipuladores de rota `GET` com `dynamic = "force-static"` ou `revalidate` passam por pré-renderização em arquivos: `app/api/feed.json/route.ts` se torna `dist/api/feed.json`. Uma cópia de `index.html` é gravada em `404.html` para que links diretos abram o app do console. Hospedagens estáticas não conseguem distinguir curl de um navegador, então curl recebe a página HTML.

<!-- s:1e90536a2a -->
O build falha, listando todos os motivos, se o app precisar de um servidor: `middleware.ts`, [rotas renderizadas no servidor](/docs/server-rendering), manipuladores de rota dinâmicos, manipuladores de rota com segmentos dinâmicos ou métodos diferentes de `GET`. Configure `rewrites` na hospedagem.

<!-- s:2c3ddc9047 -->
Bun

<!-- s:d451f14e30 -->
O adaptador `bun` grava um único servidor autocontido que não precisa de `node_modules` em tempo de execução. Ele lê `PORT` (padrão `3000`) e `HOSTNAME` (padrão `0.0.0.0`) e nunca serve `server.js` ou `.text/`. É um processo de longa duração, então também hospeda [rotas renderizadas no servidor](/docs/server-rendering) (`export const runtime = "server"`) e suas sessões ativas, como `text start`. Use em um contêiner:

<!-- s:0c6d59947b -->
Vercel

<!-- s:b9d1e3b495 -->
Ou envie para um repositório Git conectado à Vercel: o build executa `text build`, detecta a Vercel e grava `.vercel/output`.

<!-- s:3ee6894582 -->
| Saída | Conteúdo |
| :-- | :-- |
| `static/` | O build do cliente (sob `basePath`) |
| `functions/_textjs/server.func` | Uma função Node.js 22 que atende todos os manipuladores de rota, com streaming |
| `functions/_middleware.func` | Middleware de roteamento Edge: `middleware.ts` e caminhos canônicos para todos os apps |
| `config.json` | Cabeçalhos de arquivos estáticos, matchers de middleware, reescritas, rotas de manipuladores e o documento do console |

<!-- s:3f3ba93b7d -->
O middleware edge usa o protocolo `x-middleware-next` / `x-middleware-rewrite`, então substituições de cabeçalhos e reescritas acontecem no roteador da Vercel antes de chegar à função ou à CDN. Todos os matchers compartilham um padrão de rota `src`. Requisições que nenhum matcher cobre pulam o middleware, a menos que seu caminho possa não estar na forma canônica (escapes percentuais, caracteres que um parser de URL codifica, `//`, segmentos `.` ou `..`, uma barra final). O middleware então compara o caminho canônico, verifica `has` / `missing` e reescreve a requisição para esse caminho, para que a Vercel a roteie da mesma maneira. Apps sem `middleware.ts` recebem a mesma função edge, que apenas faz a reescrita. Como todo build inclui uma função Edge, faça deploy com uma conta da Vercel autenticada: deploys anônimos (`vercel deploy --temporary`) não aceitam funções Edge.

<!-- s:b5af065e25 -->
A função do manipulador é interna. Cada rota de manipulador passa o caminho correspondente para ela no cabeçalho de requisição `x-textjs-path`. Esse cabeçalho é removido de toda requisição antes e depois do middleware, e o middleware edge nunca encaminha um (do cliente ou de `middleware.ts`), então apenas as rotas de manipuladores podem defini-lo. Requisições para `/_textjs/*` retornam `404` sem executar a função, antes e depois do middleware e das reescritas. As rotas geradas diferenciam maiúsculas de minúsculas, como os matchers e as reescritas em todas as outras hospedagens.

<!-- s:5e18b8a450 -->
Os testes do adaptador executam essa saída contra uma emulação local do roteador da Vercel. Seu comportamento para correspondência de `src`, capturas de `dest`, transformações de cabeçalhos e rotas de `status` foi verificado em deploys reais; o middleware Edge não foi, porque não é possível fazer deploy dele anonimamente.

<!-- s:14e7957486 -->
Cloudflare Pages

<!-- s:6109800459 -->
A saída usa o modo avançado do Pages:

<!-- s:9f0923168f -->
| Arquivo | Finalidade |
| :-- | :-- |
| `_worker.js` | Middleware, reescritas, manipuladores de rota e o documento do console |
| `_routes.json` | Envia toda requisição ao worker. Sem middleware ou um `basePath`, `/assets/*` permanece na CDN estática do Pages |
| `_headers` | Cache imutável para `/assets/*` (anexado ao seu) |
| `404.html` | Faz o Pages responder a arquivos ausentes com `404` em vez do app (mantido se você já tiver um) |

<!-- s:9bc2b010d1 -->
`.text/` (bundles do servidor e manifestos de build) é removido de `dist/`, pois o Pages publica o diretório como está.

<!-- s:1200dbc88d -->
Ative a flag de compatibilidade `nodejs_compat` no projeto do Pages (Configurações → Runtime) ou em `wrangler.toml`; o cache de dados usa `AsyncLocalStorage`. Arquivos estáticos são servidos pelo binding `ASSETS`, e a revalidação em segundo plano usa `ctx.waitUntil()`.

<!-- s:0bb76cfebb -->
Com middleware, toda requisição executa o worker, incluindo arquivos com hash, para que o middleware veja todos os caminhos pelos quais um arquivo pode ser acessado. Cada requisição que executa o worker é uma invocação de Functions e conta na sua cota de requisições do Workers. Para um carregamento de página, isso inclui o documento mais cada arquivo que ele busca (2 para um pequeno app de teste com um bundle JavaScript; mais para apps com mais arquivos). No plano Workers Free, o Pages serve arquivos estáticos sem o worker quando a cota diária acaba, pulando o middleware. Se o middleware proteger algo em `dist/`, defina Configurações → Runtime → Falhar aberto / fechado como **Falhar fechado**.

<!-- s:600050383d -->
Atualização

<!-- s:e8733a2bfb -->
As correções de segurança em `@textjs/app` só chegam a um deploy depois que você refaz o build e faz deploy novamente:

<!-- s:c74adc728a -->
- Vercel: faça deploy do novo `.vercel/output`.
- Cloudflare Pages: faça deploy do novo `dist/`, com `_worker.js` e `_routes.json`.
- Bun: faça deploy de todo o novo `dist/` (`server.js`, arquivos estáticos e bundles de sessões ativas) e reinicie o servidor.
- `text start`: execute `text build` e reinicie.

<!-- s:8047727085 -->
Deploys antigos continuam acessíveis em suas próprias URLs (URLs de prévia da Vercel e do Cloudflare Pages, por exemplo). Exclua-os ou coloque-os sob a proteção de acesso da plataforma.

<!-- s:f5e077273b -->
Rotas renderizadas no servidor

<!-- s:049ef31493 -->
[Rotas renderizadas no servidor](/docs/server-rendering) mantêm uma sessão por aba aberta, então precisam de um servidor de longa duração: `text start` ou o adaptador `bun`. Os adaptadores `static`, `vercel` e `cloudflare` fazem o build falhar com `TX030` quando uma página exporta `runtime = "server"`.

<!-- s:eb19728e6b -->
Atrás de um proxy

<!-- s:21a17d0b45 -->
`text start` se vincula a `127.0.0.1` e, enquanto vinculado ao loopback, responde apenas a `localhost`, `*.localhost` e hosts com endereço IP (proteção contra DNS rebinding). Outros hosts recebem um `403` com `TX028`. Coloque as configurações públicas em `text.config.ts`:

<!-- s:43bd5471c8 -->
Sem `origin` ou `trustProxy`, `request.url` é construído a partir do cabeçalho `Host` validado, usando `http`.

<!-- s:689cebe287 -->
Ressalvas

<!-- s:f45e3fb003 -->
- `proxy` em `text.config.ts` só é executado em `text dev` e `text start`; os adaptadores não o incluem. Use `rewrites`, compatível com todos os adaptadores de servidor.
- Cada instância serverless tem seu próprio cache em memória. Veja [Cache](/docs/caching#platform-notes).
- `rewrites` que usam grupos brutos de expressões regulares são convertidos em rotas da Vercel na medida do possível; parâmetros nomeados (`:slug`, `:path*`) são exatos.
