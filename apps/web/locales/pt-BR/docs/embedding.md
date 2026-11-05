<!-- s:7e7d3cb07e -->
`text build --embed` compila seu app para que outro site possa adicioná-lo com uma tag de script, como uma página de marketing, um site de documentação, uma página do WordPress ou Webflow, ou um app React 18. Visitantes que abrem o DevTools acessam seu app no console. Os outros visitantes baixam `embed.js` (cerca de 3 kB com gzip) e nada mais, a menos que a página tenha um `<text-console>`.

<!-- s:2aa1d07d89 -->
As incorporações são experimentais. `text build --embed`, a opção `embed`, `<text-console>` e as exportações de `@textjs/app/experimental` podem mudar em uma versão secundária. Veja [Mudanças incompatíveis](/docs/support-policy#breaking-changes).

<!-- s:6d2aa784de -->
Adicionar um app a um site

<!-- s:f296ccaeef -->
Compile o app:

<!-- s:2198c52791 -->
Envie `dist/` para qualquer hospedagem estática ou CDN, ou copie para a pasta `public/` do site e adicione uma tag às páginas do site:

<!-- s:aa94ef1985 -->
`embed.js` carrega seus outros arquivos em relação à própria URL, então `dist/` funciona em qualquer caminho ou origem. Ele contém apenas `embed.js` e `assets/`, sem `index.html` ou `404.html` que possam substituir os do próprio site. Um app com [rotas renderizadas no servidor](#server-rendered-routes), manipuladores de rota ou middleware precisa de um servidor em vez de um simples envio de arquivos estáticos. Os adaptadores `vercel` e `cloudflare` executam manipuladores de rota e middleware, e rotas renderizadas no servidor precisam de `text start` ou do adaptador `bun`.

<!-- s:5c139759a2 -->
Para mostrar aos visitantes onde o app está, adicione [`<text-console>`](#text-console) em qualquer lugar da página. Qualquer elemento com `data-textjs-engage` também inicia o app quando pressionado:

<!-- s:6a70ec16e1 -->
Para testar localmente, execute `text dev --embed`. Ele serve `/embed.js` com um primeiro quadro novo a cada requisição e uma página de prévia em `/` (`/__textjs/embed` com `standalone`) que o carrega como outro site faria. Um site em outra porta local também pode carregar `http://localhost:3000/embed.js`.

<!-- s:37f210b46a -->
Configuração

<!-- s:aa9630bf92 -->
`text build --embed` equivale a `embed: true` em `text.config.ts`. Passe um objeto para alterar os padrões:

<!-- s:fbe8efc9f4 -->
| Opção | Padrão | Descrição |
| :-- | :-- | :-- |
| `initialPath` | `"/"` | A rota em que o console abre. Deve começar com `/` |
| `globalName` | `"text"` | O nome global sob o qual o app instala sua API do console ao iniciar. `false` não instala nenhum |
| `initialClear` | `false` | Limpar o console da página antes do primeiro quadro. Por padrão, o que a página registrou antes permanece acima do app |
| `standalone` | `false` | Compilar também as páginas do próprio app (`index.html`), como `text build` faz sem `embed` |
| `allowOrigins` | `[]` | Sites cujas páginas podem executar rotas renderizadas neste servidor. Veja [Rotas renderizadas no servidor](#server-rendered-routes) |
| `credentials` | `false` | Enviar credenciais do navegador para este servidor com requisições de sessão ao vivo de `allowOrigins`, em vez de descartar cookies e `Authorization`. Exige origens exatas |

<!-- s:12a3d28167 -->
`viewport.width × viewport.height` (padrão 120 × 36) é o tamanho do primeiro quadro. `title`, `hints` e `action` são os padrões de `<text-console>`. `embed.js` não tem um primeiro quadro pré-renderizado com `ppr: false`, ou quando `middleware.ts` pode corresponder a `initialPath`, já que qualquer pessoa pode baixar `embed.js`. Um espelho fica em branco até o app desenhar.

<!-- s:7ca27066c7 -->
Comportamento

<!-- s:1fe89ec57c -->
- **Nada mais carrega até a [intenção de usar o console](/docs/hooks-and-repl#loading-on-console-intent-experimental).** `embed.js` registra o primeiro quadro pré-renderizado e espera. O app carrega quando o DevTools está acoplado (no carregamento ou depois), quando o visitante pressiona um atalho do DevTools na página (F12, Ctrl+Shift+J, I, C ou K, ou ⌘⌥J, I, C ou K em um Mac), ou quando pressiona um `<text-console>` ou um elemento `[data-textjs-engage]`. Depois disso, recarregar a mesma aba inicia o app imediatamente. O DevTools em uma janela própria não altera o tamanho da página, então visitantes que o abriram por um menu veem o primeiro quadro até pressionarem um desses elementos.
- **Em telas sensíveis ao toque, o app não inicia.** Em um dispositivo que corresponde a `(hover: none) and (pointer: coarse)`, `embed.js` não registra nada e não adiciona listeners. O único arquivo que ele carrega é o de `<text-console>`, para um espelho.
- **As teclas só chegam ao app depois que o visitante o ativa.** Para ativá-lo, o visitante pressiona um `<text-console>` ou um elemento `[data-textjs-engage]`, ou clica na página (fora de links, botões ou campos) para trazer o foco de volta do DevTools. A digitação nos campos da própria página ou em um elemento `[data-textjs-bypass]` nunca chega ao app, e a roda do mouse sempre rola a página.
- **A URL, o histórico e o título da página nunca mudam.** Rotas, `<Link>` e `useRouter()` navegam dentro do console. Em apps renderizados no cliente, URLs absolutas abrem em uma nova aba.
- **Um app Text.js na página tem prioridade.** Quando ele inicia, uma incorporação em execução é desmontada, para de ler teclas e remove seu nome global. Uma incorporação que carrega enquanto outro app ocupa o console registra um aviso e não inicia.
- **A incorporação inclui seu próprio React 19.** Ela não tem `react-dom` nem imports sem caminho, então a versão do React da página, um mapa de importação para `react` e o React DevTools não a afetam.

<!-- s:5bd6dcbe49 -->
O que carrega e quando

<!-- s:631a37c837 -->
| Arquivo | Carregamento | gzip |
| :-- | :-- | --: |
| `embed.js` | Com a página | 2,9 kB |
| `assets/text-console-[hash].js` | Quando a página tem um `<text-console>` | 4,0 kB |
| `assets/embed-client-[hash].js` e `assets/yoga-[hash].wasm` | Na intenção de usar o console | 112,8 kB + 29,0 kB |
| `assets/embed-player-[hash].js` | Na intenção de usar o console, no lugar do cliente, para uma [rota renderizada no servidor](#server-rendered-routes) | 22,7 kB |
| `assets/bidi-[hash].js` | Na primeira vez que o app mostra texto da direita para a esquerda (veja [Carregar o mecanismo bidi](/docs/internationalization#loading-the-bidi-engine)) | 10,1 kB |

<!-- s:d86aa9b2e1 -->
Os tamanhos são de uma caixa de status com borda em 120 × 36. `text build --embed` imprime os do seu app. `assets/embed-[hash].js` é uma cópia de `embed.js` com um nome que nunca muda (veja [Deploys](#deploys)).

<!-- s:c6266b6378 -->
`<text-console>`

<!-- s:7156621f10 -->
`embed.js` define `<text-console>` e carrega seu arquivo apenas quando há um na página. Ele usa Shadow DOM, então o CSS da página não alcança seu interior, e uma política `style-src 'self'` não precisa de alterações.

<!-- s:9ceead3eca -->
Sem atributos, é uma barra de uma linha. Ela mostra o atalho do navegador para abrir o console, depois pede um clique e então lista as teclas do app, que se iluminam conforme chegam ao app. No Safari, a primeira etapa pede para ativar “Mostrar recursos para desenvolvedores web” nos ajustes do Safari.

<!-- s:899e0c7fe3 -->
Com `mirror`, ele mostra o quadro do app na página: o primeiro quadro pré-renderizado antes de qualquer outro carregamento, depois o app em execução. Pressioná-lo inicia o app e envia as teclas do visitante a ele, então o app funciona com o DevTools fechado. `chrome` desenha uma janela do DevTools ao redor do espelho e implica `mirror`.

<!-- s:fefcb3e495 -->
| Atributo | Descrição |
| :-- | :-- |
| `mirror` | Mostrar os quadros do app |
| `chrome` | Mostrar os quadros em uma janela do DevTools |
| `title` | O título da barra (padrão: `title` em `text.config.ts`) |
| `hints` | As teclas a listar, como `"← →:switch region, Enter:open"` (padrão: `hints` em `text.config.ts`) |
| `action` | O que fazer primeiro, mostrado como “Clique aqui e …” (padrão: `action` em `text.config.ts`, ou pressionar a primeira dica) |

<!-- s:392012169b -->
Em telas sensíveis ao toque, um espelho mostra o primeiro quadro sem iniciar o app, e a barra fica oculta. O texto do elemento está em inglês.

<!-- s:13ff4ec1f4 -->
Reservar seu espaço

<!-- s:0f4e2c234d -->
`text build --embed` imprime uma linha de CSS para a grade do seu app. Cole-a na folha de estilos da página. Ela dimensiona `<text-console>` antes de o arquivo do elemento carregar, então nada na página se move quando o arquivo chega. Para a grade padrão de 120 × 36, a linha é:

<!-- s:a2d2741417 -->
A barra tem 58 px de altura. Um espelho mantém a proporção da grade, até sua largura natural (885 px com 120 colunas), e `chrome` adiciona 43 px. O tamanho não depende das fontes. `reserveCss(cols, rows)` de `@textjs/app/experimental` retorna a mesma linha.

<!-- s:a1260c10c3 -->
Um espelho acima da dobra costuma ser o maior elemento da página, então define o Largest Contentful Paint (LCP) da página. Seu primeiro quadro é desenhado após o carregamento de `embed.js` e depois do arquivo do elemento, um após o outro. O restante da página é desenhado como seria sem a incorporação. Um espelho mais abaixo na página não afeta o LCP. Em uma página com scripts adiados próprios, como um app React, `<script type="module" async src="…">` executa `embed.js` sem esperar por eles, então um espelho acima da dobra é desenhado mais cedo.

<!-- s:4206a424a5 -->
Estilização

<!-- s:834fbf40e6 -->
Para centralizar um espelho, defina margens inline automáticas:

<!-- s:6dde2b2766 -->
Ele é escuro por padrão. Defina `color-scheme: light` para cores claras, ou defina as duas cores de cuja mistura vêm todos os outros tons. `::part(frame)` estiliza o próprio quadro. `chrome` mantém o fundo do próprio DevTools.

<!-- s:f5e077273b -->
Rotas renderizadas no servidor

<!-- s:eb293d9fb4 -->
Quando `initialPath` é uma rota com `export const runtime = "server"`, `embed.js` carrega o reprodutor de quadros em vez do runtime do cliente. Ele transmite quadros do servidor de onde veio `embed.js`, então execute `text start` ou o adaptador `bun`. Outros adaptadores fazem a compilação falhar. Veja [Renderização no servidor](/docs/server-rendering).

<!-- s:e2bdd4dbb7 -->
Uma página em outro site só pode abrir uma sessão ao vivo quando sua origem está em `allowOrigins`:

<!-- s:6ec7048857 -->
- Uma sessão só responde à origem que a abriu.
- Por padrão, Text.js descarta os cookies e o cabeçalho `Authorization` de sessões de outros sites, então o [middleware](/docs/middleware) vê um visitante não autenticado. `credentials: true` os mantém e exige origens exatas. O navegador os envia quando a página e o servidor compartilham um domínio registrável (`www.example.com` e `console.example.com`) e o cookie abrange o servidor (`Domain=example.com`, ou definido em `console.example.com`). De outros sites, ele envia apenas cookies definidos com `SameSite=None; Secure`, e navegadores que bloqueiam cookies de terceiros não enviam nenhum.
- Uma sessão ao vivo envia requisições preflight `OPTIONS` para `/__textjs/live` assim que se conecta e quando se reconecta. Requisições preflight não levam cookies nem `Authorization`, então o middleware que corresponde a esse caminho deve permitir requisições `OPTIONS` sem autenticação.
- Atrás de um proxy reverso ou CDN, defina `server.trustProxy` (veja [Atrás de um proxy](/docs/deploying#behind-a-proxy)). Sem isso, todos os visitantes têm o endereço do proxy, então todos compartilham um único limite de sessões por cliente.

<!-- s:f739524722 -->
`text dev` aceita páginas em `localhost`, `127.0.0.1` e `[::1]` em qualquer porta sem `allowOrigins`, a menos que `credentials` esteja definido.

<!-- s:d5df7bf60f -->
Hospedagem

<!-- s:4bef54c1c0 -->
`text start` e os adaptadores `bun`, `vercel` e `cloudflare` servem uma compilação de incorporação com estes cabeçalhos. O adaptador `static` os grava em `_headers`, que Cloudflare Pages e Netlify leem. Em qualquer outra hospedagem, como um bucket de armazenamento ou a pasta `public/` do próprio site, defina-os você:

<!-- s:be81a4c5ec -->
| Caminho | Cabeçalhos |
| :-- | :-- |
| `/embed.js` | `Cache-Control: public, max-age=0, must-revalidate` |
| `/assets/*` | `Cache-Control: public, max-age=31536000, immutable` |
| Ambos, quando o site está em outra origem | `Access-Control-Allow-Origin: *` e `Cross-Origin-Resource-Policy: cross-origin` |

<!-- s:21eb7dc287 -->
Navegadores buscam scripts de módulo e WebAssembly com CORS, então arquivos em outra origem precisam de `Access-Control-Allow-Origin`. Sirva `yoga-[hash].wasm` como `application/wasm`, comprimido (veja [WebAssembly](/docs/deploying#webassembly)).

<!-- s:1bb976fcdc -->
Deploys

<!-- s:01b888e293 -->
`embed.js` é revalidado a cada carregamento da página, então novos visitantes recebem um novo deploy imediatamente. Uma aba que carregou o `embed.js` anterior ainda importa os arquivos da build anterior quando o visitante abre o console, possivelmente horas depois. Mantenha os arquivos de `assets/` do deploy anterior online: copie os novos arquivos sobre os antigos em vez de sincronizar com exclusão e remova os arquivos antigos após um ou dois dias. Para fixar uma build, coloque seu `assets/embed-[hash].js` na tag. Os arquivos dessa build também devem permanecer online.

<!-- s:b748b07652 -->
Quando os arquivos não estão mais disponíveis, `embed.js` registra um aviso que pede ao visitante para recarregar a página, sem iniciar o app nem recarregar a página por conta própria.

<!-- s:fce19037b3 -->
Política de segurança de conteúdo

<!-- s:de8e30a920 -->
`embed.js` não precisa de scripts nem estilos inline. Adicione estes valores à política da página hospedeira, com `'self'` no lugar da origem quando `dist/` estiver na mesma origem:

<!-- s:2da4077ce0 -->
| Diretiva | Valor | Para |
| :-- | :-- | :-- |
| `script-src` | `https://console.example.com` | `embed.js` e seus chunks |
| `script-src` | `'wasm-unsafe-eval'` | Yoga, em apps renderizados no cliente |
| `connect-src` | `https://console.example.com` | `yoga-[hash].wasm` e `/__textjs/live` para rotas renderizadas no servidor |
| `img-src` | `data:` | Apenas um `<text-console mirror>` cujo app desenha `<Image>` ou `<Pixels>` |

<!-- s:4ce5dcc4cb -->
Carregar o app por conta própria

<!-- s:03e56a60b4 -->
`@textjs/app/experimental` exporta as partes que compõem `embed.js`, para páginas que carregam um app à sua própria maneira:

<!-- s:238cbf53ee -->
| Exportação | Descrição |
| :-- | :-- |
| `startEmbed(paint, boot, src, element?)` | O que `embed.js` executa: registrar o primeiro quadro, aguardar a intenção de abrir o console e então chamar `boot` |
| `bootEmbedClient(options)` | Iniciar um app renderizado no cliente com roteamento em memória e entrada de teclado condicionada à interação com a página |
| `bootEmbedPlayer(options)` | Iniciar o reprodutor de quadros para uma rota renderizada no servidor |
| `createHostInput(options)` | Entrada de teclado que segue as regras acima |
| `createTextConsoleMount(config)` | Retorna uma função `mount(element, shell?)` para `<text-console>` |
| `reserveCss(cols, rows)` | O CSS que reserva o espaço de `<text-console>` |

<!-- s:f15b990353 -->
`ENGAGE_SELECTOR` e `BYPASS_SELECTOR` são os seletores dos elementos que iniciam o app e dos elementos que mantêm suas próprias teclas.
