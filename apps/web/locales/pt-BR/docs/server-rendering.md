<!-- s:5c794493de -->
Renderize a árvore React de uma rota no servidor e transmita seus quadros para o console. Pré-renderize o primeiro quadro de cada rota estática no HTML dela.

<!-- s:f5f9690d9e -->
Dois ambientes de execução

<!-- s:26b5b0c1e5 -->
Cada página é renderizada em um de dois lugares:

<!-- s:2b217df435 -->
| | Cliente (padrão) | Servidor (`runtime = "server"`) |
| --- | --- | --- |
| A árvore React é executada em | A aba do navegador | `text dev` / `text start` / o adaptador `bun` (Bun ou Node) |
| O navegador baixa | O app completo: React, Yoga WASM, suas rotas | O reprodutor de quadros, cerca de 21 kB gzip |
| Acesso a dados | `fetch()` para manipuladores de rota | Direto: bancos de dados, arquivos, `node:*`, segredos |
| Componentes assíncronos | Use `use()` ou efeitos | Componentes `async function` são compatíveis |
| Latência das teclas | Mesma tarefa, síncrona | Uma ida e volta ao servidor |
| Funciona em hospedagem estática | Sim | Não, precisa de `text start` ou `bun dist/server.js` |

<!-- s:7b06d151a6 -->
Os dois ambientes de execução produzem os mesmos quadros. O reprodutor de quadros codifica as células com o mesmo `CssConsoleDriver` e mantém o mesmo ritmo de ~15 fps, então um quadro renderizado no servidor corresponde à chamada `console.log` do cliente byte a byte.

<!-- s:70a0b18bdd -->
Ativar

<!-- s:660b2936b0 -->
Exporte `runtime` de uma página:

<!-- s:567f4b3d2b -->
`runtime` é lido por página, como uma exportação de string estática (uma anotação de tipo, `as const` ou uma reexportação são aceitos; um valor calculado não). Layouts, `loading.tsx`, `error.tsx` e `not-found.tsx` são renderizados onde sua página é renderizada: um layout compartilhado por páginas do cliente e do servidor é executado nos dois lugares e enviado ao navegador, enquanto os layouts e limites de um segmento que contém apenas páginas do servidor permanecem no servidor. Hooks, foco, `useInput`, `<Link>` e `useRouter()` se comportam da mesma forma que no cliente.

<!-- s:43c4fa1dac -->
Quando usar cada um

<!-- s:ac38ce3c55 -->
Use o ambiente de execução do **cliente** (o padrão) para:

<!-- s:ced9e65891 -->
- Interfaces com muita digitação, em que cada tecla precisa ser desenhada na mesma tarefa, como editores e filtros.
- Apps com deploy em hospedagem estática ou CDN.
- Ferramentas que funcionam offline.

<!-- s:54292284aa -->
Use o ambiente de execução do **servidor** para:

<!-- s:bb8a20e6e2 -->
- Painéis e telas administrativas que leem bancos de dados, arquivos, filas ou APIs privadas. As credenciais ficam no servidor.
- Rotas com dependências pesadas (SDKs, analisadores, tabelas de sintaxe) que você não quer no bundle do navegador.
- Páginas que devem carregar rápido em redes lentas. O navegador baixa o reprodutor de 21 kB (gzip) em vez do app completo.

<!-- s:920f4ad7e8 -->
Você pode misturar ambientes de execução em um app. Navegar entre eles carrega a URL de destino como um novo documento. O bundle do navegador substitui cada página de servidor por um stub, então os módulos de servidor e tudo que eles importam nunca são enviados ao cliente.

<!-- s:2de98cc507 -->
Nomeie os módulos exclusivos do servidor como `*.server.ts`. O build falha se o código enviado ao navegador (uma página de cliente ou um layout usado por uma página de cliente) importar um módulo `*.server.*` ou um módulo nativo `node:*`, indicando quem fez a importação.

<!-- s:1c109f371d -->
O [middleware](/docs/middleware) protege rotas de servidor da mesma forma que protege documentos: ele é executado para a rota de destino antes de uma sessão ser aberta, antes de cada navegação dentro da sessão (`router.push`, Voltar e Avançar) e novamente sempre que os cookies ou o `Authorization` da sessão mudam. Quando ele redirecionaria, rejeitaria ou reescreveria, o navegador carrega a URL como um documento, e o middleware responde a essa requisição.

<!-- s:44ec23073a -->
Componentes assíncronos de servidor

<!-- s:491e80d70d -->
No servidor, qualquer componente `async function` suspende a renderização até o `<Suspense>` ou `loading.tsx` mais próximo até que sua promise seja resolvida:

<!-- s:155b6ae10f -->
Cada promise é armazenada em cache por sessão e identificada pelo componente e pelas props, então uma nova tentativa de renderização reutiliza a requisição já em andamento. O cache é limpo quando a rota muda e em `router.refresh()`. Para executar o acesso a dados novamente após uma entrada, chame `router.refresh()`:

<!-- s:abfa753a7c -->
As props passadas a componentes assíncronos devem ser serializáveis: strings, números, objetos simples, arrays, `Date`, `URL`, `Map`, `Set` e elementos. Props de função não fazem parte da chave (passe dados, não callbacks). Cada sessão armazena no máximo 256 promises em cache. Você também pode envolver um componente manualmente com `serverComponent(fn)` de `@textjs/app/server-components`.

<!-- s:55cf9764ac -->
Hooks (`useState`, `useInput`, …) não funcionam dentro de um componente `async function`. Renderize um componente comum ao redor ou abaixo dele para permitir interação.

<!-- s:5ae438610c -->
Como funciona

<!-- s:ec3e56dbc6 -->
- **Uma sessão por aba.** Cada carregamento de página abre sua própria sessão: uma raiz React, um histórico do roteador em memória e um buffer de células no servidor. Os IDs de sessão são valores aleatórios de 192 bits que o navegador mantém apenas na memória.
- **Deltas de células.** O servidor envia apenas as linhas cujo hash mudou desde o último quadro recebido por aquela conexão. Cada linha é enviada como sequências de texto com referência a uma tabela de estilos que só permite anexar entradas, e grafemas largos, agrupamentos de emojis e cores translúcidas são preservados exatamente.
- **Contrapressão.** Os quadros têm um intervalo de pelo menos 66 ms, e cada um é comparado ao último que o socket aceitou. Quando uma conexão lenta para de escoar dados, os estados intermediários são ignorados, e o próximo quadro salta direto para o mais recente.
- **Reconexões.** Se o fluxo cair, o reprodutor se reconecta com seu ID de sessão no cabeçalho `x-textjs-live` (nunca na URL) e retoma a mesma sessão, com seu estado intacto, a partir de um novo quadro-chave. As atualizações perdidas da barra de endereços são reproduzidas. Uma sessão sem conexão para de renderizar e é desmontada após 30 segundos; se o servidor a esqueceu, o reprodutor abre uma nova.
- **Histórico.** Voltar e Avançar movem os dois históricos pelo mesmo número de entradas, e `router.back()` no servidor também move o histórico do navegador.
- **Segurança.** Os dois endpoints rejeitam requisições entre sites (`Sec-Fetch-Site` e `Origin`; `X-Forwarded-Host` só conta com `server.trustProxy`). POSTs de entrada precisam de um corpo JSON e do cabeçalho `x-textjs-live`. Cada evento é validado contra um esquema fixo, e os destinos de navegação devem ser caminhos na sua origem. Apenas páginas no seu manifesto `app/` podem ser renderizadas. As sessões são vinculadas aos cookies com que foram abertas.
- **Limites.** No máximo 64 eventos por POST e cerca de 240 por segundo por sessão (`429` acima disso), um tempo limite de 5 segundos para o corpo, 32 sessões por endereço de cliente e `maxSessions` por processo (a sessão desconectada há mais tempo é removida primeiro).

<!-- s:981308ad14 -->
Pré-renderização parcial

<!-- s:294fed5642 -->
`text build` renderiza cada rota estática uma vez, no tamanho de `viewport` configurado, e incorpora esse primeiro quadro ao HTML da rota como um pequeno `<script>` clássico. O console desenha antes que qualquer módulo carregue:

<!-- s:7eb15c9cc8 -->
1. **A estrutura estática.** Tudo que é renderizado de forma síncrona. Cada limite `<Suspense>` que ainda está aguardando mostra seu fallback, incluindo componentes assíncronos de servidor (que não são executados enquanto a estrutura é renderizada), `use()` e módulos lazy. `fetch()` nunca é resolvido enquanto a estrutura é renderizada, então os dados carregados em efeitos também permanecem no estado de carregamento.
2. **As lacunas dinâmicas.** Quando o JavaScript inicia, o renderizador do cliente ou o reprodutor de quadros transmite o quadro real. Ele é anexado abaixo da estrutura, e a própria cortina do quadro em hidratação tira a estrutura de vista na mesma pintura do DevTools. A estrutura registra quando foi desenhada, então o primeiro quadro em hidratação espera passar a janela pós-limpeza do DevTools em vez de cair no caminho lento.

<!-- s:94c6827f2c -->
Durante o carregamento, apenas a estrutura limpa o console. O renderizador em hidratação inicia no modo de anexação (`initialClear: false`), então nada pisca, e a estrutura só é desenhada no caminho para o qual foi renderizada. Rotas dinâmicas (`[id]`, `force-dynamic`) não renderizam estrutura.

<!-- s:1eef464bae -->
Desative com `ppr: false` em `text.config.ts`. A pré-renderização executa seus componentes durante o build, então mantenha o código de nível superior dos módulos livre de globais exclusivos do navegador. Uma rota que lança uma exceção, chama `redirect()` / `notFound()` ou navega durante a pré-renderização fica sem estrutura (uma tela de erro nunca é incorporada ao HTML), e o build informa o motivo.

<!-- s:c50a022df3 -->
A estrutura é renderizada em `viewport.width × viewport.height` (padrão `120 × 36`) porque o build não tem como saber o tamanho do console do visitante; o quadro em hidratação então se redimensiona para o console real. A estrutura é um `<script>` inline: com uma Política de Segurança de Conteúdo que proíbe scripts inline, permita-o por hash ou defina `ppr: false`.

<!-- s:ff96d35008 -->
Fazer deploy

<!-- s:e8a05a5448 -->
`text build` grava os seguintes arquivos:

<!-- s:8e75669ec0 -->
| Arquivo | Finalidade |
| --- | --- |
| `index.html`, `<route>/index.html` | Rotas de cliente com suas estruturas. Funciona em qualquer hospedagem estática. |
| `assets/player-[hash].js` | O reprodutor de quadros. |
| `.text/server/live.mjs` | Rotas de servidor, o App Router e o renderizador do console. |
| `.text/pages/…`, `.text/live.html` | Documentos de rotas de servidor. |
| `.text/ansi/…` | Primeiros quadros para [curl e outros clientes de terminal](/docs/curl). |

<!-- s:5782e0e345 -->
`text start` e o [adaptador `bun`](/docs/deploying#bun) servem todos eles. Rotas de servidor precisam de um processo de longa duração: os adaptadores `static`, `vercel` e `cloudflare` fazem o build falhar (`TX030`).
