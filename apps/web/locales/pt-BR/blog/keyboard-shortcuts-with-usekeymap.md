<!-- s:cf6b8fc694 -->
Até agora, um app Text.js tratava teclas em `useInput` e as listava uma segunda vez, manualmente, em um rodapé `<KeyHint>`. `useKeymap` substitui ambos por uma única declaração.

<!-- s:8ec88859eb -->
Pressionar `j` executa `next`. No macOS, `<KeyHints>` mostra `j/↓ Next` e `⌃S Save` no rodapé, porque essas associações definem `hint`. `?` abre uma tela de ajuda com as quatro associações, agrupadas em Navigation, e `Ctrl+K` abre uma paleta que permite buscá-las.

<!-- s:c7c1123a0d -->
Sintaxe das teclas

<!-- s:e9843726ad -->
| Sintaxe | Significado |
| :-- | :-- |
| `ctrl+k` | Modificadores: `ctrl`, `alt`, `shift`, `meta` e `mod` |
| `mod+k` | `⌘` ou `Ctrl`, conforme a tecla mantida pressionada |
| `j, down` | Alternativas |
| `g g` | Uma sequência, com até 1 segundo entre as teclas |
| `G` | Maiúscula implica `Shift` |
| `?` | Teclas imprimíveis correspondem ao caractere |

<!-- s:5d4b81956d -->
Uma associação é um handler ou um objeto com `label`, `group`, `hint`, `command`, `disabled` e `noRepeat`. `command: false` mantém uma associação com rótulo fora da paleta. Associações sem rótulo funcionam, mas ficam fora da tela de ajuda e da paleta.

<!-- s:7beff5bd29 -->
Roteamento

<!-- s:5f000bf949 -->
Cada mapa de teclas registra um handler `useInput`, então as regras de entrada existentes se aplicam. Um `<Input>` com foco trata as teclas primeiro, porque os editores escutam na prioridade 10 e os mapas de teclas na 0. Uma tecla correspondente interrompe a propagação. Um `<Modal>` aberto desativa as associações fora dele, a menos que o mapa de teclas passe `global: true`.

<!-- s:a6076c8127 -->
As sequências são identificadas dentro desse handler. Uma tecla que inicia uma sequência fica pendente e interrompe a propagação, e a sequência é reiniciada quando a próxima tecla chega após mais de `sequenceTimeout` (1.000 ms por padrão):

<!-- s:aa0a9c8615 -->
Um registro por raiz

<!-- s:8a689d7ce6 -->
As associações com rótulo são publicadas em um registro que pertence à raiz do console. `<KeyHelp>`, `<KeyHints>` e `<CommandPalette>` leem esse registro, e seus próprios componentes também podem lê-lo por meio de `useKeymapBindings()`. Enquanto um modal está aberto, o registro retorna apenas as associações dentro dele, então a tela de ajuda lista as teclas que funcionam naquele momento.

<!-- s:ab5f364d60 -->
Os mapas de teclas costumam ser escritos inline, o que cria um novo objeto a cada renderização. Para manter esse custo baixo, um mapa de teclas republica seus rótulos apenas quando sua forma visível muda:

<!-- s:fa6b5ba7b8 -->
Os handlers são lidos de uma ref quando uma tecla chega, então uma nova closure a cada renderização nunca fica desatualizada.

<!-- s:1b173acf33 -->
A tela de ajuda e a paleta

<!-- s:15201cd425 -->
`<KeyHelp>` abre com `?` e lista por grupo todas as associações ativas com rótulo. `keys` e `title` alteram o acionador e o título.

<!-- s:8a5c3a3297 -->
`<CommandPalette>` abre com `Ctrl+K` ou `Ctrl+P`. Ela faz uma busca aproximada em seus `commands` e em todas as associações com rótulo, e destaca as letras correspondentes. Ela fecha antes de executar um comando, então um comando pode abrir seu próprio modal.

<!-- s:bea7ebdffb -->
`formatKeys` renderiza uma associação para exibição. `formatKeys("ctrl+shift+p")` retorna `⌃⇧P` no macOS e `ctrl+shift+P` nos demais sistemas, e `<Kbd>` renderiza uma única tecla com a mesma formatação.

<!-- s:d068dd2764 -->
`useKeymap`, `<KeyHelp>`, `<KeyHints>`, `<StatusBar>` e `<CommandPalette>` estão incluídos no Text.js 1.0. A referência está em [Teclado](/docs/keyboard).
