<!-- s:c351b288ae -->
`text mcp` executa seu diretório `app/` sem interface gráfica, no mesmo processo, e o disponibiliza pelo [Model Context Protocol](https://modelcontextprotocol.io) para que agentes de programação possam usá-lo sem DevTools. O agente navega, pressiona teclas, lê quadros como texto simples e chama manipuladores de rota.

<!-- s:c66b3eaae7 -->
`text mcp` precisa do Bun. Quando iniciado com Node, ele se executa novamente com Bun se `bun` estiver no seu `PATH`, e falha com `TX019` caso contrário. Os clientes MCP o iniciam para você, então raramente é necessário executá-lo manualmente.

<!-- s:0ecddf15e1 -->
Configuração

<!-- s:91bda9ef42 -->
Cada cliente inicia `text mcp` a partir do diretório do seu projeto. Use `bunx --bun` para que os arquivos de rota sejam executados como TypeScript.

<!-- s:b50f70c6a3 -->
OpenCode

<!-- s:b1662c02a3 -->
Claude Code

<!-- s:af84272153 -->
Ou inclua a configuração em um commit para o time:

<!-- s:e9ea871e1a -->
Cursor

<!-- s:6be69e8aed -->
VS Code

<!-- s:25a196cf61 -->
Para um projeto em um subdiretório, anexe o caminho: `["--bun", "text", "mcp", "apps/console"]`.

<!-- s:0b27734b46 -->
Ferramentas

<!-- s:93ae76f73d -->
| Ferramenta | Descrição |
| :-- | :-- |
| `list_routes` | Páginas e manipuladores de rota em `app/`, e a localização atual |
| `navigate` | Adicionar ou substituir um caminho, ou ir para `back` / `forward` |
| `read_frame` | O quadro como texto, com rota, tamanho, foco e cursor. `styles: true` adiciona cores e atributos por span |
| `press` | Combinações de teclas: `"down"`, `"ctrl+k"`, `"shift+tab"`, `"tab tab enter"`, `"down*3"` |
| `type` | Digitar texto com uma tecla por caractere (até 2.000; use `paste` para mais). `submit: true` pressiona Enter depois |
| `paste` | Um evento de colagem, como `⌘V` |
| `scroll` | Rolagem com a roda do mouse por `rows` (e `cols`). Um `<ScrollBox>` rola com a roda sem foco do teclado |
| `resize` | Definir o tamanho da grade em colunas e linhas |
| `inspect_tree` | A árvore de componentes com limites na tela, além de cada id que pode receber foco |
| `find` | Limites de cada correspondência e o componente sob ela |
| `wait_for` | Esperar um texto aparecer ou desaparecer, ou o app ficar ocioso |
| `logs` | Saída capturada de `console.*` e erros do React |
| `fetch` | Chamar um manipulador `route.ts` no mesmo processo. Os corpos são lidos até `maxBytes`; os fluxos de eventos, por `streamMs`, e depois cancelados |
| `reload` | Importar o app novamente após você editar arquivos |

<!-- s:526235e5c5 -->
As ferramentas de entrada retornam o novo quadro, então o agente não precisa de um `read_frame` separado após cada tecla. O quadro atual e a lista de rotas também estão disponíveis como os recursos `text://frame` e `text://routes`.

<!-- s:c30236f97d -->
Uma interação típica:

<!-- s:45e18bfa25 -->
Quadros e ociosidade

<!-- s:f2e8fe0f06 -->
Antes de ler um quadro, qualquer ferramenta espera o app ficar ocioso: nenhum quadro agendado, nenhum `fetch` em andamento e nenhum commit ou quadro por 50 ms. Assim, o agente vê o resultado da sua entrada, não um quadro no meio de uma atualização.

<!-- s:fbad6f5c1a -->
Um `<Spinner>` ou um gráfico que se atualiza uma vez por segundo ainda conta como ocioso entre as atualizações, então páginas com animações continuam legíveis. Um app que renderiza com intervalos menores que 50 ms nunca fica ocioso. As leituras desistem após 1,5 segundos (`settleMs` altera isso), enviam o quadro mais recente e o marcam como `busy`. `wait_for` sem texto espera a ociosidade, com seu próprio `quietMs`, e retorna um erro se ela nunca ocorrer.

<!-- s:c5250c2f7a -->
As coordenadas são células com índice a partir de zero: `x` é a coluna, `y` é a linha. Caracteres largos, como CJK e emojis, ocupam duas colunas.

<!-- s:7ff82431c5 -->
Erros e logs

<!-- s:6e07cf8702 -->
stdout transporta o protocolo. A saída de `console.*` do seu app, chamadas avulsas de `process.stdout.write` e erros do React vão para `logs`, numerados para que um agente possa pedir apenas novas entradas com `since`. Quando erros foram registrados desde a última leitura, o cabeçalho do próximo quadro informa isso.

<!-- s:9102068439 -->
As falhas retornam como erros de ferramenta, nunca como uma interrupção do processo. Uma ferramenta que excede o tempo limite é cancelada antes da execução da próxima chamada, então uma chamada lenta nunca digita no quadro da chamada seguinte. Erros com um código do Text.js o mantêm, por exemplo, `TX007` para uma tecla desconhecida. Se o app falhar ao carregar, cada ferramenta explica o motivo. Corrija o arquivo e chame `reload`.

<!-- s:d3ad6f781e -->
Opções

<!-- s:c9c30c0da4 -->
| Opção | Descrição |
| :-- | :-- |
| `--path <pathname>` | Primeira rota (padrão `/`) |
| `--cols` / `--rows` | Tamanho da grade (padrão: `viewport` em `text.config.ts`, caso contrário 100×32) |
| `--theme <name>` | Predefinição de tema |
| `--no-config` | Ignorar `text.config.ts` |
| `--verbose` | Escrever também os logs capturados em stderr |

<!-- s:5ae438610c -->
Como funciona

<!-- s:7c71219a13 -->
`text mcp` executa seu app da mesma forma que [`text run`](/docs/terminal): cada módulo de rota é importado de antemão, o App Router usa histórico em memória e chamadas `fetch("/api/…")` de mesma origem executam seus manipuladores no mesmo processo. Os quadros vão para uma grade de células fora da tela em vez de um terminal. Páginas renderizadas no servidor (`export const runtime = "server"`) e seus componentes `async function` renderizam no mesmo processo, como em `text dev`, e o quadro é lido assim que eles concluem.

<!-- s:c965dcc0e4 -->
`reload` desmonta o app, remove todos os módulos do projeto do cache de módulos do Bun (incluindo arquivos fora de `app/`), examina `app/` novamente e remonta na localização atual.

<!-- s:19d6f0da69 -->
Para incorporar o servidor ao seu próprio processo ou usar outro transporte:

<!-- s:68c8d3995f -->
Limites

<!-- s:910af21777 -->
- O app roda no Bun, não em um navegador. `window` e `document` são indefinidos, como em `text run`.
- Cada servidor executa um app com uma grade. Cada cliente MCP inicia seu próprio servidor.
- `text mcp` executa sua própria cópia do app sem interface gráfica. Ele não pode se conectar a uma aba do navegador aberta com `text dev`.
