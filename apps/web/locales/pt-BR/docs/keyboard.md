<!-- s:3bfcfe41ce -->
Declare os atalhos uma vez com `useKeymap`. Text.js os encaminha, lista em uma sobreposição de `?`, mostra no rodapé e permite buscá-los em uma paleta de comandos.

<!-- s:b084dfc727 -->
`useKeymap`

<!-- s:f944f97e4b -->
| Sintaxe | Significado |
| :-- | :-- |
| `ctrl+k` | Modificadores: `ctrl` `alt` `shift` `meta` `mod` |
| `mod+k` | `⌘` ou `Ctrl`, o que estiver pressionado |
| `j, down` | Alternativas |
| `g g` | Uma sequência (1 segundo entre as teclas) |
| `G` | Maiúscula implica `Shift` |
| `?` | Teclas imprimíveis correspondem ao caractere |

<!-- s:ef55b4b9de -->
Os valores são uma função de tratamento ou uma associação com `label`, `group`, `hint`, `disabled` e `noRepeat`. Associações sem rótulo funcionam, mas ficam fora da sobreposição de ajuda.

<!-- s:01f344cdbe -->
`useKeymapBindings()` retorna as associações com rótulo ativas no momento, para você usar nos seus próprios rodapés e menus.

<!-- s:dd8af5eb69 -->
Os mapas de teclas passam por `useInput`, então as regras habituais se aplicam: campos com foco têm prioridade, uma tecla correspondente interrompe a propagação e um `<Modal>` aberto desativa as associações fora dele. Passe `{ priority, global, isActive }` para mudar esse comportamento.

<!-- s:da19075700 -->
`<KeyHelp>`

<!-- s:907e2eedda -->
Pressione `?` para ver todas as associações com rótulo, agrupadas. A lista mostra o que está ativo no local em que foi aberta.

<!-- s:3cebb95bfc -->
`<KeyHints>` e `<StatusBar>`

<!-- s:04fa34bd49 -->
`<KeyHints />` mostra as associações marcadas com `hint: true` ou os `items` explícitos. `<StatusBar>` é um rodapé de uma linha com um slot `right`.

<!-- s:b9ded39a0a -->
`<Kbd>mod+k</Kbd>` renderiza uma única tecla. `formatKeys("ctrl+shift+p")` retorna `⌃⇧P` no macOS e `ctrl+shift+P` nos demais sistemas.

<!-- s:8b6afd6178 -->
`<CommandPalette>`

<!-- s:65192cd436 -->
`Ctrl+K` (ou `Ctrl+P`) abre um seletor com busca aproximada entre seus comandos e todas as associações com rótulo, com as letras correspondentes destacadas.

<!-- s:e88bab4eab -->
| Prop | Descrição |
| :-- | :-- |
| `commands` | `{ id, label, group?, keys?, keywords?, run }[]` |
| `keys` | Atalho para abrir (padrão `ctrl+k, ctrl+p`; `null` para desativar) |
| `includeKeymap` | Listar associações do mapa de teclas (padrão `true`) |
| `open` / `onOpenChange` | Controlado |

<!-- s:ddd093fe85 -->
A paleta fecha antes de executar um comando, então os comandos podem abrir seus próprios modais. `fuzzyMatch` e `fuzzyFilter` são exportados para você usar nas suas próprias listas.
