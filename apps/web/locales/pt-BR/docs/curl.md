<!-- s:5f3abb073d -->
Clientes HTTP de terminal recebem o primeiro quadro de uma página como texto ANSI truecolor em vez do documento HTML. Você não precisa configurar nada.

<!-- s:f501ff55e0 -->
Quais requisições recebem um quadro

<!-- s:3384141bb9 -->
Uma requisição recebe um quadro quando todas estas condições são atendidas:

<!-- s:05a334e510 -->
- o método é `GET` ou `HEAD`;
- o `User-Agent` começa com `curl/`, `Wget/`, `wget2/`, `HTTPie/` ou `xh/`;
- o cabeçalho `Accept` está ausente ou não menciona `text/html`.

<!-- s:4af297e372 -->
Navegadores, rastreadores e prévias de links recebem a página HTML. Para receber o HTML pelo curl, solicite-o:

<!-- s:03dba887a9 -->
O quadro é escolhido no ponto em que a página seria servida: após [middleware](/docs/middleware), `rewrites` e [manipuladores de rota](/docs/route-handlers), e nunca para arquivos ou caminhos cujo último segmento contém um ponto. Redirecionamentos do middleware, respostas `401`, cabeçalhos e reescritas se aplicam ao curl como aos navegadores. `/api/health` continua executando seu manipulador e `/robots.txt` continua servindo o arquivo.

<!-- s:e0c4f5f416 -->
Conteúdo do quadro

<!-- s:50fa4581ec -->
O quadro é a primeira renderização da página, como em uma [estrutura pré-renderizada](/docs/server-rendering#partial-prerendering): cada limite de `<Suspense>` que ainda está aguardando exibe seu fallback. Componentes de servidor assíncronos não são executados, e `fetch()` nunca é resolvido, então os dados carregados em efeitos permanecem no estado de carregamento.

<!-- s:08efeec61a -->
- **Tamanho:** 80 × 24 células. Um app com viewport fixo (`viewport.responsive: false`) usa `viewport.width × viewport.height` em vez disso.
- **Cores:** códigos de escape SGR de 24 bits no `viewport.theme` do app. Cada linha termina com uma redefinição, e o quadro termina com uma quebra de linha.
- **Status:** `200`, ou `404` com a página de não encontrado do app quando nenhuma página corresponde ou a página chama `notFound()`. Uma página que chama `redirect()` durante a renderização serve HTML.

<!-- s:1125803eb1 -->
As respostas são `text/plain; charset=utf-8` com `Vary: User-Agent, Accept` e `Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate`, para que caches compartilhados nunca armazenem um quadro e o sirvam a um navegador. A página HTML em um caminho no qual o curl recebe um quadro inclui o mesmo cabeçalho `Vary`.

<!-- s:0e2aba0a67 -->
Onde funciona

<!-- s:d40234848f -->
| Hospedagem | Páginas estáticas | Páginas dinâmicas, caminhos desconhecidos |
| :-- | :-- | :-- |
| `text dev` | Renderizadas sob demanda | Renderizadas sob demanda |
| `text start`, `bun` | Pré-renderizadas por `text build` | Renderizadas sob demanda |
| `vercel`, `cloudflare` | Pré-renderizadas por `text build` | Página HTML |
| `static` | Página HTML | Página HTML |

<!-- s:11c905d6a6 -->
Páginas renderizadas no servidor precisam de `text start` ou `bun` (veja [Fazer deploy](/docs/deploying#server-rendered-routes)).

<!-- s:2cdc6d454b -->
Hospedagens estáticas não podem responder a um cliente de forma diferente de outro, então o adaptador `static` não oferece suporte a quadros. Na Vercel e na Cloudflare, os quadros de páginas estáticas são incluídos no build. Páginas dinâmicas (`[id]`, `force-dynamic`) servem HTML nessas plataformas, porque os adaptadores `vercel` e `cloudflare` não fazem deploy de um renderizador.

<!-- s:022d3d5541 -->
`text start` e `bun dist/server.js` renderizam as páginas restantes sob demanda com `.text/server/live.mjs` e mantêm os últimos 128 quadros por 10 segundos. Cada servidor renderiza no máximo 20 páginas sem cache a cada 10 segundos. Acima desse limite, o curl recebe a página HTML até que a cota seja renovada. Se `live.mjs` não puder ser carregado no servidor, por exemplo porque um módulo de página lê `window` no nível superior, essas páginas servem HTML.

<!-- s:2500855fbd -->
`text build` informa os quadros pré-renderizados:

<!-- s:37f210b46a -->
Configuração

<!-- s:ac46338e16 -->
Altere o tamanho para todo o app ou desative os quadros:

<!-- s:36fb2e113c -->
Uma página pode alterar seu próprio tamanho ou servir HTML também para terminais:

<!-- s:11c75396f6 -->
Os tamanhos são limitados a 1–500 células. Com `ansi: false` em `text.config.ts`, as exportações das páginas são ignoradas.

<!-- s:17ae9b44af -->
HTTP sem criptografia

<!-- s:e9b0dd23eb -->
O curl não segue redirecionamentos a menos que você passe `-L`. A Vercel redireciona requisições `http://` para `https://`, assim como a Cloudflare com **Sempre usar HTTPS** ativado, então `curl http://…` imprime o redirecionamento em vez do quadro. Compartilhe URLs `https://`.

<!-- s:740b32f53f -->
Servidores personalizados

<!-- s:144c78c64b -->
`@textjs/app/ansi` exporta as funções auxiliares de detecção e resposta para servidores e funções que não executam `text start` nem um adaptador:

<!-- s:ed621ccb22 -->
`wantsAnsi(request)` também aceita `(method, headers)` com `Headers` da Web ou `IncomingHttpHeaders` do Node. `frameToAnsi(buffer, { theme })` codifica um `CellBuffer` renderizado da mesma forma que o framework.
