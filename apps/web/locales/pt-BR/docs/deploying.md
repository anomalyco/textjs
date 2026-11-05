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

<!-- s:d671e1ae31 -->
Para adicionar o app a outro site com uma tag de script, gere o build com `--embed`. Todos os adaptadores oferecem suporte a isso (veja [Incorporação](/docs/embedding)).

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

<!-- s:f72ec91f11 -->
| Arquivo | Finalidade |
| :-- | :-- |
| `_worker.js` | Middleware, rewrites, manipuladores de rota e o documento do console. Um diretório (`index.js` e `yoga.wasm`) quando um manipulador de rota usa Yoga |
| `_routes.json` | Envia todas as requisições ao worker. Sem middleware ou um `basePath`, `/assets/*` permanece na CDN estática do Pages |
| `_headers` | Cache imutável para `/assets/*` (anexado ao seu) |
| `404.html` | Faz o Pages responder a arquivos ausentes com `404` em vez do app (mantido se você já tiver um) |

<!-- s:9bc2b010d1 -->
`.text/` (bundles do servidor e manifestos de build) é removido de `dist/`, pois o Pages publica o diretório como está.

<!-- s:1200dbc88d -->
Ative a flag de compatibilidade `nodejs_compat` no projeto do Pages (Configurações → Runtime) ou em `wrangler.toml`; o cache de dados usa `AsyncLocalStorage`. Arquivos estáticos são servidos pelo binding `ASSETS`, e a revalidação em segundo plano usa `ctx.waitUntil()`.

<!-- s:398bcc3496 -->
Com middleware, toda requisição executa o worker, incluindo assets com hash, para que o middleware veja todos os caminhos pelos quais um arquivo pode ser acessado. Cada requisição que executa o worker é uma invocação de Functions e conta para sua cota de requisições do Workers. Para carregar uma página, isso inclui o documento e cada arquivo que ele busca (3 para um pequeno app de teste: o documento, um bundle JavaScript e `yoga-[hash].wasm`; mais para apps com mais arquivos). No plano Workers Free, o Pages serve arquivos estáticos sem o worker quando a cota diária se esgota, ignorando o middleware. Se o middleware protege algo em `dist/`, defina Settings → Runtime → Fail open / closed como **Fail closed**.

<!-- s:24c3dfe433 -->
WebAssembly

<!-- s:72ec3f110c -->
Os apps Text.js carregam Yoga, o mecanismo de layout, de `assets/yoga-[hash].wasm` (72 kB, 29 kB com gzip). `text build` faz o pré-carregamento dele em todas as páginas. Os bundles de servidor e `text run` usam a cópia inline de `yoga-layout`. O worker da Cloudflare é a exceção: quando um manipulador de rota usa Yoga, `dist/_worker.js/` contém `yoga.wasm` ao lado de `index.js`.

<!-- s:0ca00aa2eb -->
- Sirva arquivos `.wasm` comprimidos, como você serve JavaScript. A Vercel comprime `application/wasm` por padrão; o nginx precisa de `application/wasm` em `gzip_types`. Se sua hospedagem comprime JavaScript, mas não `.wasm`, as páginas baixam cerca de 32 kB a mais do que com a cópia inline.
- Envie `Content-Type: application/wasm` para que o navegador compile o arquivo enquanto o baixa. Com outro tipo, ele compila após o download.
- Armazene-o em cache como os outros arquivos com hash em `assets/` (`Cache-Control: public, max-age=31536000, immutable`). Isso é seguro porque o nome muda com o conteúdo. Não use `immutable` para caminhos sem hash.
- Se você definir uma Política de Segurança de Conteúdo, adicione `'wasm-unsafe-eval'` a `script-src` e a origem do arquivo (geralmente `'self'`) a `connect-src`.
- Se caminhos desconhecidos retornam `index.html` como alternativa, exclua `/assets/` dessa reescrita. Caso contrário, um arquivo ausente retorna HTML e `initYoga()` rejeita com `TX032`.

<!-- s:55fb3b1d03 -->
Seu próprio build com Vite ou webpack

<!-- s:df66a10103 -->
Quando você gera os bundles de `@textjs/core` e `@textjs/react` por conta própria, Yoga permanece inline e não precisa de configuração do bundler. Bundles que resolvem a condição `workerd`, como Wrangler, importam `@textjs/core/yoga.wasm` como um módulo em vez disso. Para carregar o arquivo `.wasm` em um build para navegador, adicione a condição de resolução `@textjs/client` ao build do cliente. No Vite 6, que exporta `defaultClientConditions`, o pré-bundler de desenvolvimento também precisa dela:

<!-- s:8f580efda1 -->
A condição também separa o mecanismo bidi em seu próprio chunk, que é baixado na primeira vez que uma página exibe texto da direita para a esquerda (veja [Carregar o mecanismo bidi](/docs/internationalization#loading-the-bidi-engine)).

<!-- s:c2349d8226 -->
Deixe a condição fora dos builds de servidor, pré-renderização e teste (Vitest, jsdom), que funcionam normalmente com a cópia inline.

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
