<!-- s:8f3fd7167d -->
A extensão Text.js para VS Code mostra o quadro do console ao lado do código. Ela espelha o app em execução com `text dev` ou renderiza o próprio arquivo aberto quando nada está em execução. Também adiciona geração de estrutura do App Router, snippets e links para códigos de erro `TX###`.

<!-- s:98304b8243 -->
Instalação

<!-- s:80e247d2f7 -->
Instale [Text.js](https://marketplace.visualstudio.com/items?itemName=textjs.vscode-textjs) pelo Visual Studio Marketplace. No VS Code, abra a exibição Extensões (`⌘⇧X`) e procure por `textjs.vscode-textjs`, ou execute:

<!-- s:fd2344ec36 -->
Ela é ativada em qualquer pasta que contenha um app Text.js: um `text.config.ts`, ou um pacote que dependa de `@textjs/app` e tenha um diretório `app/`. Monorepos com vários apps também funcionam.

<!-- s:74f1530aa8 -->
Prévia ao vivo

<!-- s:d9807ea49d -->
Abra um `page.tsx`, `layout.tsx` ou componente e execute **Text.js: Open Preview** (`⌘K V`), ou clique no botão de prévia na barra de título do editor. O painel desenha o quadro com a mesma interface do DevTools e as mesmas células em Menlo do console do navegador.

<!-- s:2f69f76b80 -->
A prévia recebe seus quadros de uma de duas fontes. O indicador na barra de ferramentas mostra qual está ativa:

<!-- s:f81cef21bf -->
| Fonte | Quando | O que você vê |
| :-- | :-- | :-- |
| **Live** | `text dev` está em execução e uma aba do navegador está com o app aberto | O app real, com seu estado, dados e tamanho da grade |
| **Headless** | Sem servidor de desenvolvimento ou sem aba aberta | O arquivo aberto, renderizado pela extensão no tamanho do painel |

<!-- s:f40888c2bb -->
`auto` (o padrão) usa Live quando possível e Headless nos demais casos. Fixe uma das opções pelo indicador ou com `textjs.preview.mode`.

<!-- s:fd587df6f1 -->
Teclado

<!-- s:9ce66a1aa7 -->
Clique no console para enviar teclas ao app: setas, `Tab`, atalhos, digitação e colagem funcionam como no navegador. Clique fora do console para parar. Atalhos do editor como `⌘P` e `⌘⇧P` continuam indo para o VS Code. Rolar sobre o console envia eventos da roda do mouse.

<!-- s:0910b5fd48 -->
No campo de endereço, você pode digitar uma rota, como `/deployments/dpl_a1`, para navegar em qualquer uma das fontes.

<!-- s:4507d73bb4 -->
Modo Live

<!-- s:787b87d328 -->
Enquanto uma prévia está aberta, o servidor de desenvolvimento pede às abas conectadas que transmitam seus quadros. As abas enviam apenas as linhas que mudaram e param de enviar quando a prévia fecha, então um app sem prévia aberta não tem custo adicional. Salvar um arquivo passa pelo Fast Refresh, e a prévia é atualizada junto com a aba.

<!-- s:86ae14b746 -->
Ative **Follow** (`textjs.preview.followEditor`) para levar a aba do navegador à rota do `page.tsx` que você está editando.

<!-- s:68839106d6 -->
Abas em segundo plano não recebem quadros de animação, então normalmente mantêm seus quadros até ficarem visíveis novamente. Enquanto uma prévia acompanha a aba, uma aba em segundo plano desenha um quadro assim que recebe uma entrada, então digitar na prévia continua gerando atualizações. Animações em uma aba em segundo plano são atualizadas cerca de uma vez por segundo. Coloque o app em uma janela própria para mantê-las fluidas.

<!-- s:1ae6e7077f -->
Modo Headless

<!-- s:1cddf967be -->
A extensão inicia um pequeno executor no seu projeto. Ele carrega arquivos de rota pelo Vite e pelo `@textjs/app` do próprio projeto, então aliases, TypeScript e JSX se comportam como em `text dev`. Ele monta o App Router na rota do arquivo aberto, com seus layouts, usando um histórico em memória:

<!-- s:23d9451fef -->
| Arquivo | Prévia |
| :-- | :-- |
| `app/page.tsx` | `/` |
| `app/(shop)/items/[id]/page.tsx` | `/items/id` (segmentos dinâmicos usam seu nome) |
| `app/blog/[[...slug]]/layout.tsx` | `/blog` |
| `components/Card.tsx` | A exportação padrão, ou a primeira exportação em PascalCase, sem props |

<!-- s:f111cbfc61 -->
Chamadas `fetch("/api/...")` de mesma origem executam seus manipuladores `route.ts` no mesmo processo, como em [`text run`](/docs/terminal). A grade acompanha o tamanho do painel, e salvar qualquer arquivo do app o renderiza novamente. Os erros aparecem acima do quadro, com links para suas páginas `TX###`.

<!-- s:36cd3f2bb4 -->
Comandos

<!-- s:d542a683ff -->
| Comando | Descrição |
| :-- | :-- |
| Text.js: Start Dev Server | Executa seu script `dev` (ou `text dev`) em um terminal |
| Text.js: Stop Dev Server | Para um servidor de desenvolvimento iniciado pelo VS Code |
| Text.js: Open Preview | Abre a prévia ao vivo do arquivo ativo |
| Text.js: Open in Browser Console | Abre a rota atual no servidor de desenvolvimento. Depois, [abra o console do navegador](/docs/installation#open-the-console) |
| Text.js: New Page | `app/<route>/page.tsx` com metadados e `params` tipados |
| Text.js: New Layout | `app/<route>/layout.tsx` |
| Text.js: New Route Handler | `app/<route>/route.ts` com `GET` e `POST` |
| Text.js: New Loading UI / Error Boundary / Not Found Page | `loading.tsx`, `error.tsx`, `not-found.tsx` |

<!-- s:87b5f49afb -->
Os comandos de geração de estrutura também estão no menu de contexto de pastas do Explorador. Eles aceitam segmentos do [App Router](/docs/routing) como `settings`, `blog/[slug]`, `docs/[...path]` e `(marketing)/about`, e não permitem colocar um `page` e um `route.ts` no mesmo segmento. Projetos JavaScript (sem `tsconfig.json`) recebem arquivos `.jsx` e `.js`.

<!-- s:9ba0c1b237 -->
Snippets

<!-- s:193db2a68e -->
| Prefixo | Insere |
| :-- | :-- |
| `txpage`, `txlayout`, `txloading`, `txerror` | Arquivos de rota, nomeados conforme a pasta |
| `txc` | Um componente de console nomeado conforme o arquivo |
| `txroute`, `txroutep` | Manipuladores de rota, com ou sem parâmetros |
| `box`, `boxb`, `text`, `scrollbox`, `link`, `spinner` | Componentes |
| `input`, `select`, `tabs` | Componentes interativos |
| `useInput`, `useKeymap`, `useFocus`, `useTheme`, `useViewport`, `useRouter`, `useInterval` | Hooks |
| `metadata`, `txconfig` | Metadados da rota e `text.config.ts` |

<!-- s:a6e574a6aa -->
Códigos de erro

<!-- s:5e9e2a4649 -->
Passe o cursor sobre um código `TX###` em qualquer lugar: no código-fonte, nos logs, no painel Saída ou em um rastreamento de pilha colado. A dica mostra o título, a mensagem e o pacote, com um link para a página do código em textjs.org. Cada código também é um link (clique com `⌘`).

<!-- s:b67d013d7e -->
Barra de status

<!-- s:be63ef7ae2 -->
O item `▼` mostra o estado do servidor de desenvolvimento e o tamanho da grade do console, por exemplo `▼ :3000  120×36`. As abas informam seu tamanho ao servidor de desenvolvimento sempre que ele muda, mesmo sem prévia aberta. Clique no item para acessar os comandos principais.

<!-- s:5b827aed4d -->
Configurações

<!-- s:457ec968c0 -->
| Configuração | Padrão | Descrição |
| :-- | :-- | :-- |
| `textjs.preview.mode` | `auto` | `auto`, `live` ou `headless` |
| `textjs.preview.followEditor` | `false` | Modo Live: acompanhar a rota editada |
| `textjs.preview.fontSize` | `12` | Tamanho da fonte da célula (o DevTools usa 12) |
| `textjs.preview.runtime` | | Binário do Node.js para prévias headless (padrão: o incluído no VS Code) |
| `textjs.devServer.url` | | URL do servidor de desenvolvimento (padrão: descoberta nas portas 3000–3010). Apenas endereços de loopback `http://` são usados |
| `textjs.devServer.command` | | Comando para Start Dev Server |

<!-- s:ea5e740ef1 -->
Confiança do espaço de trabalho

<!-- s:ddcdd0b053 -->
A prévia e o servidor de desenvolvimento executam o código do seu projeto (a configuração do Vite, `text.config.*` e componentes). No Modo Restrito, a extensão oferece apenas snippets, geração de estrutura e links de erros, e ignora `textjs.preview.runtime`, `textjs.devServer.command` e `textjs.devServer.url` das configurações do espaço de trabalho. Confie no espaço de trabalho para ativar a prévia. Arquivos fora das pastas do seu espaço de trabalho nunca são exibidos na prévia.

<!-- s:5ae438610c -->
Funcionamento

<!-- s:857bac4692 -->
`text dev` disponibiliza três endpoints para editores. Eles respondem apenas a conexões de loopback direcionadas a um host de loopback (`localhost`, `127.0.0.1`, `[::1]`), e apenas a requisições sem `Origin` ou com a própria origem do servidor de desenvolvimento. Requisições entre sites e `no-cors` dos navegadores são rejeitadas:

<!-- s:2345c81baf -->
| Endpoint | |
| :-- | :-- |
| `GET /__textjs/status` | Raiz do projeto, abas conectadas, tamanho da grade e rota atual |
| `GET /__textjs/frames` | Eventos enviados pelo servidor: um evento `frame` por alteração, codificado como deltas de linhas |
| `POST /__textjs/input` | Uma tecla, colagem, texto de IME ou de tecla morta (`text`), roda do mouse ou navegação para a aba. Exige JSON e o cabeçalho `x-textjs-mirror: 1`, para que outros sites não possam enviar pressionamentos de teclas |

<!-- s:6693972af6 -->
As abas enviam quadros ao servidor de desenvolvimento pelo socket HMR do Vite, que exige um token por servidor. O formato de transmissão é exportado de `@textjs/app/frame-protocol` (`FrameEncoder`, `FrameDecoder`, `parseInputMessage`) caso você queira criar seu próprio visualizador. Nada disso existe na saída de `text build`.
