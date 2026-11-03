<!-- s:e9f791b208 -->
`text run` renderiza um app com App Router em um terminal. Layout, componentes, mapas de teclas e manipuladores de rota são compartilhados com o navegador. A saída usa ANSI truecolor em vez de spans `%c`.

<!-- s:7d8aa376e3 -->
Pressione `Ctrl+C` para sair. `text run` requer Bun.

<!-- s:eed3d00ac7 -->
`text run`

<!-- s:36358c3ead -->
`text run` importa todos os arquivos de `app/`, monta o App Router com um histórico em memória e o desenha em tela cheia. `<Link>`, `useRouter()`, `notFound()` e `redirect()` funcionam sem alterações.

<!-- s:75b65c161d -->
Chamadas `fetch("/api/...")` de mesma origem executam seus manipuladores `route.ts` no próprio processo, exatamente como `text dev` os serviria. Outras URLs usam a rede.

<!-- s:13fda297e2 -->
`renderToTerminal`

<!-- s:1bcde87690 -->
Para um único componente ou sua própria CLI:

<!-- s:e62e62bfaa -->
`useApp().exit()` desmonta o app e restaura o terminal.

<!-- s:082b75dda7 -->
| Opção | Descrição |
| :-- | :-- |
| `stdin` / `stdout` | Padrão: `process.stdin` / `process.stdout` |
| `cols` / `rows` | Tamanho fixo (padrão: acompanhar o terminal) |
| `altScreen` | Restauração do histórico de rolagem ao sair (padrão: `true`) |
| `mouse` | Rolagem com a roda do mouse (padrão: `true`) |
| `exitOnCtrlC` | Padrão: `true` |
| `fps` | Limite de quadros (padrão: `60`) |
| `patchConsole` | Retenção de `console.*` até sair (padrão: `true`) |
| `theme` / `transparent` | Como em `createConsoleRoot` |

<!-- s:e34e364b9c -->
Saída

<!-- s:2ac174afda -->
Cada quadro é comparado linha por linha. Apenas as linhas alteradas são escritas, envolvidas em marcadores de saída sincronizada para que os terminais compatíveis nunca mostrem um quadro parcialmente desenhado. Apps ociosos não escrevem nada.

<!-- s:99a3c4d459 -->
Entrada

<!-- s:4a9817d820 -->
A entrada stdin em modo bruto é interpretada como os mesmos eventos que o navegador produz: setas e teclas de função com modificadores, combinações com `Alt`, colagem delimitada, roda do mouse SGR e o protocolo de teclado kitty. `TerminalInputParser` e `parseTerminalInput` são exportados caso você precise deles em outro lugar.

<!-- s:6b688e229b -->
Diferenças

<!-- s:56ed51fed3 -->
| Recurso | DevTools | Terminal |
| :-- | :-- | :-- |
| Cadência de quadros | ~15 fps | Até `fps` |
| Tamanho da grade | Console acoplado | Janela do terminal |
| `<Image src>` | Carregamento via canvas | Uso de `pixels` |
| `console.log` | Seus quadros | Retenção até sair |
