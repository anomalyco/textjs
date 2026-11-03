<!-- s:674f346b70 -->
Hooks conectam componentes à entrada, ao foco e à área de visualização.

<!-- s:6296c02ab3 -->
`useInput`

<!-- s:b326ab5213 -->
| Campo | Descrição |
| :-- | :-- |
| `key` | `"up"` `"return"` `"escape"` `"tab"`… |
| `input` | Texto produzido pela tecla |
| `ctrl` `meta` `shift` `alt` | Modificadores |
| `stopPropagation()` | Interromper os manipuladores de menor prioridade |

<!-- s:0764796164 -->
Atalhos do navegador como `⌘⌥J` e `⌘R` sempre passam sem interceptação.

<!-- s:550c6a7dd5 -->
`usePaste` e `useWheel` aceitam as mesmas opções. `ambient` não tem efeito sobre `useWheel`.

<!-- s:9248f9b147 -->
| Opção | Descrição |
| :-- | :-- |
| `isActive` | `false` desativa o manipulador sem desmontar o componente (padrão `true`) |
| `priority` | Prioridades maiores executam primeiro (padrão `0`). Componentes com foco usam `FOCUSED_INPUT_PRIORITY` (`10`) |
| `global` | Continuar recebendo entrada enquanto um `<Modal>` fora deste componente estiver aberto (padrão `false`) |
| `ambient` | Não contar este manipulador para a [dica de foco](#usepagefocus) (padrão `false`) |

<!-- s:e4e842287a -->
O atalho do Dev Overlay (`F2` ou `` Ctrl+` ``) é ambiente, então uma página sem outra entrada de teclado não mostra a dica.

<!-- s:617ae1bfe8 -->
`usePaste` e `useWheel`

<!-- s:61e72f6177 -->
`useKeyState` (experimental)

<!-- s:a63d1753a1 -->
`@textjs/react/experimental` exporta `useKeyState` para rastrear teclas físicas mantidas pressionadas por `KeyboardEvent.code` (`"KeyW"`, `"ArrowUp"`, `"ControlLeft"`). Consultar `keys.isDown(code)` periodicamente ou ler `keys.pressed` não dispara novas renderizações do React. Passe um callback para reagir ao pressionar e soltar teclas no momento em que isso acontece.

<!-- s:d9e1465ae0 -->
Teclas mantidas pressionadas são liberadas automaticamente quando a página perde o foco. Consulte [Mudanças incompatíveis](/docs/support-policy#breaking-changes) para saber como as exportações experimentais são versionadas.

<!-- s:c34856de19 -->
`useViewport`

<!-- s:1bb49ffa96 -->
`usePageFocus`

<!-- s:8dae4284ef -->
`usePageFocus()` retorna se a página está com foco. As teclas pressionadas só chegam ao app enquanto ela está com foco. É o mesmo valor de `useViewport().focused`, mas só provoca uma nova renderização quando o foco muda.

<!-- s:e1075d4220 -->
Enquanto a página estiver sem foco e o app tiver um manipulador `useInput` ou `usePaste`, um hook `useKeyState` ou um alvo de foco acessível por Tab, a última linha do quadro do console se torna uma barra âmbar com o texto “Clique na página para usar o teclado”. Manipuladores marcados como [`ambient`](#useinput) não contam. A dica não aparece em terminais, em testes nem em espelhos inline. Sempre que a dica aparece, ela pisca por cerca de 6 segundos, a menos que a configuração de movimento reduzido do sistema esteja ativada. Para decidir quando ela aparece, defina `focusHint: false` em `text.config.ts` ou `createConsoleRoot` e renderize `<FocusHint>`:

<!-- s:a537976ab1 -->
`useConsoleStats`

<!-- s:99bae1bb0c -->
`useApp`

<!-- s:e3bd46f1e5 -->
O REPL de `window.text`

<!-- s:420cc7f125 -->
Todo app adiciona funções auxiliares a `window.text`. Digite-as no prompt do DevTools.
